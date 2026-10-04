# Hearth web app

Next.js app for Hearth. See the [project README](../README.md) for what it does.

## Run it

```bash
cp .env.example .env.local   # fill in the values
pnpm install
pnpm dev
```

## Where things live

- `app/page.tsx`: street feed
- `app/create/page.tsx`: start a campaign
- `app/campaign/[id]/page.tsx`: campaign page, backers, explorer links
- `app/campaign/[id]/proof/page.tsx`: provider posts the proof photo
- `components/ChipInPanel.tsx`: the actions for each money state and role
- `lib/campaigns.ts`: contract reads, plain-English money states, history from Blockscout
- `lib/useCampaignActions.ts`: wallet writes, signed by the user's own email wallet
- `components/GetTestMoney.tsx` and `app/api/gift/route.ts`: the "Get $5 to try Hearth" button and the server send behind it
- `lib/uploadPhoto.ts` and `app/api/upload/route.ts`: shrink a photo in the browser, store it on Vercel Blob

## Deploying on Vercel

Import the repo with **Root Directory** set to `app`, add the variables from `.env.example`, and connect a Blob store to the project (this sets `BLOB_STORE_ID`).

## Giving testers test money

New accounts start empty. Two ways to fill one, both paying from the project's own test wallets (Base Sepolia only):

- **In the app.** A signed-in user with an empty account sees "Get $5 to try Hearth", enters the code word, and gets $5. One gift per account, checked against the chain's transfer history, so it survives redeploys. Route: `app/api/gift/route.ts`. Needs three server-only settings on Vercel: `CROSSMINT_SERVER_SIDE_API_KEY`, `CROSSMINT_SIGNER_SECRET` and `HEARTH_GIFT_CODE` (see `.env.example`), then a redeploy.
- **From the command line.** `scripts/give-test-money.mts` sends any amount up to $10 and logs it to `close-outs/test-money-given.md`. It reads the Crossmint server key and signer secret from the repo-root `.env`.

Both share `lib/server/testMoney.ts`, which holds the wallet list and the send.

```bash
node --experimental-transform-types scripts/give-test-money.mts balances
node --experimental-transform-types scripts/give-test-money.mts give <hearth-id> 5 "Sam"
```
