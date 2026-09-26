"use client";

import { useEffect, useState } from "react";

/**
 * The pot filling toward the goal. A hero element: the fire rising. Amber core
 * to ember crest, a soft glow at the leading edge, animates up on mount.
 * `reached` swaps to a fuller, brighter fill for the "goal reached" moment.
 */
export function Progress({
  value,
  reached,
}: {
  value: number; // 0..1
  reached?: boolean;
}) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const t = requestAnimationFrame(() => setShown(Math.min(1, Math.max(0, value))));
    return () => cancelAnimationFrame(t);
  }, [value]);

  const pct = Math.round(shown * 100);

  return (
    <div
      className="relative h-3 w-full overflow-hidden rounded-full"
      style={{ background: "oklch(0.87 0.012 95)" }}
      role="progressbar"
      aria-valuenow={Math.round(value * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${pct}%`,
          background: reached
            ? "linear-gradient(90deg, var(--color-glow) 0%, var(--color-glow-bright) 100%)"
            : "linear-gradient(90deg, var(--color-ember-deep) 0%, var(--color-ember) 55%, var(--color-glow) 100%)",
          boxShadow: pct > 2 ? "0 0 12px oklch(0.72 0.16 62 / 0.55)" : "none",
          transition:
            "width 900ms cubic-bezier(0.22, 1, 0.36, 1), background 400ms ease",
        }}
      />
    </div>
  );
}

/** Live countdown to a unix timestamp, in plain words. */
export function Countdown({ to }: { to: bigint }) {
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));
  useEffect(() => {
    const i = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(i);
  }, []);

  const remaining = Number(to) - now;
  if (remaining <= 0) return <span>Closed</span>;

  const d = Math.floor(remaining / 86400);
  const h = Math.floor((remaining % 86400) / 3600);
  const m = Math.floor((remaining % 3600) / 60);
  const s = remaining % 60;

  if (d > 0) return <span>{d}d {h}h left</span>;
  if (h > 0) return <span>{h}h {m}m left</span>;
  if (m > 0) return <span>{m}m {s}s left</span>;
  return <span>{s}s left</span>;
}
