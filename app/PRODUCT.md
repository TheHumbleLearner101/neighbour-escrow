# PRODUCT.md — Hearth

## Register

**Product.** Hearth is app UI that serves a task (fund a street thing, prove it, release the money). Design serves the product. There is a small marketing moment (the landing/first screen) but the primary surface is the app.

## What it is

Hearth is community crowdfunding for a single street. A neighbour raises money for something shared, for example a bouncy castle for the street party. Neighbours chip in USDC, the money is locked in a smart contract nobody can touch, and it is released to the local business or neighbour who did the work only once the creator confirms the job. If it does not happen, everyone gets their money back. Built on Base (Ethereum L2), but the user never needs to know that.

## Target users & context

- **Residents of one street or neighbourhood.** Pilot: a soi in Rawai, Phuket, mix of Thai and foreign residents. Most are NOT crypto people. They open this on a phone, standing on their street, deciding whether to chip in a few dollars to a neighbour's event.
- **Local businesses** that provide events and services (bouncy-castle hire, caterers, cleaners, trades). They want to see the money is already locked before they turn up. This is the pitch to them.
- **Newcomers** who have just arrived, do not know anyone, and may not have a local bank account. Hearth lets them join their street the week they arrive, trusting the contract, not a person.

The job: pool money for a shared local thing, with proof the money is safe and only moves when the work is done.

## Emotions the interface should evoke

Warmth, belonging, trust between neighbours (not institutional trust). The opposite of a cold fintech dashboard. Someone should feel they are joining their street, not using a crypto app. Confidence that their money is safe without needing to understand why.

## Brand personality (3 words)

Warm. Trustworthy. Neighbourly.

## Anti-references (what it must NOT look like)

- **Not a crypto/DeFi app.** No dark neon trading-dashboard aesthetic, no charts, no jargon. Never show "token", "gas", "approve", "wallet address" in the main UI. Never show raw hex addresses (names + explorer links in a details view only). Base-track hackathon is full of these; Hearth stands out by being the opposite.
- **Not a bank.** Blue = institution/corporate; deliberately rejected. Trust here is neighbourly, not institutional.
- **Not AI-generated.** The overriding concern. Avoid the 2026 AI-default look: Geist font + neutral-grey token system, and especially a warm cream/sand/paper body background (the single most saturated AI tell). Warmth is carried by the fire palette + type + the flame mark, NOT by a cream body.

## Money-state clarity (product rule)

Every screen must make the money state obvious at a glance: **raising / booked / waiting for the go-ahead / paid / money back**. Plain words, never on-chain status enums. Copy uses: "chip in", "money back", "paid", "your street".

## Strategic design principles

1. **Human first, chain hidden.** The blockchain is plumbing. Surface names, photos, progress, and plain-English states. Explorer links live in a "details" affordance for the curious.
2. **Three hero moments, rest clean.** Invest design energy in: (1) creating a campaign, (2) the progress bar filling toward the goal and the "goal reached" moment, (3) the payout/"paid!" moment. Everything else is clean and quick.
3. **Warmth without childishness.** Deep confident red (a front door, a wax seal) grounds it; amber is the glow. Playful energy, adult gravitas. Not a toy.
4. **Mobile first.** Users are on a phone on their street.

## Register-defining flows

Street feed → campaign page → chip in → (provider) submit proof → (creator) confirm → paid, or goal missed → money back.
