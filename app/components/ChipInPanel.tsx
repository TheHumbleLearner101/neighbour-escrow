"use client";

import { useEffect, useState } from "react";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { useCampaignActions } from "@/lib/useCampaignActions";
import {
  Status,
  EXPLORER,
  formatUsdc,
  toUsdc,
  publicClient,
  refundCallDue,
  cleanMoneyInput,
  parseMoney,
  CAMPAIGNS_ADDRESS,
  CAMPAIGNS_ABI,
  type Campaign,
  type CampaignHistory,
} from "@/lib/campaigns";
import { getAddress } from "viem";

const PRESETS = [5, 10, 25];

export function ChipInPanel({
  campaign,
  history,
  isCreator,
  isPayee,
  loggedIn,
  onDone,
}: {
  campaign: Campaign;
  history: CampaignHistory | null;
  isCreator: boolean;
  isPayee: boolean;
  loggedIn: boolean;
  onDone: () => void;
}) {
  const { login } = useCrossmintAuth();
  const { wallet } = useWallet();
  const actions = useCampaignActions();
  const { raw } = campaign;
  const remaining = Math.max(0, toUsdc(raw.goal) - toUsdc(raw.raised));
  const [amount, setAmount] = useState("");
  const chipAmount = parseMoney(amount);
  const [myContribution, setMyContribution] = useState<number>(0);
  const [myRefundClaimed, setMyRefundClaimed] = useState(false);

  // Read the signed-in wallet's own contribution, and whether it has already had its money back.
  useEffect(() => {
    let live = true;
    const me = wallet?.address;
    (async () => {
      if (!me || !loggedIn) return;
      try {
        const args = [BigInt(campaign.id), getAddress(me)] as const;
        const [c, claimed] = await Promise.all([
          publicClient.readContract({
            address: CAMPAIGNS_ADDRESS,
            abi: CAMPAIGNS_ABI,
            functionName: "contributionOf",
            args,
          }) as Promise<bigint>,
          publicClient.readContract({
            address: CAMPAIGNS_ADDRESS,
            abi: CAMPAIGNS_ABI,
            functionName: "refundClaimed",
            args,
          }) as Promise<boolean>,
        ]);
        if (live) {
          setMyContribution(toUsdc(c));
          setMyRefundClaimed(claimed);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      live = false;
    };
  }, [wallet?.address, loggedIn, campaign.id, raw.status, raw.raised]);

  const busy = actions.state === "signing" || actions.state === "confirming";
  const openFirst = refundCallDue(raw);

  async function handle(fn: () => Promise<string>) {
    try {
      await fn();
      // give the chain a moment, then refresh the page's campaign data
      setTimeout(onDone, 1500);
    } catch {
      /* error surfaced by actions.error */
    }
  }

  // --- Paid: open to everyone, logged in or not ---
  if (raw.status === Status.Paid) {
    return (
      <Panel>
        <div className="text-center">
          <div className="font-display text-2xl text-[color:var(--color-paid)]">
            Paid. The job got done.
          </div>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            ${formatUsdc(raw.raised + raw.retainedFees)} went to the provider.
          </p>
          {history?.paidTx && <TxLink hash={history.paidTx}>See the payment</TxLink>}
        </div>
      </Panel>
    );
  }

  // --- Not logged in ---
  if (!loggedIn) {
    return (
      <Panel>
        <button onClick={login} className="btn-primary w-full">
          Join your street to chip in
        </button>
      </Panel>
    );
  }

  // --- Transaction feedback ---
  if (actions.state === "done") {
    return (
      <Panel>
        <div className="text-center">
          <div className="font-display text-lg text-[color:var(--color-paid)]">
            Done.
          </div>
          {actions.lastTx && (
            <TxLink hash={actions.lastTx}>See it on the explorer</TxLink>
          )}
          <button
            onClick={() => {
              actions.reset();
              onDone();
            }}
            className="btn-ghost mt-3"
          >
            Back
          </button>
        </div>
      </Panel>
    );
  }

  // --- Money back: refunds are open, or a deadline has passed and they're due ---
  if (raw.status === Status.Refunding || openFirst) {
    const hasShare = myContribution > 0 && !myRefundClaimed;
    const myRefund = history?.refunds.find(
      (r) => r.backer.toLowerCase() === wallet?.address?.toLowerCase(),
    );
    return (
      <Panel>
        <p className="mb-3 text-center text-sm text-[color:var(--color-ink-soft)]">
          {reasonText(raw.status, openFirst)} Everyone gets their money back.
        </p>
        {hasShare ? (
          <button
            disabled={busy}
            onClick={() =>
              handle(() => actions.claimRefund(campaign.id, openFirst, true))
            }
            className="btn-primary w-full"
          >
            {busy ? "Sending…" : `Get my $${myContribution.toFixed(2)} back`}
          </button>
        ) : myRefundClaimed ? (
          <div className="text-center text-sm text-[color:var(--color-ink-soft)]">
            You&apos;ve had your money back.
            {myRefund && <TxLink hash={myRefund.tx}>See the refund</TxLink>}
          </div>
        ) : openFirst ? (
          // Nothing of mine in it, but anyone can open refunds for the street.
          <button
            disabled={busy}
            onClick={() =>
              handle(() => actions.claimRefund(campaign.id, openFirst, false))
            }
            className="btn-ghost w-full text-sm"
          >
            {busy ? "Opening…" : "Open refunds for everyone"}
          </button>
        ) : (
          <p className="text-center text-sm text-[color:var(--color-ink-soft)]">
            You didn&apos;t chip into this one.
          </p>
        )}
        {actions.error && <ErrorNote msg={actions.error} />}
      </Panel>
    );
  }

  const cancelButton = isCreator && (
    <button
      disabled={busy}
      onClick={() => {
        if (window.confirm("Call it off? Everyone will get their money back."))
          handle(() => actions.cancelCampaign(campaign.id));
      }}
      className="btn-ghost mt-2 w-full text-sm"
    >
      Call it off and refund everyone
    </button>
  );

  // --- Raising: chip in, and pull out if you already chipped in ---
  if (raw.status === Status.Funding) {
    return (
      <Panel>
        <label className="mb-2 block text-sm font-medium">
          Chip in
          <span className="ml-1 font-normal text-[color:var(--color-ink-soft)]">
            (up to {formatUsdc(raw.goal - raw.raised)} left)
          </span>
        </label>
        <div className="flex gap-2">
          {PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => setAmount(String(p))}
              className="flex-1 rounded-[10px] border py-2 text-sm font-semibold transition-colors"
              style={{
                borderColor:
                  amount === String(p) ? "var(--color-ember)" : "var(--color-line)",
                background:
                  amount === String(p)
                    ? "oklch(0.379 0.155 29.4 / 0.08)"
                    : "transparent",
                color: amount === String(p) ? "var(--color-ember)" : "var(--color-ink)",
              }}
            >
              ${p}
            </button>
          ))}
          <input
            type="text"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(cleanMoneyInput(e.target.value))}
            placeholder="Other"
            className="w-20 rounded-[10px] border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-line)" }}
            aria-label="Custom amount"
          />
        </div>

        <button
          disabled={busy || remaining <= 0 || !chipAmount}
          onClick={() =>
            chipAmount && handle(() => actions.chipIn(campaign.id, chipAmount))
          }
          className="btn-primary mt-3 w-full"
        >
          {busy
            ? actions.state === "confirming"
              ? "Chipping in…"
              : "Confirm in your wallet…"
            : chipAmount
              ? `Chip in $${amount}`
              : "Pick an amount"}
        </button>

        {myContribution > 0 && (
          <button
            disabled={busy}
            onClick={() => handle(() => actions.pullOut(campaign.id))}
            className="btn-ghost mt-2 w-full text-sm"
          >
            Pull out my ${myContribution.toFixed(2)} (3% fee stays for the street)
          </button>
        )}
        {cancelButton}

        {actions.error && <ErrorNote msg={actions.error} />}
      </Panel>
    );
  }

  // --- Booked: waiting on the provider's proof ---
  if (raw.status === Status.Funded) {
    if (isPayee) {
      return (
        <Panel>
          <p className="mb-3 text-sm text-[color:var(--color-ink-soft)]">
            The money is locked and waiting for you. Once the job is done, post a
            photo of yourself at the event to get paid.
          </p>
          <a href={`/campaign/${campaign.id}/proof`} className="btn-primary block text-center">
            Submit your proof
          </a>
        </Panel>
      );
    }
    return (
      <Panel>
        <p className="text-center text-sm text-[color:var(--color-ink-soft)]">
          The booking is on and the money is locked in. Waiting for the provider
          to do the job and post proof.
        </p>
        {cancelButton}
        {actions.error && <ErrorNote msg={actions.error} />}
      </Panel>
    );
  }

  // --- Waiting: creator reviews the proof ---
  if (raw.status === Status.ProofSubmitted) {
    if (isCreator) {
      return (
        <Panel>
          {raw.proofURI && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={raw.proofURI}
              alt="Proof of the job"
              className="mb-3 w-full rounded-[10px] object-cover"
            />
          )}
          <p className="mb-3 text-sm text-[color:var(--color-ink-soft)]">
            The provider says the job is done. If that looks right, release the
            money. If not, reject it and everyone gets their money back.
          </p>
          <button
            disabled={busy}
            onClick={() => handle(() => actions.confirmJob(campaign.id))}
            className="btn-primary w-full"
          >
            {busy ? "Releasing…" : "Looks good, release the money"}
          </button>
          <button
            disabled={busy}
            onClick={() => handle(() => actions.rejectJob(campaign.id))}
            className="btn-ghost mt-2 w-full text-sm"
          >
            Something&apos;s wrong, refund everyone
          </button>
          {actions.error && <ErrorNote msg={actions.error} />}
        </Panel>
      );
    }
    return (
      <Panel>
        {raw.proofURI && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={raw.proofURI}
            alt="Proof of the job"
            className="mb-3 w-full rounded-[10px] object-cover"
          />
        )}
        <p className="text-center text-sm text-[color:var(--color-ink-soft)]">
          The provider has posted proof. Waiting on the organiser to give the
          go-ahead.
        </p>
      </Panel>
    );
  }

  return null;
}

/** Plain-English reason the money is going back. */
function reasonText(
  status: number,
  openFirst: ReturnType<typeof refundCallDue>,
): string {
  if (openFirst === "startRefundOnMissedGoal")
    return "The goal wasn't reached in time.";
  if (openFirst === "expire") return "The job wasn't done in time.";
  if (openFirst === "finalizeAfterReview")
    return "Nobody gave the go-ahead in time.";
  return status === Status.Refunding ? "This one didn't go ahead." : "";
}

function TxLink({ hash, children }: { hash: string; children: React.ReactNode }) {
  return (
    <a
      href={`${EXPLORER}/tx/${hash}`}
      target="_blank"
      rel="noreferrer"
      className="mt-1 block text-sm underline text-[color:var(--color-ink-soft)]"
    >
      {children}
    </a>
  );
}

function Panel({ children }: { children: React.ReactNode }) {
  return <div className="mt-4">{children}</div>;
}

function ErrorNote({ msg }: { msg: string }) {
  return (
    <p className="mt-2 text-center text-sm text-[color:var(--color-ember)]">
      {msg}
    </p>
  );
}
