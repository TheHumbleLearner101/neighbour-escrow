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
  CAMPAIGNS_ADDRESS,
  CAMPAIGNS_ABI,
  type Campaign,
} from "@/lib/campaigns";
import { getAddress } from "viem";

const PRESETS = [5, 10, 25];

export function ChipInPanel({
  campaign,
  isCreator,
  isPayee,
  loggedIn,
  onDone,
}: {
  campaign: Campaign;
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
  const [amount, setAmount] = useState(Math.min(10, remaining || 10));
  const [myContribution, setMyContribution] = useState<number>(0);

  // Read the signed-in wallet's own contribution to this campaign.
  useEffect(() => {
    let live = true;
    const me = wallet?.address;
    (async () => {
      if (!me || !loggedIn) return;
      try {
        const c = (await publicClient.readContract({
          address: CAMPAIGNS_ADDRESS,
          abi: CAMPAIGNS_ABI,
          functionName: "contributionOf",
          args: [BigInt(campaign.id), getAddress(me)],
        })) as bigint;
        if (live) setMyContribution(toUsdc(c));
      } catch {
        /* ignore */
      }
    })();
    return () => {
      live = false;
    };
  }, [wallet?.address, loggedIn, campaign.id]);

  const busy = actions.state === "signing" || actions.state === "confirming";

  async function handle(fn: () => Promise<string>) {
    try {
      await fn();
      // give the chain a moment, then refresh the page's campaign data
      setTimeout(onDone, 1500);
    } catch {
      /* error surfaced by actions.error */
    }
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
            <a
              href={`${EXPLORER}/tx/${actions.lastTx}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-sm underline text-[color:var(--color-ink-soft)]"
            >
              See it on the explorer
            </a>
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
              onClick={() => setAmount(p)}
              className="flex-1 rounded-[10px] border py-2 text-sm font-semibold transition-colors"
              style={{
                borderColor:
                  amount === p ? "var(--color-ember)" : "var(--color-line)",
                background:
                  amount === p
                    ? "oklch(0.379 0.155 29.4 / 0.08)"
                    : "transparent",
                color: amount === p ? "var(--color-ember)" : "var(--color-ink)",
              }}
            >
              ${p}
            </button>
          ))}
          <input
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(Math.max(1, Number(e.target.value)))}
            className="w-20 rounded-[10px] border px-3 py-2 text-sm"
            style={{ borderColor: "var(--color-line)" }}
            aria-label="Custom amount"
          />
        </div>

        <button
          disabled={busy || remaining <= 0}
          onClick={() => handle(() => actions.chipIn(campaign.id, amount))}
          className="btn-primary mt-3 w-full"
        >
          {busy
            ? actions.state === "confirming"
              ? "Chipping in…"
              : "Confirm in your wallet…"
            : `Chip in $${amount}`}
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
            Something's wrong, refund everyone
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
          The provider has posted proof. Waiting on{" "}
          {isCreator ? "you" : "the organiser"} to give the go-ahead.
        </p>
      </Panel>
    );
  }

  // --- Paid ---
  if (raw.status === Status.Paid) {
    return (
      <Panel>
        <div className="text-center">
          <div className="font-display text-2xl text-[color:var(--color-paid)]">
            Paid. The job got done.
          </div>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            {formatUsdc(raw.pot > 0n ? raw.pot : raw.raised)} went to the
            provider.
          </p>
        </div>
      </Panel>
    );
  }

  // --- Refunding: claim your money back ---
  if (raw.status === Status.Refunding) {
    return (
      <Panel>
        <p className="mb-3 text-center text-sm text-[color:var(--color-ink-soft)]">
          This one didn&apos;t go ahead. Everyone gets their money back.
        </p>
        {myContribution > 0 ? (
          <button
            disabled={busy}
            onClick={() => handle(() => actions.claimRefund(campaign.id))}
            className="btn-primary w-full"
          >
            {busy ? "Sending…" : `Get my $${myContribution.toFixed(2)} back`}
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

  return null;
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
