/**
 * Give a friend test USDC so they can try Hearth. Testnet only (Base Sepolia).
 *
 *   node --experimental-transform-types scripts/give-test-money.mts balances
 *   node --experimental-transform-types scripts/give-test-money.mts give <hearth-id> <amount> [name]
 *
 * Sends from whichever of the three project test wallets holds the most, signed by
 * the Crossmint server signer (gas sponsored by Crossmint). Keys come from the
 * repo-root .env, which is never committed. The in-app "Get $5 to try Hearth"
 * button does the same through app/api/gift; both use lib/server/testMoney.ts.
 * The wallet list lives there too (GIFT_WALLETS).
 */
import { fileURLToPath } from "node:url";
import { appendFileSync, mkdirSync } from "node:fs";
import { isAddress, getAddress } from "viem";
import {
  makeRpc,
  usdcBalance,
  giftBalances,
  pickSender,
  sendGift,
} from "../lib/server/testMoney.ts";

process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));

const MAX_GIFT = 10; // dollars per send, so a typo can't empty a wallet
const USDC = getAddress(process.env.USDC_ADDRESS ?? "");
const CAMPAIGNS = getAddress(process.env.CAMPAIGNS_CONTRACT_ADDRESS ?? "");

const apiKey = process.env.CROSSMINT_SERVER_SIDE_API_KEY ?? "";
const secret = process.env.CROSSMINT_SIGNER_SECRET ?? "";
if (!apiKey.startsWith("sk_staging_")) throw new Error("Refusing: needs a staging server key (sk_staging_...).");
if (!secret) throw new Error("CROSSMINT_SIGNER_SECRET missing from .env");

const rpc = makeRpc(process.env.BASE_SEPOLIA_RPC_URL);

async function balances() {
  const rows = await giftBalances(rpc, USDC);
  for (const r of rows) console.log(`${r.name.padEnd(9)} $${r.balance}`);
  console.log(`total     $${rows.reduce((s, r) => s + r.balance, 0)}`);
  return rows;
}

async function give(to: string, amountText: string, name: string) {
  if (!isAddress(to)) throw new Error("That isn't a Hearth ID (should start 0x and be 42 characters).");
  const recipient = getAddress(to);
  if (recipient === USDC || recipient === CAMPAIGNS) throw new Error("That's a contract address, not a person.");
  const amount = Number(amountText);
  if (!(amount > 0) || amount > MAX_GIFT) throw new Error(`Amount must be above 0 and at most $${MAX_GIFT}.`);

  const sender = pickSender(await balances(), recipient, amount);
  if (!sender) throw new Error(`No test wallet has $${amount}. Top one up at faucet.circle.com.`);

  const before = await usdcBalance(rpc, USDC, recipient);
  const hash = await sendGift({ apiKey, secret, from: sender.address, to: recipient, amount });
  const after = await usdcBalance(rpc, USDC, recipient);

  console.log(`\nSent $${amount} from ${sender.name} to ${name || recipient}`);
  console.log(`Their balance: $${before} -> $${after}`);
  console.log(`https://sepolia.basescan.org/tx/${hash}`);

  const log = fileURLToPath(new URL("../../close-outs/", import.meta.url));
  mkdirSync(log, { recursive: true });
  appendFileSync(`${log}test-money-given.md`, `- ${new Date().toISOString()} | ${name || "-"} | ${recipient} | $${amount} from ${sender.name} | ${hash}\n`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "balances") await balances();
else if (cmd === "give") await give(args[0] ?? "", args[1] ?? "", args.slice(2).join(" "));
else console.log("Usage: balances | give <hearth-id> <amount> [name]");
