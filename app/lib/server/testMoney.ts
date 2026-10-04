/**
 * Test money for Hearth testers. Base Sepolia only.
 *
 * Shared by the "Get $5 to try Hearth" route (app/api/gift) and the CLI script
 * (scripts/give-test-money.mts). Sends come from whichever of the three project
 * test wallets holds the most, signed by the Crossmint server signer, with gas
 * sponsored by Crossmint. Nothing in this file is imported by the browser.
 */
import { createCrossmint, CrossmintWallets } from "@crossmint/wallets-sdk";
import { createPublicClient, http, parseAbi, type Address } from "viem";
import { baseSepolia } from "viem/chains";

export const CHAIN = "base-sepolia";

/** The three project test wallets (docs/WALLETS.md). */
export const GIFT_WALLETS: Record<string, Address> = {
  "Backer A": "0x1B3a8CfEc12Aa3bac017528C3D10cd6daF2EFd21",
  "Backer B": "0xb93a68E71A6B609Bb2DD550faFF903dcdd3935aD",
  Provider: "0x473E0B6fC24c068d6e4dE538B298316Edf77a9D4",
};

const erc20 = parseAbi(["function balanceOf(address) view returns (uint256)"]);

export function makeRpc(rpcUrl?: string) {
  return createPublicClient({ chain: baseSepolia, transport: http(rpcUrl) });
}
type Rpc = ReturnType<typeof makeRpc>;

export async function usdcBalance(rpc: Rpc, usdc: Address, who: Address): Promise<number> {
  const units = await rpc.readContract({
    address: usdc,
    abi: erc20,
    functionName: "balanceOf",
    args: [who],
  });
  return Number(units) / 1e6;
}

export type GiftWalletBalance = { name: string; address: Address; balance: number };

export async function giftBalances(rpc: Rpc, usdc: Address): Promise<GiftWalletBalance[]> {
  return Promise.all(
    Object.entries(GIFT_WALLETS).map(async ([name, address]) => ({
      name,
      address,
      balance: await usdcBalance(rpc, usdc, address),
    })),
  );
}

/** Richest gift wallet that isn't the recipient, or null if none can cover the amount. */
export function pickSender(
  rows: GiftWalletBalance[],
  to: Address,
  amount: number,
): GiftWalletBalance | null {
  const best = rows
    .filter((r) => r.address.toLowerCase() !== to.toLowerCase())
    .sort((a, b) => b.balance - a.balance)[0];
  return best && best.balance >= amount ? best : null;
}

type TransferPage = {
  items?: {
    from?: { hash?: string };
    token?: { address?: string; address_hash?: string };
  }[];
  next_page_params?: Record<string, string | number> | null;
};

/**
 * Has this account ever received USDC from one of the gift wallets? Read from the
 * explorer's index, so the rule survives redeploys and needs no database. The index
 * can lag the chain by a few seconds. An address the explorer has never seen is
 * simply one with no transfers.
 */
export async function alreadyGifted(
  blockscoutApi: string,
  usdc: Address,
  to: Address,
): Promise<boolean> {
  const sources = new Set(Object.values(GIFT_WALLETS).map((a) => a.toLowerCase()));
  const base = `${blockscoutApi}/addresses/${to}/token-transfers`;
  let params = new URLSearchParams({ type: "ERC-20", filter: "to" });
  for (let page = 0; page < 10; page++) {
    const res = await fetch(`${base}?${params}`, { cache: "no-store" });
    if (res.status === 404) return false;
    if (!res.ok) throw new Error(`explorer answered ${res.status}`);
    const data = (await res.json()) as TransferPage;
    for (const it of data.items ?? []) {
      const token = (it.token?.address ?? it.token?.address_hash ?? "").toLowerCase();
      const from = (it.from?.hash ?? "").toLowerCase();
      if (token === usdc.toLowerCase() && sources.has(from)) return true;
    }
    if (!data.next_page_params) return false;
    params = new URLSearchParams({ type: "ERC-20", filter: "to" });
    for (const [k, v] of Object.entries(data.next_page_params)) params.set(k, String(v));
  }
  return false;
}

/** Send USDC from a gift wallet. Returns the transaction hash. */
export async function sendGift(opts: {
  apiKey: string;
  secret: string;
  from: Address;
  to: Address;
  amount: number;
}): Promise<string> {
  const { apiKey, secret, from, to, amount } = opts;
  if (!apiKey.startsWith("sk_staging_"))
    throw new Error("Refusing: needs a staging server key (sk_staging_...).");
  const wallet = await CrossmintWallets.from(createCrossmint({ apiKey })).getWallet(from, {
    chain: CHAIN,
  });
  await wallet.useSigner({ type: "server", secret });
  const tx = await wallet.send(to, "usdc", String(amount));
  return tx.hash;
}
