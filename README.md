# Hearth

Community crowdfunding for one street. Neighbours chip in for something shared, the money waits in a smart contract, and the local business or neighbour who does the job is paid once the organiser confirms it is done. If it does not happen, everyone gets their money back.

Built for the Colosseum Crypto World's Fair hackathon, Base track. Testnet only (Base Sepolia).

## Why this exists

We used to know our neighbours. You could knock next door and borrow a ladder, kids played out front, and if you needed a hand, someone on the road could help. Most of that is gone. Big companies decide what we eat and what it costs, while the tomatoes growing two doors down go to waste. And as AI and rising costs squeeze ordinary people, now's the time to lean on each other again.

Hearth is a way back to that. Someone on the street starts a campaign: a street party, a bouncy castle for the kids, a pothole that needs fixing. Neighbours chip in, the money waits in a smart contract, and a local business or neighbour gets paid once the organiser confirms the job is done. If it doesn't happen, everyone gets their money back.

It matters most where trust is lowest. Say you've just arrived in a new country. You don't know anyone, and you might not have a local bank account yet. With Hearth, you can chip in to your street's party the week you arrive, and nobody has to trust anybody. The money waits in the contract until the job is done. No bank account needed, no middleman holding it. Just neighbours.

## How it works

1. An organiser starts a campaign: what it is, the goal, and who is doing the job.
2. Neighbours chip in USDC with an email login. No bank account, no crypto knowledge.
3. Goal reached: the booking is on and the money is locked. Before that, a backer can pull out for a 3% fee, which stays in the pot for the street.
4. The provider posts a photo of themselves at the event. The organiser confirms and the provider is paid, or rejects and everyone is refunded.
5. If a deadline passes with nobody acting (goal missed, job not done, no decision on the proof), anyone can open refunds, and each backer claims their own money back.

Nobody can take the money out: there is no admin, no owner and no upgrade path.

## Live deployment

| | |
| --- | --- |
| Contract | `Campaigns` at [`0x50729788eaEe25B1faF2680bcE87a147961F6A2e`](https://sepolia.basescan.org/address/0x50729788eaEe25B1faF2680bcE87a147961F6A2e) |
| Network | Base Sepolia (chain ID 84532) |
| Stablecoin | Circle USDC, `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |

The full loop (a paid campaign and a refunded one) has been run on-chain. See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Repo layout

- [`contracts/`](contracts): Solidity contract and Foundry tests
- [`app/`](app): Next.js web app (mobile first)
- [`docs/`](docs): spec, plan, deployment and wallet records

## The contract

One contract holds every campaign by ID. Solidity ^0.8.24, OpenZeppelin `SafeERC20` and `ReentrancyGuard`. The stablecoin address is a constructor parameter, so the same contract works with any ERC-20 stablecoin or on another chain.

Lifecycle: `Funding` → `Funded` → `ProofSubmitted` → `Paid`, with `Refunding` reachable from each stage. Refunds are pull payments: each backer calls `claimRefund` once and receives their contribution plus a pro-rata share of any retained pull-out fees.

Events for anyone building on it: `CampaignCreated`, `Contributed`, `Withdrawn`, `PayeeAssigned`, `ProofSubmitted`, `Confirmed`, `Rejected`, `Paid`, `RefundingStarted`, `Refunded`.

```bash
cd contracts
forge test
```

## The app

Email-login smart wallets come from Crossmint, and Crossmint sponsors gas, so users never hold ETH. Campaign text lives in a small JSON metadata URI; photos are hosted on Vercel Blob and only their URL goes on-chain. Campaign history (backers, payment and refund transactions) is read from the Blockscout API.

```bash
cd app
cp .env.example .env.local   # fill in the values
pnpm install
pnpm dev
```

## Credits

The wallet setup (the Crossmint provider configuration and email-login flow, about 12 lines in `app/app/providers.tsx`) is adapted from Crossmint's [stablecoin wallet quickstart](https://github.com/Crossmint/stablecoin-wallet-quickstart). The quickstart does not publish a licence; only that provider setup, which follows Crossmint's SDK documentation, was taken from it. The campaign contract, the tests and every Hearth screen were built for this project.

## Licence

MIT. See [LICENSE](LICENSE).
