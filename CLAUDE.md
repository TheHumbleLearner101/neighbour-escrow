# Community crowdfunding for street events (working title, name TBC)

Colosseum Crypto World's Fair hackathon entry, Base track. Submit by Mon 12 Oct 2026 (hard stop 11:59pm PT, 12 Oct).

Read these before doing any work:

- @docs/CONTEXT.md: why this exists, who it's for, what the judges score
- @docs/SPEC.md: what we're building, the contract rules, the screens
- @docs/PLAN.md: build order, milestones, cut list

## Who you're working with

Joel is the product lead, not a career engineer. Before each step, explain what you're about to do in one or two plain-English sentences. Show every command before running anything that installs software, deploys a contract or spends testnet funds.

## Hard rules

1. Testnet only: Base Sepolia, chain ID 84532. Never deploy to mainnet. Never touch real funds.
2. USDC on Base Sepolia is `0x036CbD53842c5426634e7929541eC2318f3dCF7e`. Never use any other token address. The explorer lists several fakes with the same symbol.
3. Secrets live in `.env` only. Never commit `.env`, private keys, seed phrases or API keys. Never print a private key in the terminal.
4. Stay inside the MVP scope in docs/SPEC.md. If a feature isn't listed there, don't build it. Add it to the Roadmap section of SPEC.md as a suggestion and tell Joel.
5. Nothing from Joel's day job goes in this repo: no employer name, data, clients or documents.
6. The Crossmint quickstart is third-party code. Keep its licence, and make sure the README states what came from it and what we built on top.

## Contract rules

- Solidity ^0.8.24, Foundry, OpenZeppelin (SafeERC20, ReentrancyGuard).
- One contract holds all campaigns by ID. No factory.
- Refunds are pull payments: each backer claims their own. Never loop over backers to move money.
- No admin withdrawal, no owner who can move funds, no upgradeability.
- Every state transition and every edge case listed in SPEC.md gets a Foundry test. Run `forge test` before every commit that touches /contracts.
- Durations are parameters set per campaign, so the demo can run in minutes instead of days.

## Writing rules (README, UI copy, docs)

- Never write the "Why this exists" section of the README. Joel writes it. Leave the placeholder.
- British spelling. Never use em dashes (the long dash); use commas, colons or full stops instead.
- Plain, specific sentences. No emoji checklists, no "production ready" claims, no sections praising the code's design principles.
- You can write the technical docs. Keep them short and accurate.

## Repo layout

- `/contracts`: Foundry project (campaign contract and tests)
- `/app`: Next.js web app, built from Joel's Crossmint quickstart
- `/docs`: SPEC.md, PLAN.md
- `/agents`: reserved for the roadmap. Leave empty for the MVP.

## Workflow

- Small commits with clear messages. Push at the end of every working session.
- Before saying something works, run it and show the output. Never report status based on intent.
- If the same problem survives two attempts, stop and explain it to Joel in plain English before trying again.
