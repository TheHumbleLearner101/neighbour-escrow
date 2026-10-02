"use client";

import { useState, useCallback } from "react";
import { useWallet, EVMWallet } from "@crossmint/client-sdk-react-ui";
import {
  CAMPAIGNS_ADDRESS,
  USDC_ADDRESS,
  CAMPAIGNS_ABI,
  ERC20_ABI,
  fromUsdc,
  type OpenRefundCall,
} from "./campaigns";

type ActionState = "idle" | "signing" | "confirming" | "done" | "error";

/** Wallet errors are written for developers. Say what the neighbour should do instead. */
function friendlyError(e: unknown): string {
  const raw = e instanceof Error ? e.message : "";
  if (/not onboarded/i.test(raw))
    return "First time paying from this device. Tap again, and enter the code we email you if asked.";
  if (/rejected|denied|cancel/i.test(raw)) return "Cancelled. Nothing was sent.";
  if (/insufficient|exceeds balance/i.test(raw))
    return "Not enough money in your account for that.";
  return raw || "Something went wrong. Try again.";
}

/**
 * Wallet writes for a campaign, signed by the user's OWN email wallet (client-side).
 * The Crossmint SDK renders the OTP prompt during signing (showOtpSignerPrompt default true).
 * Contract calls go through EVMWallet.sendTransaction; USDC approve is the same path.
 */
export function useCampaignActions() {
  const { wallet } = useWallet();
  const [state, setState] = useState<ActionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastTx, setLastTx] = useState<string | null>(null);

  const evm = useCallback(() => {
    if (!wallet) throw new Error("Sign in to your street first.");
    return EVMWallet.from(wallet);
  }, [wallet]);

  const run = useCallback(
    async (fn: () => Promise<string>) => {
      setError(null);
      setState("signing");
      try {
        const hash = await fn();
        setLastTx(hash);
        setState("done");
        return hash;
      } catch (e) {
        const msg = friendlyError(e);
        setError(msg);
        setState("error");
        throw e;
      }
    },
    [],
  );

  /** Chip in: approve the exact amount, then contribute. */
  const chipIn = useCallback(
    (id: number, usdc: number) =>
      run(async () => {
        const w = evm();
        const amount = fromUsdc(usdc);
        // 1. approve the campaigns contract to pull `amount` USDC
        await w.sendTransaction({
          to: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: "approve",
          args: [CAMPAIGNS_ADDRESS, amount],
        });
        setState("confirming");
        // 2. contribute (capped at the remaining amount on-chain)
        const tx = await w.sendTransaction({
          to: CAMPAIGNS_ADDRESS,
          abi: CAMPAIGNS_ABI,
          functionName: "contribute",
          args: [BigInt(id), amount],
        });
        return tx.hash;
      }),
    [run, evm],
  );

  const pullOut = useCallback(
    (id: number) =>
      run(async () => {
        const tx = await evm().sendTransaction({
          to: CAMPAIGNS_ADDRESS,
          abi: CAMPAIGNS_ABI,
          functionName: "withdraw",
          args: [BigInt(id)],
        });
        return tx.hash;
      }),
    [run, evm],
  );

  const submitProof = useCallback(
    (id: number, proofURI: string) =>
      run(async () => {
        const tx = await evm().sendTransaction({
          to: CAMPAIGNS_ADDRESS,
          abi: CAMPAIGNS_ABI,
          functionName: "submitProof",
          args: [BigInt(id), proofURI],
        });
        return tx.hash;
      }),
    [run, evm],
  );

  const confirmJob = useCallback(
    (id: number) =>
      run(async () => {
        const tx = await evm().sendTransaction({
          to: CAMPAIGNS_ADDRESS,
          abi: CAMPAIGNS_ABI,
          functionName: "confirm",
          args: [BigInt(id)],
        });
        return tx.hash;
      }),
    [run, evm],
  );

  const rejectJob = useCallback(
    (id: number) =>
      run(async () => {
        const tx = await evm().sendTransaction({
          to: CAMPAIGNS_ADDRESS,
          abi: CAMPAIGNS_ABI,
          functionName: "reject",
          args: [BigInt(id)],
        });
        return tx.hash;
      }),
    [run, evm],
  );

  /**
   * Money back. If a deadline has passed but nobody has opened refunds yet,
   * open them first (anyone can), then claim this wallet's share if it has one.
   */
  const claimRefund = useCallback(
    (id: number, openFirst: OpenRefundCall | null, hasShare: boolean) =>
      run(async () => {
        const w = evm();
        let hash = "";
        if (openFirst) {
          const opened = await w.sendTransaction({
            to: CAMPAIGNS_ADDRESS,
            abi: CAMPAIGNS_ABI,
            functionName: openFirst,
            args: [BigInt(id)],
          });
          hash = opened.hash;
          setState("confirming");
        }
        if (hasShare) {
          const tx = await w.sendTransaction({
            to: CAMPAIGNS_ADDRESS,
            abi: CAMPAIGNS_ABI,
            functionName: "claimRefund",
            args: [BigInt(id)],
          });
          hash = tx.hash;
        }
        return hash;
      }),
    [run, evm],
  );

  const cancelCampaign = useCallback(
    (id: number) =>
      run(async () => {
        const tx = await evm().sendTransaction({
          to: CAMPAIGNS_ADDRESS,
          abi: CAMPAIGNS_ABI,
          functionName: "cancel",
          args: [BigInt(id)],
        });
        return tx.hash;
      }),
    [run, evm],
  );

  const createCampaign = useCallback(
    (args: {
      metadataURI: string;
      goal: number;
      fundingDeadline: number;
      completionDeadline: number;
      reviewWindow: number;
      feeBps: number;
      payee: `0x${string}`;
    }) =>
      run(async () => {
        const tx = await evm().sendTransaction({
          to: CAMPAIGNS_ADDRESS,
          abi: CAMPAIGNS_ABI,
          functionName: "createCampaign",
          args: [
            args.metadataURI,
            fromUsdc(args.goal),
            BigInt(args.fundingDeadline),
            BigInt(args.completionDeadline),
            BigInt(args.reviewWindow),
            args.feeBps,
            args.payee,
          ],
        });
        return tx.hash;
      }),
    [run, evm],
  );

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
    setLastTx(null);
  }, []);

  return {
    state,
    error,
    lastTx,
    reset,
    hasWallet: !!wallet,
    chipIn,
    pullOut,
    submitProof,
    confirmJob,
    rejectJob,
    claimRefund,
    cancelCampaign,
    createCampaign,
  };
}
