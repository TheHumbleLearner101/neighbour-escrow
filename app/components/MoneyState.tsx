import type { MoneyState } from "@/lib/campaigns";

/**
 * The money state at a glance. Plain English, never on-chain enums.
 * CONTEXT.md rule: raising / booked / waiting for the go-ahead / paid / money back.
 */
const CONFIG: Record<
  MoneyState,
  { label: string; dot: string; bg: string; ink: string }
> = {
  raising: {
    label: "Raising",
    dot: "var(--color-glow-bright)",
    bg: "oklch(0.72 0.16 62 / 0.14)",
    ink: "oklch(0.42 0.12 55)",
  },
  booked: {
    label: "Booked",
    dot: "var(--color-ember)",
    bg: "oklch(0.379 0.155 29.4 / 0.12)",
    ink: "var(--color-ember)",
  },
  waiting: {
    label: "Waiting for the go-ahead",
    dot: "var(--color-glow)",
    bg: "oklch(0.724 0.108 67 / 0.16)",
    ink: "oklch(0.42 0.09 60)",
  },
  paid: {
    label: "Paid",
    dot: "var(--color-paid)",
    bg: "oklch(0.58 0.13 145 / 0.14)",
    ink: "oklch(0.40 0.11 145)",
  },
  refunded: {
    label: "Money back",
    dot: "var(--color-ink-soft)",
    bg: "oklch(0.44 0.02 30 / 0.10)",
    ink: "var(--color-ink-soft)",
  },
};

export function MoneyStatePill({
  state,
  size = "md",
}: {
  state: MoneyState;
  size?: "sm" | "md";
}) {
  const c = CONFIG[state];
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${pad}`}
      style={{ background: c.bg, color: c.ink }}
    >
      <span
        className="inline-block h-1.5 w-1.5 rounded-full"
        style={{ background: c.dot }}
      />
      {c.label}
    </span>
  );
}
