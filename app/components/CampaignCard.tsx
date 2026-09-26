import Link from "next/link";
import type { Campaign } from "@/lib/campaigns";
import { formatUsdc } from "@/lib/campaigns";
import { MoneyStatePill } from "./MoneyState";
import { Progress } from "./Progress";

const TYPE_LABEL: Record<string, string> = {
  event: "Street event",
  project: "Community project",
  job: "Local job",
};

export function CampaignCard({ campaign }: { campaign: Campaign }) {
  const { raw, meta, moneyState, progress } = campaign;
  const title = meta?.title ?? "Untitled campaign";
  const raising = moneyState === "raising";

  return (
    <Link
      href={`/campaign/${campaign.id}`}
      className="group block overflow-hidden rounded-[14px] border bg-[color:var(--color-cotton-deep)] transition-transform duration-200 active:scale-[0.99]"
      style={{ borderColor: "var(--color-line)" }}
    >
      {meta?.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={meta.image}
          alt=""
          className="h-40 w-full object-cover"
          style={{ background: "var(--color-line)" }}
        />
      ) : (
        <div
          className="flex h-40 w-full items-center justify-center"
          style={{
            background:
              "linear-gradient(135deg, oklch(0.9 0.02 90), var(--color-cotton-deep))",
          }}
        >
          <span className="font-display text-2xl text-[color:var(--color-line-strong)]">
            {TYPE_LABEL[meta?.type ?? "event"]}
          </span>
        </div>
      )}

      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-display text-lg leading-tight text-[color:var(--color-ink)]">
            {title}
          </h3>
          <MoneyStatePill state={moneyState} size="sm" />
        </div>

        {meta?.description && (
          <p className="line-clamp-2 text-sm text-[color:var(--color-ink-soft)]">
            {meta.description}
          </p>
        )}

        <Progress value={progress} reached={progress >= 1 && raising} />

        <div className="flex items-baseline justify-between text-sm">
          <span className="font-semibold text-[color:var(--color-ink)]">
            {formatUsdc(raw.raised)}{" "}
            <span className="font-normal text-[color:var(--color-ink-soft)]">
              of {formatUsdc(raw.goal)} chipped in
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
