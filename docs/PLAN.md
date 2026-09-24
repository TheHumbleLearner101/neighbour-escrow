# Plan

Build in this order. Each block depends on the one before it.

1. **Campaign contract** (/contracts): the lifecycle in SPEC.md, fully tested, deployed to Base Sepolia.
2. **Wallets** (/app): email-login wallets from the Crossmint quickstart, holding test USDC.
3. **Job and release flow** (/app): assign provider, submit proof, creator confirms or rejects, claim refund, pull out while raising.
4. **Web app** (/app): the screens in SPEC.md, hosted on Vercel.
5. **Proof** (Joel): a real street event campaign, a local business on board, demo and pitch videos, README.

## Milestones

| Dates | Done when |
| --- | --- |
| Fri 25 Sep | Three wallets on Base Sepolia holding test USDC (two backers, one provider) |
| Sat 26 to Sun 27 Sep | Contract written, all tests in SPEC.md passing, deployed, full loop run from the command line |
| Mon 28 Sep to Fri 2 Oct | Full loop works on Joel's phone through the web app with three wallets |
| Sat 3 to Sun 4 Oct | A small real campaign with friends; a provider gets paid on camera |
| Mon 5 to Thu 8 Oct | A real street event campaign with 5+ households and one local business |
| Fri 9 Oct | Feature freeze |
| Sat 10 to Sun 11 Oct | Demo and pitch videos, README, business plan |
| Mon 12 Oct | Submitted |

## Checkpoint: Sun 4 Oct

If the full loop isn't working by Sunday 4 October, cut in this order until it does:

1. Profile screen
2. Pull-outs with the 3% fee (fall back to money being locked from the moment it goes in)
3. Community project and job type labels (keep events only)

Never cut: an event campaign where refunds unlock when things fall through and the provider is paid on the creator's confirmation.

## Definition of done for the MVP

- A campaign is created, funded by at least two backers, the provider submits proof, the creator confirms, and the provider is paid, all on Base Sepolia from Joel's phone.
- A second campaign misses its goal and every backer claims a refund.
- Both are visible on the explorer with transaction links in the app.
