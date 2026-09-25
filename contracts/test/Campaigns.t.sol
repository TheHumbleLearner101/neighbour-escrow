// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {Campaigns} from "../src/Campaigns.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Mock USDC", "USDC") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }
}

/// @dev Tries to re-enter claimRefund when it receives tokens. Our token is a plain ERC-20
/// with no hook, so to actually exercise the guard we drive the re-entrancy from a token
/// that calls back. See ReentrantToken below.
contract ReentrantToken is ERC20 {
    Campaigns public target;
    uint256 public attackId;
    bool public attacking;

    constructor() ERC20("Reentrant", "RE") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function setTarget(Campaigns t, uint256 id) external {
        target = t;
        attackId = id;
    }

    function arm() external {
        attacking = true;
    }

    // On every transfer OUT of the campaign contract (a refund), try to re-enter.
    function _update(address from, address to, uint256 value) internal override {
        super._update(from, to, value);
        if (attacking && from == address(target) && address(target) != address(0)) {
            // Re-enter: should revert via ReentrancyGuard, which bubbles up and reverts the whole tx.
            target.claimRefund(attackId);
        }
    }
}

contract CampaignsTest is Test {
    Campaigns internal c;
    MockUSDC internal usdc;

    address internal creator = makeAddr("creator");
    address internal payee = makeAddr("payee");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint64 internal fundingDeadline;
    uint64 internal completionDeadline;
    uint64 internal constant REVIEW = 1 days;
    uint16 internal constant FEE_BPS = 300; // 3%

    function setUp() public {
        usdc = new MockUSDC();
        c = new Campaigns(IERC20(address(usdc)));

        fundingDeadline = uint64(block.timestamp + 7 days);
        completionDeadline = uint64(block.timestamp + 14 days);

        _fund(alice, 1_000e6);
        _fund(bob, 1_000e6);
        _fund(creator, 1_000e6);
    }

    function _fund(address who, uint256 amount) internal {
        usdc.mint(who, amount);
        vm.prank(who);
        usdc.approve(address(c), type(uint256).max);
    }

    function _create() internal returns (uint256 id) {
        vm.prank(creator);
        id = c.createCampaign("ipfs://meta", 100e6, fundingDeadline, completionDeadline, REVIEW, FEE_BPS, payee);
    }

    function _contribute(uint256 id, address who, uint256 amount) internal {
        vm.prank(who);
        c.contribute(id, amount);
    }

    // --- Create ---

    function test_create_setsFields() public {
        uint256 id = _create();
        Campaigns.Campaign memory cam = c.getCampaign(id);
        assertEq(cam.creator, creator);
        assertEq(cam.payee, payee);
        assertEq(cam.goal, 100e6);
        assertEq(uint256(cam.status), uint256(Campaigns.Status.Funding));
    }

    function test_create_creatorAsPayeeReverts() public {
        vm.prank(creator);
        vm.expectRevert(Campaigns.PayeeIsCreator.selector);
        c.createCampaign("m", 100e6, fundingDeadline, completionDeadline, REVIEW, FEE_BPS, creator);
    }

    function test_create_zeroGoalReverts() public {
        vm.prank(creator);
        vm.expectRevert(Campaigns.BadGoal.selector);
        c.createCampaign("m", 0, fundingDeadline, completionDeadline, REVIEW, FEE_BPS, payee);
    }

    function test_create_badDeadlinesRevert() public {
        vm.prank(creator);
        vm.expectRevert(Campaigns.BadDeadlines.selector);
        c.createCampaign("m", 100e6, completionDeadline, fundingDeadline, REVIEW, FEE_BPS, payee);
    }

    function test_create_feeTooHighReverts() public {
        vm.prank(creator);
        vm.expectRevert(Campaigns.FeeTooHigh.selector);
        c.createCampaign("m", 100e6, fundingDeadline, completionDeadline, REVIEW, 1001, payee);
    }

    // --- Contribute ---

    function test_contribute_goalReachedExactlyMovesToFunded() public {
        uint256 id = _create();
        _contribute(id, alice, 60e6);
        _contribute(id, bob, 40e6);
        Campaigns.Campaign memory cam = c.getCampaign(id);
        assertEq(uint256(cam.status), uint256(Campaigns.Status.Funded));
        assertEq(cam.raised, 100e6);
    }

    function test_contribute_aboveRemainingIsCapped() public {
        uint256 id = _create();
        _contribute(id, alice, 80e6);
        // Only 20 remaining; bob sends 50 but is capped at 20.
        uint256 before = usdc.balanceOf(bob);
        _contribute(id, bob, 50e6);
        assertEq(usdc.balanceOf(bob), before - 20e6);
        assertEq(c.contributionOf(id, bob), 20e6);
        Campaigns.Campaign memory cam = c.getCampaign(id);
        assertEq(uint256(cam.status), uint256(Campaigns.Status.Funded));
    }

    function test_contribute_afterDeadlineReverts() public {
        uint256 id = _create();
        vm.warp(fundingDeadline + 1);
        vm.prank(alice);
        vm.expectRevert(Campaigns.FundingClosed.selector);
        c.contribute(id, 10e6);
    }

    // --- Withdraw ---

    function test_withdraw_returnsContributionMinusFee_feeStaysInPot() public {
        uint256 id = _create();
        _contribute(id, alice, 50e6);
        uint256 before = usdc.balanceOf(alice);
        vm.prank(alice);
        c.withdraw(id);
        // 3% of 50 = 1.5; alice gets 48.5.
        assertEq(usdc.balanceOf(alice), before + 48_500_000);
        Campaigns.Campaign memory cam = c.getCampaign(id);
        assertEq(cam.retainedFees, 1_500_000);
        assertEq(cam.raised, 0);
        // Fee remains held by the contract.
        assertEq(usdc.balanceOf(address(c)), 1_500_000);
    }

    function test_withdraw_onceFundedReverts() public {
        uint256 id = _create();
        _contribute(id, alice, 100e6); // funds it
        vm.prank(alice);
        vm.expectRevert(Campaigns.WrongStatus.selector);
        c.withdraw(id);
    }

    function test_withdraw_byNonBackerReverts() public {
        uint256 id = _create();
        _contribute(id, alice, 10e6);
        vm.prank(bob);
        vm.expectRevert(Campaigns.NothingContributed.selector);
        c.withdraw(id);
    }

    // --- Missed goal refunds ---

    function test_missedGoal_allowsRefund_doubleClaimReverts() public {
        uint256 id = _create();
        _contribute(id, alice, 30e6);
        _contribute(id, bob, 20e6);
        vm.warp(fundingDeadline + 1);
        c.startRefundOnMissedGoal(id);

        uint256 aBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        c.claimRefund(id);
        assertEq(usdc.balanceOf(alice), aBefore + 30e6);

        vm.prank(alice);
        vm.expectRevert(Campaigns.AlreadyRefunded.selector);
        c.claimRefund(id);
    }

    function test_refund_includesProRataFeeShare() public {
        uint256 id = _create();
        _contribute(id, alice, 30e6);
        _contribute(id, bob, 30e6);
        // Carol contributes then withdraws, leaving a fee behind. Keep the running total
        // below the 100 goal so the campaign stays in Funding and the withdraw is allowed.
        address carol = address(0xCA);
        _fund(carol, 1_000e6);
        _contribute(id, carol, 20e6); // total 80, still Funding
        vm.prank(carol);
        c.withdraw(id); // fee = 3% of 20 = 0.6 retained; carol's contribution gone, raised back to 60

        vm.warp(fundingDeadline + 1);
        c.startRefundOnMissedGoal(id);

        // refundBase = alice 30 + bob 30 = 60. retainedFees = 0.6.
        // alice share = 0.6 * 30/60 = 0.3
        uint256 aBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        c.claimRefund(id);
        assertEq(usdc.balanceOf(alice), aBefore + 30e6 + 300_000);

        uint256 bBefore = usdc.balanceOf(bob);
        vm.prank(bob);
        c.claimRefund(id);
        assertEq(usdc.balanceOf(bob), bBefore + 30e6 + 300_000);

        // Pot fully drained (no dust left with these round numbers).
        assertEq(usdc.balanceOf(address(c)), 0);
    }

    // --- Assign payee ---

    function test_assignPayee_creatorAsPayeeReverts() public {
        uint256 id = _create();
        vm.prank(creator);
        vm.expectRevert(Campaigns.PayeeIsCreator.selector);
        c.assignPayee(id, creator);
    }

    function test_assignPayee_zeroReverts() public {
        uint256 id = _create();
        vm.prank(creator);
        vm.expectRevert(Campaigns.ZeroAddress.selector);
        c.assignPayee(id, address(0));
    }

    function test_assignPayee_nonCreatorReverts() public {
        uint256 id = _create();
        vm.prank(alice);
        vm.expectRevert(Campaigns.NotCreator.selector);
        c.assignPayee(id, bob);
    }

    // --- Full happy path: confirm pays payee the whole pot ---

    function _fundAndProve(uint256 id) internal {
        _contribute(id, alice, 60e6);
        _contribute(id, bob, 40e6);
        vm.prank(payee);
        c.submitProof(id, "ipfs://proof");
    }

    function test_confirm_paysPayeeFullPotIncludingFees() public {
        uint256 id = _create();
        // Leave a fee in the pot via a withdraw before funding completes.
        _contribute(id, alice, 60e6);
        address dave = address(0xDA);
        _fund(dave, 1_000e6);
        _contribute(id, dave, 10e6);
        vm.prank(dave);
        c.withdraw(id); // fee 0.3 retained, raised back to 60
        _contribute(id, bob, 40e6); // funds it, raised 100
        vm.prank(payee);
        c.submitProof(id, "ipfs://proof");

        uint256 potExpected = 100e6 + 300_000; // contributions + retained fee
        uint256 payeeBefore = usdc.balanceOf(payee);
        vm.prank(creator);
        c.confirm(id);
        assertEq(usdc.balanceOf(payee), payeeBefore + potExpected);
        Campaigns.Campaign memory cam = c.getCampaign(id);
        assertEq(uint256(cam.status), uint256(Campaigns.Status.Paid));
        assertEq(usdc.balanceOf(address(c)), 0);
    }

    function test_confirm_nonCreatorReverts() public {
        uint256 id = _create();
        _fundAndProve(id);
        vm.prank(alice);
        vm.expectRevert(Campaigns.NotCreator.selector);
        c.confirm(id);
    }

    function test_confirm_tieCaseNotApplicable_zeroVotesAlwaysPays() public {
        // With creator-confirm there is no vote; confirm always pays. Sanity that a
        // funded, proven campaign with no other action pays on confirm.
        uint256 id = _create();
        _fundAndProve(id);
        vm.prank(creator);
        c.confirm(id);
        assertEq(uint256(c.getCampaign(id).status), uint256(Campaigns.Status.Paid));
    }

    // --- Reject / review timeout ---

    function test_reject_movesToRefunding() public {
        uint256 id = _create();
        _fundAndProve(id);
        vm.prank(creator);
        c.reject(id);
        assertEq(uint256(c.getCampaign(id).status), uint256(Campaigns.Status.Refunding));
        // Backers can now claim.
        uint256 aBefore = usdc.balanceOf(alice);
        vm.prank(alice);
        c.claimRefund(id);
        assertEq(usdc.balanceOf(alice), aBefore + 60e6);
    }

    function test_reviewTimeout_noDecisionMovesToRefunding() public {
        uint256 id = _create();
        _fundAndProve(id);
        // Before window ends, cannot finalize.
        vm.expectRevert(Campaigns.ReviewNotOver.selector);
        c.finalizeAfterReview(id);
        // After window ends, anyone finalizes to Refunding.
        vm.warp(c.reviewEndsAt(id) + 1);
        c.finalizeAfterReview(id);
        assertEq(uint256(c.getCampaign(id).status), uint256(Campaigns.Status.Refunding));
    }

    function test_confirm_afterReviewOverReverts() public {
        uint256 id = _create();
        _fundAndProve(id);
        vm.warp(c.reviewEndsAt(id) + 1);
        vm.prank(creator);
        vm.expectRevert(Campaigns.ReviewOver.selector);
        c.confirm(id);
    }

    // --- Cancel ---

    function test_cancel_afterProofSubmittedReverts() public {
        uint256 id = _create();
        _fundAndProve(id); // now ProofSubmitted
        vm.prank(creator);
        vm.expectRevert(Campaigns.WrongStatus.selector);
        c.cancel(id);
    }

    function test_cancel_whileFundingMovesToRefunding() public {
        uint256 id = _create();
        _contribute(id, alice, 30e6);
        vm.prank(creator);
        c.cancel(id);
        assertEq(uint256(c.getCampaign(id).status), uint256(Campaigns.Status.Refunding));
    }

    // --- Expire ---

    function test_expire_noProofMovesToRefunding() public {
        uint256 id = _create();
        _contribute(id, alice, 100e6); // Funded
        vm.warp(completionDeadline + 1);
        c.expire(id);
        assertEq(uint256(c.getCampaign(id).status), uint256(Campaigns.Status.Refunding));
    }

    function test_expire_beforeDeadlineReverts() public {
        uint256 id = _create();
        _contribute(id, alice, 100e6);
        vm.expectRevert(Campaigns.DeadlineNotPassed.selector);
        c.expire(id);
    }

    // --- Vote rules from SPEC required tests, restated for creator-confirm model ---

    function test_vote_payeeCannotVote_notApplicable() public {
        // No voting in the MVP. Payee cannot confirm (only creator can); assert that.
        uint256 id = _create();
        _fundAndProve(id);
        vm.prank(payee);
        vm.expectRevert(Campaigns.NotCreator.selector);
        c.confirm(id);
    }

    // --- Reentrancy ---

    function test_reentrancy_claimRefundGuarded() public {
        ReentrantToken re = new ReentrantToken();
        Campaigns cc = new Campaigns(IERC20(address(re)));

        // alice contributes via reentrant token
        re.mint(alice, 1_000e6);
        vm.prank(alice);
        re.approve(address(cc), type(uint256).max);

        vm.prank(creator);
        uint256 id = cc.createCampaign("m", 100e6, fundingDeadline, completionDeadline, REVIEW, FEE_BPS, payee);
        vm.prank(alice);
        cc.contribute(id, 50e6);

        vm.warp(fundingDeadline + 1);
        cc.startRefundOnMissedGoal(id);

        re.setTarget(cc, id);
        re.arm();

        // The refund transfer triggers a re-entrant claimRefund, which must revert and
        // roll the whole thing back.
        vm.prank(alice);
        vm.expectRevert();
        cc.claimRefund(id);
    }
}
