import { NextRequest, NextResponse } from "next/server";
import { isAddress, getAddress } from "viem";
import { USDC_ADDRESS, CAMPAIGNS_ADDRESS, BLOCKSCOUT_API } from "@/lib/campaigns";
import {
  makeRpc,
  giftBalances,
  pickSender,
  alreadyGifted,
  sendGift,
} from "@/lib/server/testMoney";

/**
 * "Get $5 to try Hearth". Testers start with an empty account and the organiser
 * won't always have a laptop, so a signed-in user can fund themselves from their
 * phone. Gated by a code word, one gift per account (checked against the chain),
 * paid from the project's own test wallets. Testnet only.
 *
 * Server-only settings: CROSSMINT_SERVER_SIDE_API_KEY, CROSSMINT_SIGNER_SECRET,
 * HEARTH_GIFT_CODE, and optionally HEARTH_GIFT_AMOUNT (dollars, default 5, max 10).
 */
export const runtime = "nodejs";

const MAX_GIFT = 10;
/** Accounts with a send in progress on this server, so a double tap can't pay twice. */
const inFlight = new Set<string>();

const fail = (status: number, error: string, detail?: string) =>
  NextResponse.json(detail ? { error, detail } : { error }, { status });

export async function POST(req: NextRequest) {
  const apiKey = process.env.CROSSMINT_SERVER_SIDE_API_KEY ?? "";
  const secret = process.env.CROSSMINT_SIGNER_SECRET ?? "";
  const code = (process.env.HEARTH_GIFT_CODE ?? "").trim();
  const amount = Number(process.env.HEARTH_GIFT_AMOUNT ?? 5);
  if (!apiKey || !secret || !code)
    return fail(503, "Free test money isn't switched on yet.");
  if (!(amount > 0) || amount > MAX_GIFT)
    return fail(500, "The test money amount is set wrong.");

  let body: { to?: unknown; code?: unknown } = {};
  try {
    body = await req.json();
  } catch {
    /* empty body handled below */
  }
  const to = typeof body.to === "string" ? body.to : "";
  const given = typeof body.code === "string" ? body.code : "";

  if (!isAddress(to)) return fail(400, "Sign in first, then try again.");
  const recipient = getAddress(to);
  if (recipient === USDC_ADDRESS || recipient === CAMPAIGNS_ADDRESS)
    return fail(400, "That's not a person's account.");
  if (given.trim().toLowerCase() !== code.toLowerCase())
    return fail(403, "That's not the code word. Ask the neighbour who told you about Hearth.");

  const key = recipient.toLowerCase();
  if (inFlight.has(key)) return fail(429, "Already sending. Give it a moment.");
  inFlight.add(key);
  try {
    let gifted: boolean;
    try {
      gifted = await alreadyGifted(BLOCKSCOUT_API, USDC_ADDRESS, recipient);
    } catch (e) {
      console.error("gift: explorer check failed", e);
      return fail(503, "Couldn't check this account just now. Try again in a minute.");
    }
    if (gifted) return fail(409, `This account has already had its $${amount}.`);

    const rpc = makeRpc(process.env.NEXT_PUBLIC_RPC_URL);
    const sender = pickSender(await giftBalances(rpc, USDC_ADDRESS), recipient, amount);
    if (!sender) return fail(503, "The test money pot is empty. Tell the organiser.");

    const tx = await sendGift({ apiKey, secret, from: sender.address, to: recipient, amount });
    console.log(`gift: $${amount} from ${sender.name} to ${recipient} tx ${tx}`);
    return NextResponse.json({ ok: true, tx, amount, from: sender.name });
  } catch (e) {
    console.error("gift: send failed", e);
    const detail = e instanceof Error ? e.message : String(e);
    return fail(502, "Sending failed. Try again in a minute.", detail);
  } finally {
    inFlight.delete(key);
  }
}
