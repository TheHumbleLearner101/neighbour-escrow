"use client";

import { useEffect, useState } from "react";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { getAddress } from "viem";
import { publicClient, USDC_ADDRESS, ERC20_ABI, EXPLORER, toUsdc } from "@/lib/campaigns";

const GIFT = 5;

/**
 * "Get $5 to try Hearth". Shown only to signed-in users whose account is empty.
 * The code word keeps strangers from draining the pot; the server allows one
 * gift per account. See app/api/gift/route.ts.
 */
export function GetTestMoney() {
  const { status } = useCrossmintAuth();
  const { wallet } = useWallet();
  const loggedIn = status === "logged-in";
  const address = wallet?.address;
  const [balance, setBalance] = useState<number | null>(null);
  const [open, setOpen] = useState(false);
  const [code, setCode] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");
  const [tx, setTx] = useState<string | null>(null);
  const [amount, setAmount] = useState(GIFT);

  useEffect(() => {
    let live = true;
    if (!loggedIn || !address) return;
    publicClient
      .readContract({
        address: USDC_ADDRESS,
        abi: ERC20_ABI,
        functionName: "balanceOf",
        args: [getAddress(address)],
      })
      .then((units) => live && setBalance(toUsdc(units as bigint)))
      .catch(() => live && setBalance(null));
    return () => {
      live = false;
    };
  }, [loggedIn, address, state]);

  if (!loggedIn || !address) return null;
  // Only an empty account is offered money. Keep the thank-you up once it's done.
  if (state !== "done" && (balance === null || balance >= 1)) return null;

  async function claim() {
    setState("sending");
    setMessage("");
    try {
      const res = await fetch("/api/gift", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: address, code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        tx?: string;
        amount?: number;
      };
      if (!res.ok) {
        setMessage(data.error ?? "Something went wrong. Try again.");
        setState("error");
        return;
      }
      setTx(data.tx ?? null);
      setAmount(data.amount ?? GIFT);
      setState("done");
    } catch {
      setMessage("No connection. Try again.");
      setState("error");
    }
  }

  return (
    <div
      className="mt-5 rounded-[14px] border p-4"
      style={{ borderColor: "var(--color-line)", background: "var(--color-cotton-deep)" }}
    >
      {state === "done" ? (
        <div className="text-center">
          <div className="font-display text-lg text-[color:var(--color-paid)]">
            Done. ${amount} is in your account.
          </div>
          <p className="mt-1 text-sm text-[color:var(--color-ink-soft)]">
            Test money for trying Hearth. Chip in to anything on your street.
          </p>
          {tx && (
            <a
              href={`${EXPLORER}/tx/${tx}`}
              target="_blank"
              rel="noreferrer"
              className="mt-1 block text-sm underline text-[color:var(--color-ink-soft)]"
            >
              See it on the explorer
            </a>
          )}
        </div>
      ) : !open ? (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-[color:var(--color-ink-soft)]">
            New here? Your account is empty.
          </p>
          <button
            onClick={() => setOpen(true)}
            className="btn-primary whitespace-nowrap text-sm"
          >
            Get ${GIFT} to try Hearth
          </button>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium" htmlFor="gift-code">
            Code word
            <span className="ml-1 font-normal text-[color:var(--color-ink-soft)]">
              (ask the neighbour who told you about Hearth)
            </span>
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="gift-code"
              type="text"
              autoCapitalize="none"
              autoCorrect="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Code word"
              className="min-w-0 flex-1 rounded-[10px] border px-3 py-2 text-sm"
              style={{ borderColor: "var(--color-line)" }}
            />
            <button
              disabled={state === "sending" || !code.trim()}
              onClick={claim}
              className="btn-primary whitespace-nowrap text-sm"
            >
              {state === "sending" ? "Sending…" : `Get my $${GIFT}`}
            </button>
          </div>
          {state === "error" && (
            <p className="mt-2 text-sm text-[color:var(--color-ember)]">{message}</p>
          )}
        </div>
      )}
    </div>
  );
}
