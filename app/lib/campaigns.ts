import { createPublicClient, http, getAddress, type Address } from "viem";
import { baseSepolia } from "viem/chains";

export const CAMPAIGNS_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_CAMPAIGNS_ADDRESS!,
);
export const USDC_ADDRESS = getAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS!);
export const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER ?? "https://sepolia.basescan.org";

export const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.NEXT_PUBLIC_RPC_URL),
});

/** Matches the Status enum in Campaigns.sol. */
export enum Status {
  Funding = 0,
  Funded = 1,
  ProofSubmitted = 2,
  Paid = 3,
  Refunding = 4,
}

/** Plain-English money state shown in the UI, derived from Status + time. */
export type MoneyState = "raising" | "booked" | "waiting" | "paid" | "refunded";

export const CAMPAIGNS_ABI = [
  {
    type: "function",
    name: "nextId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "getCampaign",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "creator", type: "address" },
          { name: "payee", type: "address" },
          { name: "goal", type: "uint256" },
          { name: "raised", type: "uint256" },
          { name: "pot", type: "uint256" },
          { name: "retainedFees", type: "uint256" },
          { name: "refundBase", type: "uint256" },
          { name: "fundingDeadline", type: "uint64" },
          { name: "completionDeadline", type: "uint64" },
          { name: "reviewWindow", type: "uint64" },
          { name: "proofAt", type: "uint64" },
          { name: "feeBps", type: "uint16" },
          { name: "status", type: "uint8" },
          { name: "metadataURI", type: "string" },
          { name: "proofURI", type: "string" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "reviewEndsAt",
    stateMutability: "view",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [{ type: "uint64" }],
  },
  {
    type: "function",
    name: "contributionOf",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "backer", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  // --- writes (encoded client-side, signed by the user's wallet) ---
  {
    type: "function",
    name: "createCampaign",
    stateMutability: "nonpayable",
    inputs: [
      { name: "metadataURI", type: "string" },
      { name: "goal", type: "uint256" },
      { name: "fundingDeadline", type: "uint64" },
      { name: "completionDeadline", type: "uint64" },
      { name: "reviewWindow", type: "uint64" },
      { name: "feeBps", type: "uint16" },
      { name: "payee", type: "address" },
    ],
    outputs: [{ name: "id", type: "uint256" }],
  },
  {
    type: "function",
    name: "contribute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "submitProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "proofURI", type: "string" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "confirm",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "reject",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "claimRefund",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
] as const;

export const ERC20_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ type: "bool" }],
  },
  {
    type: "function",
    name: "allowance",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

export type CampaignType = "event" | "project" | "job";

/** Off-chain metadata packed into a JSON, its URI stored on-chain. */
export interface CampaignMetadata {
  title: string;
  description: string;
  type: CampaignType;
  image?: string; // URL to the campaign photo
  street?: string;
}

export interface RawCampaign {
  creator: Address;
  payee: Address;
  goal: bigint;
  raised: bigint;
  pot: bigint;
  retainedFees: bigint;
  refundBase: bigint;
  fundingDeadline: bigint;
  completionDeadline: bigint;
  reviewWindow: bigint;
  proofAt: bigint;
  feeBps: number;
  status: number;
  metadataURI: string;
  proofURI: string;
}

export interface Campaign {
  id: number;
  raw: RawCampaign;
  meta: CampaignMetadata | null;
  moneyState: MoneyState;
  progress: number; // 0..1
}

const USDC_DECIMALS = 6;

export function toUsdc(units: bigint): number {
  return Number(units) / 10 ** USDC_DECIMALS;
}

export function fromUsdc(amount: number): bigint {
  return BigInt(Math.round(amount * 10 ** USDC_DECIMALS));
}

export function formatUsdc(units: bigint): string {
  const n = toUsdc(units);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

/** Derive the plain-English money state from on-chain status and the clock. */
export function deriveMoneyState(raw: RawCampaign): MoneyState {
  const now = BigInt(Math.floor(Date.now() / 1000));
  switch (raw.status) {
    case Status.Funding:
      // Deadline passed with goal unmet reads as "money back" (refund opens lazily).
      return now > raw.fundingDeadline ? "refunded" : "raising";
    case Status.Funded:
      return "booked";
    case Status.ProofSubmitted:
      return "waiting";
    case Status.Paid:
      return "paid";
    case Status.Refunding:
      return "refunded";
    default:
      return "raising";
  }
}

async function loadMetadata(uri: string): Promise<CampaignMetadata | null> {
  if (!uri) return null;
  try {
    // Data URI (base64 JSON) or a hosted URL both work with fetch.
    const res = await fetch(uri);
    if (!res.ok) return null;
    return (await res.json()) as CampaignMetadata;
  } catch {
    return null;
  }
}

export async function getCampaignCount(): Promise<number> {
  const n = (await publicClient.readContract({
    address: CAMPAIGNS_ADDRESS,
    abi: CAMPAIGNS_ABI,
    functionName: "nextId",
  })) as bigint;
  return Number(n);
}

export async function getCampaign(id: number): Promise<Campaign | null> {
  const raw = (await publicClient.readContract({
    address: CAMPAIGNS_ADDRESS,
    abi: CAMPAIGNS_ABI,
    functionName: "getCampaign",
    args: [BigInt(id)],
  })) as RawCampaign;

  // Unset campaigns come back with a zero creator; treat as missing.
  if (raw.creator === "0x0000000000000000000000000000000000000000") return null;

  const meta = await loadMetadata(raw.metadataURI);
  const progress =
    raw.goal > BigInt(0)
      ? Math.min(1, Number(raw.raised) / Number(raw.goal))
      : 0;

  return {
    id,
    raw,
    meta,
    moneyState: deriveMoneyState(raw),
    progress,
  };
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  const count = await getCampaignCount();
  const ids = Array.from({ length: count }, (_, i) => i);
  const results = await Promise.all(ids.map((id) => getCampaign(id)));
  return results.filter((c): c is Campaign => c !== null).reverse(); // newest first
}
