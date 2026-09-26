/**
 * The Hearth flame mark. A single warm flame: amber core, ember-red outer,
 * drawn as two nested teardrops. Used as the logo, the app icon and the
 * favicon. Sizes via the `size` prop; colour via currentColor fallbacks.
 */
export function Flame({
  size = 28,
  className,
  glow = false,
}: {
  size?: number;
  className?: string;
  glow?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
      style={glow ? { filter: "drop-shadow(0 2px 10px oklch(0.72 0.16 62 / 0.5))" } : undefined}
    >
      {/* outer ember-red flame */}
      <path
        d="M16 2c3.6 4.2 8.4 7.9 8.4 14.2C24.4 23.3 20.7 30 16 30S7.6 23.3 7.6 16.2C7.6 9.9 12.4 6.2 16 2Z"
        fill="var(--color-ember, #810100)"
      />
      {/* inner amber core */}
      <path
        d="M16 11c1.9 2.4 4.3 4.3 4.3 7.9 0 3.9-2 7.1-4.3 7.1s-4.3-3.2-4.3-7.1C11.7 15.3 14.1 13.4 16 11Z"
        fill="var(--color-glow, #D39858)"
      />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={`font-display text-[color:var(--color-ink)] ${className ?? ""}`}
      style={{ fontWeight: 800, letterSpacing: "-0.02em" }}
    >
      Hearth
    </span>
  );
}

export function Logo({ size = 26 }: { size?: number }) {
  return (
    <span className="inline-flex items-center gap-2">
      <Flame size={size} />
      <Wordmark className="text-xl" />
    </span>
  );
}
