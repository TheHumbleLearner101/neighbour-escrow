"use client";

import { use, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { Header } from "@/components/Header";
import { Progress, Countdown } from "@/components/Progress";
import { MoneyStatePill } from "@/components/MoneyState";
import { ChipInPanel } from "@/components/ChipInPanel";
import {
  getCampaign,
  getCampaignHistory,
  formatUsdc,
  toUsdc,
  Status,
  EXPLORER,
  CAMPAIGNS_ADDRESS,
  type Campaign,
  type CampaignHistory,
} from "@/lib/campaigns";

export default function CampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numId = Number(id);
  const { wallet } = useWallet();
  const { status: authStatus } = useCrossmintAuth();
  const [campaign, setCampaign] = useState<Campaign | null | undefined>(
    undefined,
  );

  const [history, setHistory] = useState<CampaignHistory | null>(null);

  const load = useCallback(async () => {
    const c = await getCampaign(numId);
    setCampaign(c);
    // History comes from the explorer's index, which can lag the chain by a few seconds.
    getCampaignHistory(numId).then(setHistory);
  }, [numId]);

  useEffect(() => {
    let live = true;
    getCampaign(numId).then((c) => live && setCampaign(c));
    getCampaignHistory(numId).then((h) => live && setHistory(h));
    return () => {
      live = false;
    };
  }, [numId]);

  if (campaign === undefined) {
    return (
      <div className="min-h-full">
        <Header />
        <div className="mx-auto max-w-xl px-4 py-16">
          <div
            className="h-72 animate-pulse rounded-[14px]"
            style={{ background: "var(--color-cotton-deep)" }}
          />
        </div>
      </div>
    );
  }

  if (campaign === null) {
    return (
      <div className="min-h-full">
        <Header />
        <div className="mx-auto max-w-xl px-4 py-16 text-center">
          <p className="font-display text-xl">Campaign not found.</p>
          <Link
            href="/"
            className="mt-4 inline-block font-semibold text-[color:var(--color-ember)]"
          >
            Back to your street
          </Link>
        </div>
      </div>
    );
  }

  const { raw, meta, moneyState, progress } = campaign;
  const me = wallet?.address?.toLowerCase();
  const isCreator = me === raw.creator.toLowerCase();
  const isPayee = me === raw.payee.toLowerCase();
  const reached = progress >= 1;

  return (
    <div className="min-h-full pb-28">
      <Header />

      <div className="mx-auto max-w-xl px-4">
        <Link
          href="/"
          className="mt-4 inline-flex items-center gap-1 text-sm text-[color:var(--color-ink-soft)]"
        >
          ← Your street
        </Link>

        {/* Photo */}
        {meta?.image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={meta.image}
            alt=""
            className="mt-3 h-52 w-full rounded-[14px] object-cover"
          />
        )}

        {/* Title + state */}
        <div className="mt-5 flex items-start justify-between gap-3">
          <h1 className="font-display text-3xl leading-tight">
            {meta?.title ?? `Campaign #${campaign.id}`}
          </h1>
          <MoneyStatePill state={moneyState} />
        </div>

        {meta?.description && (
          <p className="mt-2 text-[color:var(--color-ink-soft)]">
            {meta.description}
          </p>
        )}

        {/* The pot: hero */}
        <div
          className="mt-6 rounded-[14px] border p-5"
          style={{
            background: "var(--color-cotton-deep)",
            borderColor: "var(--color-line)",
          }}
        >
          <div className="flex items-end justify-between">
            <div>
              <div className="font-display text-3xl text-[color:var(--color-ink)]">
                {formatUsdc(raw.raised)}
              </div>
              <div className="text-sm text-[color:var(--color-ink-soft)]">
                of {formatUsdc(raw.goal)} goal
              </div>
            </div>
            {raw.status === Status.Funding && (
              <div className="text-right text-sm text-[color:var(--color-ink-soft)]">
                <Countdown to={raw.fundingDeadline} />
              </div>
            )}
          </div>
          <div className="mt-4">
            <Progress value={progress} reached={reached} />
          </div>
          {reached && raw.status === Status.Funding && (
            <p className="mt-3 text-sm font-semibold text-[color:var(--color-glow-bright)]">
              Goal reached. The booking is on.
            </p>
          )}
        </div>

        {/* Actions, state + role aware */}
        <ChipInPanel
          campaign={campaign}
          history={history}
          isCreator={isCreator}
          isPayee={isPayee}
          loggedIn={authStatus === "logged-in"}
          onDone={load}
        />

        {/* Who's in */}
        {history && history.backers.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-2 text-sm font-medium">
              {history.backers.length}{" "}
              {history.backers.length === 1 ? "neighbour has" : "neighbours have"}{" "}
              chipped in
            </h2>
            <ul className="space-y-1 text-sm text-[color:var(--color-ink-soft)]">
              {history.backers.map((b, i) => (
                <li key={b.address} className="flex justify-between">
                  <span>
                    {b.address.toLowerCase() === me ? "You" : `Neighbour ${i + 1}`}
                  </span>
                  <span>${formatUsdc(b.amount)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Details / explorer, tucked away for the curious */}
        <details className="mt-6 text-sm text-[color:var(--color-ink-soft)]">
          <summary className="cursor-pointer select-none">Details</summary>
          <div className="mt-2 space-y-1">
            <p>Pot held in the contract: {formatUsdc(raw.pot)} USDC</p>
            {toUsdc(raw.retainedFees) > 0 && (
              <p>Pull-out fees in the pot: {formatUsdc(raw.retainedFees)} USDC</p>
            )}
            <p>Campaign number {campaign.id} in the Hearth contract</p>
            <a
              href={`${EXPLORER}/address/${CAMPAIGNS_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="block underline"
            >
              View the contract on the explorer
            </a>
            {history?.paidTx && (
              <a
                href={`${EXPLORER}/tx/${history.paidTx}`}
                target="_blank"
                rel="noreferrer"
                className="block underline"
              >
                Payment to the provider
              </a>
            )}
            {history?.refunds.map((r) => (
              <a
                key={r.tx}
                href={`${EXPLORER}/tx/${r.tx}`}
                target="_blank"
                rel="noreferrer"
                className="block underline"
              >
                Refund of ${formatUsdc(r.amount)}
              </a>
            ))}
          </div>
        </details>
      </div>
    </div>
  );
}
