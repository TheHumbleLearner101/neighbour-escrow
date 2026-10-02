/**
 * Give a friend test USDC so they can try Hearth. Testnet only (Base Sepolia).
 *
 *   node --experimental-transform-types scripts/give-test-money.mts balances
 *   node --experimental-transform-types scripts/give-test-money.mts give <hearth-id> <amount> [name]
 *
 * Sends from whichever of the three project test wallets holds the most, signed by
 * the Crossmint server signer (gas sponsored by Crossmint). Keys come from the
 * repo-root .env, which is never committed.
 */
import { fileURLToPath } from "node:url";
import { appendFileSync, mkdirSync } from "node:fs";
import { createCrossmint, CrossmintWallets } from "@crossmint/wallets-sdk";
import { createPublicClient, http, parseAbi, isAddress, getAddress } from "viem";
import { baseSepolia } from "viem/chains";

process.loadEnvFile(fileURLToPath(new URL("../../.env", import.meta.url)));

const CHAIN = "base-sepolia";
const MAX_GIFT = 10; // dollars per send, so a typo can't empty a wallet
const USDC = getAddress(process.env.USDC_ADDRESS ?? "");
const CAMPAIGNS = getAddress(process.env.CAMPAIGNS_CONTRACT_ADDRESS ?? "");
const WALLETS: Record<string, `0x${string}`> = {
  "Backer A": "0x1B3a8CfEc12Aa3bac017528C3D10cd6daF2EFd21",
  "Backer B": "0xb93a68E71A6B609Bb2DD550faFF903dcdd3935aD",
  Provider: "0x473E0B6fC24c068d6e4dE538B298316Edf77a9D4",
};

const apiKey = process.env.CROSSMINT_SERVER_SIDE_API_KEY ?? "";
const secret = process.env.CROSSMINT_SIGNER_SECRET ?? "";
if (!apiKey.startsWith("sk_staging_")) throw new Error("Refusing: needs a staging server key (sk_staging_...).");
if (!secret) throw new Error("CROSSMINT_SIGNER_SECRET missing from .env");

const rpc = createPublicClient({ chain: baseSepolia, transport: http(process.env.BASE_SEPOLIA_RPC_URL) });
const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);
const balanceOf = async (a: `0x${string}`) =>
  Number(await rpc.readContract({ address: USDC, abi: erc20, functionName: "balanceOf", args: [a] })) / 1e6;

async function balances() {
  const rows = await Promise.all(Object.entries(WALLETS).map(async ([n, a]) => [n, a, await balanceOf(a)] as const));
  for (const [n, , b] of rows) console.log(`${n.padEnd(9)} $${b}`);
  console.log(`total     $${rows.reduce((s, r) => s + r[2], 0)}`);
  return rows;
}

async function give(to: string, amountText: string, name: string) {
  if (!isAddress(to)) throw new Error("That isn't a Hearth ID (should start 0x and be 42 characters).");
  const recipient = getAddress(to);
  if (recipient === USDC || recipient === CAMPAIGNS) throw new Error("That's a contract address, not a person.");
  const amount = Number(amountText);
  if (!(amount > 0) || amount > MAX_GIFT) throw new Error(`Amount must be above 0 and at most $${MAX_GIFT}.`);

  const rows = await balances();
  const [fromName, fromAddress, fromBalance] = [...rows].sort((a, b) => b[2] - a[2])[0];
  if (fromBalance < amount) throw new Error(`No test wallet has $${amount}. Top one up at faucet.circle.com.`);

  const before = await balanceOf(recipient);
  const wallet = await CrossmintWallets.from(createCrossmint({ apiKey })).getWallet(fromAddress, { chain: CHAIN });
  await wallet.useSigner({ type: "server", secret });
  const tx = await wallet.send(recipient, "usdc", String(amount));
  const after = await balanceOf(recipient);

  console.log(`\nSent $${amount} from ${fromName} to ${name || recipient}`);
  console.log(`Their balance: $${before} -> $${after}`);
  console.log(`https://sepolia.basescan.org/tx/${tx.hash}`);

  const log = fileURLToPath(new URL("../../close-outs/", import.meta.url));
  mkdirSync(log, { recursive: true });
  appendFileSync(`${log}test-money-given.md`, `- ${new Date().toISOString()} | ${name || "-"} | ${recipient} | $${amount} from ${fromName} | ${tx.hash}\n`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === "balances") await balances();
else if (cmd === "give") await give(args[0] ?? "", args[1] ?? "", args.slice(2).join(" "));
else console.log("Usage: balances | give <hearth-id> <amount> [name]");
