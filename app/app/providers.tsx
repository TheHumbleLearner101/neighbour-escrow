"use client";

import {
  CrossmintAuthProvider,
  CrossmintProvider,
  CrossmintWalletProvider,
} from "@crossmint/client-sdk-react-ui";

/**
 * Wallet plumbing lifted from the Crossmint quickstart. On email login the SDK
 * creates a non-custodial smart wallet on Base Sepolia with email recovery.
 * Everything else (UI, screens) is Hearth's own.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <CrossmintProvider apiKey={process.env.NEXT_PUBLIC_CROSSMINT_CLIENT_API_KEY!}>
      <CrossmintAuthProvider loginMethods={["email"]}>
        <CrossmintWalletProvider
          createOnLogin={{
            chain: "base-sepolia",
            recovery: { type: "email" },
          }}
        >
          {children}
        </CrossmintWalletProvider>
      </CrossmintAuthProvider>
    </CrossmintProvider>
  );
}
