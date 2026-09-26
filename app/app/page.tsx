"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCrossmintAuth } from "@crossmint/client-sdk-react-ui";
import { Header } from "@/components/Header";
import { CampaignCard } from "@/components/CampaignCard";
import { Flame } from "@/components/Flame";
import { getAllCampaigns, type Campaign } from "@/lib/campaigns";

export default function StreetFeed() {
  const { status, login } = useCrossmintAuth();
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);

  useEffect(() => {
    let live = true;
    getAllCampaigns()
      .then((c) => live && setCampaigns(c))
      .catch(() => live && setCampaigns([]));
    return () => {
      live = false;
    };
  }, []);

  // Events first, then the rest, newest within each group (already newest-first).
  const ordered = campaigns
    ? [...campaigns].sort((a, b) => {
        const ae = a.meta?.type === "event" ? 0 : 1;
        const be = b.meta?.type === "event" ? 0 : 1;
        return ae - be;
      })
    : null;

  return (
    <div className="min-h-full">
      <Header />

      {/* Hero intro: what Hearth is, warm and human. */}
      <section className="mx-auto max-w-xl px-4 pt-10 pb-6">
        <Flame size={44} glow />
        <h1 className="font-display mt-4 text-4xl leading-[1.05] text-[color:var(--color-ink)]">
          Chip in for
          <br />
          your street.
        </h1>
        <p className="mt-3 max-w-md text-[color:var(--color-ink-soft)]">
          Neighbours pool a little money for shared local things. It waits safely
          until the job is done. No bank account needed, no one holding the pot.
        </p>
        {status !== "logged-in" && (
          <button
            onClick={login}
            className="mt-5 rounded-full px-5 py-2.5 font-semibold text-[color:var(--color-cotton)] transition-transform active:scale-95"
            style={{ background: "var(--color-ember)" }}
          >
            Join your street
          </button>
        )}
      </section>

      {/* The feed */}
      <section className="mx-auto max-w-xl px-4 pb-28">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl text-[color:var(--color-ink)]">
            On your street
          </h2>
          <Link
            href="/create"
            className="text-sm font-semibold text-[color:var(--color-ember)]"
          >
            Start one +
          </Link>
        </div>

        {ordered === null ? (
          <FeedSkeleton />
        ) : ordered.length === 0 ? (
          <EmptyFeed />
        ) : (
          <div className="grid gap-4">
            {ordered.map((c) => (
              <CampaignCard key={c.id} campaign={c} />
            ))}
          </div>
        )}
      </section>

      {/* Floating start button, mobile-friendly */}
      <Link
        href="/create"
        className="fixed bottom-6 left-1/2 z-[30] -translate-x-1/2 rounded-full px-6 py-3 font-semibold text-[color:var(--color-cotton)] shadow-lg transition-transform active:scale-95"
        style={{
          background: "var(--color-ember)",
          boxShadow: "0 8px 24px oklch(0.379 0.155 29.4 / 0.35)",
        }}
      >
        Start a campaign
      </Link>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="grid gap-4">
      {[0, 1].map((i) => (
        <div
          key={i}
          className="h-64 animate-pulse rounded-[14px] border"
          style={{
            background: "var(--color-cotton-deep)",
            borderColor: "var(--color-line)",
          }}
        />
      ))}
    </div>
  );
}

function EmptyFeed() {
  return (
    <div
      className="rounded-[14px] border border-dashed px-6 py-12 text-center"
      style={{ borderColor: "var(--color-line-strong)" }}
    >
      <p className="font-display text-lg text-[color:var(--color-ink)]">
        Nothing on your street yet.
      </p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-[color:var(--color-ink-soft)]">
        Be the first. Start a street party, a clean-up, or fix something that
        needs doing.
      </p>
      <Link
        href="/create"
        className="mt-5 inline-block rounded-full px-5 py-2.5 font-semibold text-[color:var(--color-cotton)]"
        style={{ background: "var(--color-ember)" }}
      >
        Start the first one
      </Link>
    </div>
  );
}
