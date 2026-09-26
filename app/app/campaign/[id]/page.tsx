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
  formatUsdc,
  toUsdc,
  Status,
  EXPLORER,
  type Campaign,
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

  const load = useCallback(async () => {
    const c = await getCampaign(numId);
    setCampaign(c);
  }, [numId]);

  useEffect(() => {
    load();
  }, [load]);

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
          isCreator={isCreator}
          isPayee={isPayee}
          loggedIn={authStatus === "logged-in"}
          onDone={load}
        />

        {/* Details / explorer, tucked away for the curious */}
        <details className="mt-6 text-sm text-[color:var(--color-ink-soft)]">
          <summary className="cursor-pointer select-none">Details</summary>
          <div className="mt-2 space-y-1">
            <p>Pot held in the contract: {formatUsdc(raw.pot)} USDC</p>
            {toUsdc(raw.retainedFees) > 0 && (
              <p>Pull-out fees in the pot: {formatUsdc(raw.retainedFees)} USDC</p>
            )}
            <a
              href={`${EXPLORER}/address/${raw.creator}`}
              target="_blank"
              rel="noreferrer"
              className="block underline"
            >
              View the campaign on the explorer
            </a>
          </div>
        </details>
      </div>
    </div>
  );
}
