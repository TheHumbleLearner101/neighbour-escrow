"use client";

import Link from "next/link";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { Logo } from "./Flame";

/** Short, friendly wallet label. Never shows a raw hex address in full. */
function shortName(address?: string, email?: string) {
  if (email) return email.split("@")[0];
  if (address) return `${address.slice(0, 5)}…${address.slice(-3)}`;
  return "";
}

export function Header() {
  const { login, logout, status, user } = useCrossmintAuth();
  const { wallet } = useWallet();
  const loggedIn = status === "logged-in";

  return (
    <header
      className="sticky top-0 z-[20] border-b backdrop-blur"
      style={{
        background: "oklch(0.938 0.009 100 / 0.85)",
        borderColor: "var(--color-line)",
      }}
    >
      <div className="mx-auto flex h-14 max-w-xl items-center justify-between px-4">
        <Link href="/" aria-label="Hearth home">
          <Logo />
        </Link>

        {loggedIn ? (
          <div className="flex items-center gap-2">
            <span className="hidden text-sm text-[color:var(--color-ink-soft)] sm:inline">
              {shortName(wallet?.address, user?.email)}
            </span>
            <button
              onClick={logout}
              className="rounded-full border px-3 py-1.5 text-sm font-medium transition-colors hover:bg-[color:var(--color-cotton-deep)]"
              style={{ borderColor: "var(--color-line-strong)" }}
            >
              Sign out
            </button>
          </div>
        ) : (
          <button
            onClick={login}
            className="rounded-full px-4 py-1.5 text-sm font-semibold text-[color:var(--color-cotton)] transition-transform active:scale-95"
            style={{ background: "var(--color-ember)" }}
          >
            Join your street
          </button>
        )}
      </div>
    </header>
  );
}
