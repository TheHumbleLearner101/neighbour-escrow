// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title Campaigns
/// @notice One contract holds every campaign by id. Neighbours chip in a stablecoin,
/// the money is locked once the goal is reached, and it is released to the payee only
/// when the creator confirms the job. If the goal is missed, the creator cancels, the
/// job is rejected, or nobody acts in the review window, every backer claims a refund.
/// There is no admin, no owner who can move funds, and no upgradeability.
contract Campaigns is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev The stablecoin every campaign is funded in. Set once at deployment, never
    /// hard-coded in logic, so the same contract works with USDC or any ERC-20 stablecoin.
    IERC20 public immutable token;

    /// @dev Withdrawal fee is expressed in basis points and capped so a campaign cannot
    /// set a punitive fee. 300 bps = 3%.
    uint16 public constant MAX_FEE_BPS = 1000; // 10%
    uint16 public constant BPS_DENOMINATOR = 10_000;

    enum Status {
        Funding,
        Funded,
        ProofSubmitted,
        Paid,
        Refunding
    }

    struct Campaign {
        address creator;
        address payee;
        uint256 goal;
        uint256 raised; // sum of live contributions (net of withdrawals), used to test the goal
        uint256 pot; // token balance owed to this campaign: contributions minus withdrawals plus retained fees
        uint256 retainedFees; // fees kept from withdrawals, shared pro-rata to backers on refund
        uint256 refundBase; // frozen `raised` at the moment refunding starts, denominator for fee sharing
        uint64 fundingDeadline;
        uint64 completionDeadline;
        uint64 reviewWindow; // seconds added to the proof timestamp
        uint64 proofAt; // timestamp proof was submitted, 0 until then
        uint16 feeBps;
        Status status;
        string metadataURI;
        string proofURI;
    }

    uint256 public nextId;
    mapping(uint256 => Campaign) private campaigns;
    /// @dev campaignId => backer => live contribution (net of any withdrawal).
    mapping(uint256 => mapping(address => uint256)) public contributionOf;
    /// @dev campaignId => backer => whether they have already claimed their refund.
    mapping(uint256 => mapping(address => bool)) public refundClaimed;

    event CampaignCreated(
        uint256 indexed id, address indexed creator, address indexed payee, uint256 goal, uint16 feeBps, string metadataURI
    );
    event Contributed(uint256 indexed id, address indexed backer, uint256 amount, uint256 raised);
    event Withdrawn(uint256 indexed id, address indexed backer, uint256 refundToBacker, uint256 fee);
    event PayeeAssigned(uint256 indexed id, address indexed payee);
    event ProofSubmitted(uint256 indexed id, string proofURI, uint64 reviewEndsAt);
    event Confirmed(uint256 indexed id, address indexed payee, uint256 amount);
    event Rejected(uint256 indexed id);
    event Paid(uint256 indexed id, address indexed payee, uint256 amount);
    event RefundingStarted(uint256 indexed id);
    event Refunded(uint256 indexed id, address indexed backer, uint256 amount);

    error ZeroAddress();
    error BadGoal();
    error BadDeadlines();
    error FeeTooHigh();
    error NotCreator();
    error NotPayee();
    error PayeeIsCreator();
    error PayeeNotSet();
    error WrongStatus();
    error FundingClosed();
    error NothingContributed();
    error TooMuch();
    error DeadlineNotPassed();
    error ReviewNotOver();
    error ReviewOver();
    error AlreadyRefunded();
    error NothingToRefund();

    constructor(IERC20 stablecoin) {
        if (address(stablecoin) == address(0)) revert ZeroAddress();
        token = stablecoin;
    }

    // --- Views ---

    function getCampaign(uint256 id) external view returns (Campaign memory) {
        return campaigns[id];
    }

    /// @notice The instant the review window ends. Zero until proof is submitted.
    function reviewEndsAt(uint256 id) public view returns (uint64) {
        Campaign storage c = campaigns[id];
        if (c.proofAt == 0) return 0;
        return c.proofAt + c.reviewWindow;
    }

    // --- Lifecycle ---

    /// @notice Create a campaign. Payee may be the zero address here and assigned later,
    /// but if given it cannot be the creator.
    function createCampaign(
        string calldata metadataURI,
        uint256 goal,
        uint64 fundingDeadline,
        uint64 completionDeadline,
        uint64 reviewWindow,
        uint16 feeBps,
        address payee
    ) external returns (uint256 id) {
        if (goal == 0) revert BadGoal();
        if (feeBps > MAX_FEE_BPS) revert FeeTooHigh();
        // Deadlines must be in the future and in order: funding before completion.
        if (fundingDeadline <= block.timestamp || completionDeadline <= fundingDeadline) revert BadDeadlines();
        if (reviewWindow == 0) revert BadDeadlines();
        if (payee == msg.sender) revert PayeeIsCreator();

        id = nextId++;
        Campaign storage c = campaigns[id];
        c.creator = msg.sender;
        c.payee = payee;
        c.goal = goal;
        c.fundingDeadline = fundingDeadline;
        c.completionDeadline = completionDeadline;
        c.reviewWindow = reviewWindow;
        c.feeBps = feeBps;
        c.metadataURI = metadataURI;
        c.status = Status.Funding;

        emit CampaignCreated(id, msg.sender, payee, goal, feeBps, metadataURI);
    }

    /// @notice Chip in. Only while Funding and before the funding deadline. The amount is
    /// capped at what is still needed, so there is no overfunding. Reaching the goal moves
    /// the campaign to Funded straight away.
    function contribute(uint256 id, uint256 amount) external nonReentrant {
        Campaign storage c = campaigns[id];
        if (c.status != Status.Funding) revert WrongStatus();
        if (block.timestamp > c.fundingDeadline) revert FundingClosed();
        if (amount == 0) revert BadGoal();

        uint256 remaining = c.goal - c.raised;
        uint256 accepted = amount > remaining ? remaining : amount;

        c.raised += accepted;
        c.pot += accepted;
        contributionOf[id][msg.sender] += accepted;

        token.safeTransferFrom(msg.sender, address(this), accepted);

        emit Contributed(id, msg.sender, accepted, c.raised);

        if (c.raised == c.goal) {
            c.status = Status.Funded;
        }
    }

    /// @notice Pull your money out while the campaign is still raising, minus the fee.
    /// The fee stays in the pot and is shared to the remaining backers only if the
    /// campaign later refunds. Once Funded, this reverts.
    function withdraw(uint256 id) external nonReentrant {
        Campaign storage c = campaigns[id];
        if (c.status != Status.Funding) revert WrongStatus();

        uint256 contributed = contributionOf[id][msg.sender];
        if (contributed == 0) revert NothingContributed();

        uint256 fee = (contributed * c.feeBps) / BPS_DENOMINATOR;
        uint256 refundToBacker = contributed - fee;

        contributionOf[id][msg.sender] = 0;
        c.raised -= contributed;
        c.pot -= refundToBacker; // fee stays in the pot
        c.retainedFees += fee;

        token.safeTransfer(msg.sender, refundToBacker);

        emit Withdrawn(id, msg.sender, refundToBacker, fee);
    }

    /// @notice Assign the payee. Creator only, before proof is submitted. Cannot be the
    /// zero address or the creator.
    function assignPayee(uint256 id, address payee) external {
        Campaign storage c = campaigns[id];
        if (msg.sender != c.creator) revert NotCreator();
        if (c.status != Status.Funding && c.status != Status.Funded) revert WrongStatus();
        if (payee == address(0)) revert ZeroAddress();
        if (payee == c.creator) revert PayeeIsCreator();

        c.payee = payee;
        emit PayeeAssigned(id, payee);
    }

    /// @notice Payee submits proof, while Funded and before the completion deadline. This
    /// starts the review window.
    function submitProof(uint256 id, string calldata proofURI) external {
        Campaign storage c = campaigns[id];
        if (c.status != Status.Funded) revert WrongStatus();
        if (msg.sender != c.payee) revert NotPayee();
        if (block.timestamp > c.completionDeadline) revert FundingClosed();

        c.proofURI = proofURI;
        c.proofAt = uint64(block.timestamp);
        c.status = Status.ProofSubmitted;

        emit ProofSubmitted(id, proofURI, c.proofAt + c.reviewWindow);
    }

    /// @notice Creator confirms the job during the review window. The full pot,
    /// contributions plus any retained fees, goes to the payee.
    function confirm(uint256 id) external nonReentrant {
        Campaign storage c = campaigns[id];
        if (c.status != Status.ProofSubmitted) revert WrongStatus();
        if (msg.sender != c.creator) revert NotCreator();
        if (block.timestamp > reviewEndsAt(id)) revert ReviewOver();
        if (c.payee == address(0)) revert PayeeNotSet();

        uint256 amount = c.pot;
        c.pot = 0;
        c.status = Status.Paid;

        token.safeTransfer(c.payee, amount);

        emit Confirmed(id, c.payee, amount);
        emit Paid(id, c.payee, amount);
    }

    /// @notice Creator rejects the job during the review window. Moves to Refunding.
    function reject(uint256 id) external {
        Campaign storage c = campaigns[id];
        if (c.status != Status.ProofSubmitted) revert WrongStatus();
        if (msg.sender != c.creator) revert NotCreator();
        if (block.timestamp > reviewEndsAt(id)) revert ReviewOver();

        emit Rejected(id);
        _startRefunding(id, c);
    }

    /// @notice Anyone can call this once the review window has ended with no decision.
    /// The money goes back to the street.
    function finalizeAfterReview(uint256 id) external {
        Campaign storage c = campaigns[id];
        if (c.status != Status.ProofSubmitted) revert WrongStatus();
        if (block.timestamp <= reviewEndsAt(id)) revert ReviewNotOver();

        _startRefunding(id, c);
    }

    /// @notice Creator cancels, while Funding or Funded. Moves to Refunding.
    function cancel(uint256 id) external {
        Campaign storage c = campaigns[id];
        if (msg.sender != c.creator) revert NotCreator();
        if (c.status != Status.Funding && c.status != Status.Funded) revert WrongStatus();

        _startRefunding(id, c);
    }

    /// @notice Anyone can call this if the campaign is Funded and the completion deadline
    /// passed with no proof. Moves to Refunding.
    function expire(uint256 id) external {
        Campaign storage c = campaigns[id];
        if (c.status != Status.Funded) revert WrongStatus();
        if (block.timestamp <= c.completionDeadline) revert DeadlineNotPassed();

        _startRefunding(id, c);
    }

    /// @notice A missed funding goal is not a state transition anyone triggers: once the
    /// funding deadline has passed with the goal unmet, refunds open lazily. This moves
    /// the campaign to Refunding so backers can claim.
    function startRefundOnMissedGoal(uint256 id) external {
        Campaign storage c = campaigns[id];
        if (c.status != Status.Funding) revert WrongStatus();
        if (block.timestamp <= c.fundingDeadline) revert DeadlineNotPassed();

        _startRefunding(id, c);
    }

    /// @notice In Refunding, each backer claims once and receives their contribution plus
    /// their pro-rata share of any retained withdrawal fees.
    function claimRefund(uint256 id) external nonReentrant {
        Campaign storage c = campaigns[id];
        if (c.status != Status.Refunding) revert WrongStatus();
        if (refundClaimed[id][msg.sender]) revert AlreadyRefunded();

        uint256 contributed = contributionOf[id][msg.sender];
        if (contributed == 0) revert NothingToRefund();

        // Pro-rata share of retained fees, using the raised amount frozen at refund start.
        uint256 feeShare = c.refundBase == 0 ? 0 : (c.retainedFees * contributed) / c.refundBase;
        uint256 amount = contributed + feeShare;

        refundClaimed[id][msg.sender] = true;
        // Guard against rounding dust leaving the pot short: never pay more than the pot holds.
        if (amount > c.pot) amount = c.pot;
        c.pot -= amount;

        token.safeTransfer(msg.sender, amount);

        emit Refunded(id, msg.sender, amount);
    }

    // --- Internal ---

    function _startRefunding(uint256 id, Campaign storage c) internal {
        c.status = Status.Refunding;
        // Freeze the denominator for fee sharing at the live contribution total.
        c.refundBase = c.raised;
        emit RefundingStarted(id);
    }
}
