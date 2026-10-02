import {
  createPublicClient,
  http,
  getAddress,
  decodeEventLog,
  type Address,
  type Hex,
} from "viem";
import { baseSepolia } from "viem/chains";

export const CAMPAIGNS_ADDRESS = getAddress(
  process.env.NEXT_PUBLIC_CAMPAIGNS_ADDRESS!,
);
export const USDC_ADDRESS = getAddress(process.env.NEXT_PUBLIC_USDC_ADDRESS!);
export const EXPLORER =
  process.env.NEXT_PUBLIC_EXPLORER ?? "https://sepolia.basescan.org";
/** Blockscout API, used to read the campaign's event history. The public RPC refuses wide log ranges. */
export const BLOCKSCOUT_API =
  process.env.NEXT_PUBLIC_BLOCKSCOUT_API ??
  "https://base-sepolia.blockscout.com/api/v2";

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
  {
    type: "function",
    name: "refundClaimed",
    stateMutability: "view",
    inputs: [
      { name: "id", type: "uint256" },
      { name: "backer", type: "address" },
    ],
    outputs: [{ type: "bool" }],
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
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  // --- anyone can call these once a deadline has passed; each moves the campaign to Refunding ---
  {
    type: "function",
    name: "startRefundOnMissedGoal",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "expire",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "finalizeAfterReview",
    stateMutability: "nonpayable",
    inputs: [{ name: "id", type: "uint256" }],
    outputs: [],
  },
  // --- events, decoded from Blockscout logs for the backer list and transaction links ---
  {
    type: "event",
    name: "Contributed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "backer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
      { name: "raised", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Withdrawn",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "backer", type: "address", indexed: true },
      { name: "refundToBacker", type: "uint256", indexed: false },
      { name: "fee", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Paid",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "payee", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event",
    name: "Refunded",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "backer", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
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

/** Keep only what a money box should hold: digits and one decimal point, max 2 decimals. */
export function cleanMoneyInput(raw: string): string {
  const digits = raw.replace(/[^0-9.]/g, "");
  const [whole, ...rest] = digits.split(".");
  return rest.length ? `${whole}.${rest.join("").slice(0, 2)}` : whole;
}

/** The typed amount as a number, or null if it isn't a usable amount above zero. */
export function parseMoney(raw: string): number | null {
  const n = Number(raw);
  return raw.trim() !== "" && Number.isFinite(n) && n > 0 ? n : null;
}

export function formatUsdc(units: bigint): string {
  const n = toUsdc(units);
  return n.toLocaleString(undefined, {
    minimumFractionDigits: n % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  });
}

function nowSeconds(): bigint {
  return BigInt(Math.floor(Date.now() / 1000));
}

/**
 * The contract only moves to Refunding when someone calls it after a deadline.
 * This returns which call opens refunds right now, or null if none is due.
 */
export type OpenRefundCall =
  | "startRefundOnMissedGoal"
  | "expire"
  | "finalizeAfterReview";

export function refundCallDue(raw: RawCampaign): OpenRefundCall | null {
  const now = nowSeconds();
  if (raw.status === Status.Funding && now > raw.fundingDeadline)
    return "startRefundOnMissedGoal";
  if (raw.status === Status.Funded && now > raw.completionDeadline)
    return "expire";
  if (
    raw.status === Status.ProofSubmitted &&
    now > raw.proofAt + raw.reviewWindow
  )
    return "finalizeAfterReview";
  return null;
}

/** Derive the plain-English money state from on-chain status and the clock. */
export function deriveMoneyState(raw: RawCampaign): MoneyState {
  // A missed deadline reads as "money back" even before anyone opens refunds.
  if (refundCallDue(raw)) return "refunded";
  switch (raw.status) {
    case Status.Funding:
      return "raising";
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
  // Campaigns without readable metadata (early command-line test runs) are left off the feed.
  return results
    .filter((c): c is Campaign => c !== null && c.meta !== null)
    .reverse(); // newest first
}

// --- History: who chipped in, and the transactions that paid or refunded ---

export interface Backer {
  address: Address;
  amount: bigint; // what they still have in, after any pull-out
}

export interface CampaignHistory {
  backers: Backer[];
  paidTx: Hex | null;
  refunds: { backer: Address; amount: bigint; tx: Hex }[];
}

interface BlockscoutLog {
  topics: (Hex | null)[];
  data: Hex;
  transaction_hash: Hex;
}

/** All logs the contract has emitted, oldest first, via Blockscout (paged). */
async function fetchContractLogs(): Promise<BlockscoutLog[]> {
  const logs: BlockscoutLog[] = [];
  let params = "";
  for (let page = 0; page < 20; page++) {
    const res = await fetch(
      `${BLOCKSCOUT_API}/addresses/${CAMPAIGNS_ADDRESS}/logs${params}`,
    );
    if (!res.ok) break;
    const json = (await res.json()) as {
      items: BlockscoutLog[];
      next_page_params: Record<string, string | number> | null;
    };
    logs.push(...json.items);
    if (!json.next_page_params) break;
    params =
      "?" +
      new URLSearchParams(
        Object.entries(json.next_page_params).map(([k, v]) => [k, String(v)]),
      ).toString();
  }
  return logs.reverse(); // Blockscout returns newest first
}

export async function getCampaignHistory(id: number): Promise<CampaignHistory> {
  const history: CampaignHistory = { backers: [], paidTx: null, refunds: [] };
  const held = new Map<Address, bigint>();

  let logs: BlockscoutLog[];
  try {
    logs = await fetchContractLogs();
  } catch {
    return history; // history is a nice-to-have; the page works without it
  }

  for (const log of logs) {
    const topics = log.topics.filter((t): t is Hex => t !== null);
    if (topics.length === 0) continue;
    let ev;
    try {
      ev = decodeEventLog({
        abi: CAMPAIGNS_ABI,
        data: log.data,
        topics: topics as [Hex, ...Hex[]],
      });
    } catch {
      continue; // an event this page doesn't use
    }
    const args = ev.args as { id?: bigint } & Record<string, unknown>;
    if (args.id !== BigInt(id)) continue;

    if (ev.eventName === "Contributed") {
      const a = args as unknown as { backer: Address; amount: bigint };
      held.set(a.backer, (held.get(a.backer) ?? BigInt(0)) + a.amount);
    } else if (ev.eventName === "Withdrawn") {
      const a = args as unknown as { backer: Address };
      held.delete(a.backer);
    } else if (ev.eventName === "Paid") {
      history.paidTx = log.transaction_hash;
    } else if (ev.eventName === "Refunded") {
      const a = args as unknown as { backer: Address; amount: bigint };
      history.refunds.push({
        backer: a.backer,
        amount: a.amount,
        tx: log.transaction_hash,
      });
    }
  }

  history.backers = [...held.entries()].map(([address, amount]) => ({
    address,
    amount,
  }));
  return history;
}
