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
- `lib/uploadPhoto.ts` and `app/api/upload/route.ts`: shrink a photo in the browser, store it on Vercel Blob

## Deploying on Vercel

Import the repo with **Root Directory** set to `app`, add the variables from `.env.example`, and connect a Blob store to the project (this sets `BLOB_READ_WRITE_TOKEN`).
