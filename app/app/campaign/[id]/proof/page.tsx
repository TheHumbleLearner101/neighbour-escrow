"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useWallet } from "@crossmint/client-sdk-react-ui";
import { Header } from "@/components/Header";
import { useCampaignActions } from "@/lib/useCampaignActions";
import { getCampaign, Status, type Campaign } from "@/lib/campaigns";

export default function ProofPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const numId = Number(id);
  const router = useRouter();
  const { wallet } = useWallet();
  const actions = useCampaignActions();

  const [campaign, setCampaign] = useState<Campaign | null | undefined>(
    undefined,
  );
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    getCampaign(numId).then(setCampaign);
  }, [numId]);

  const busy = actions.state === "signing" || actions.state === "confirming";

  async function onPick(file: File) {
    setUploading(true);
    setErr(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (json.url) setImage(json.url);
      else setErr(json.error ?? "Upload failed");
    } catch {
      setErr("Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!image) return setErr("Add a photo first.");
    try {
      await actions.submitProof(numId, image);
      setTimeout(() => router.push(`/campaign/${numId}`), 1500);
    } catch {
      /* actions.error */
    }
  }

  const isPayee =
    campaign &&
    wallet &&
    campaign.raw.payee.toLowerCase() === wallet.address.toLowerCase();
  const canSubmit = campaign?.raw.status === Status.Funded;

  return (
    <div className="min-h-full pb-16">
      <Header />
      <div className="mx-auto max-w-xl px-4 py-6">
        <h1 className="font-display text-3xl">Show it&apos;s done</h1>
        <p className="mt-1 text-[color:var(--color-ink-soft)]">
          Post a photo of yourself at the event. Once the organiser gives the
          go-ahead, you get paid.
        </p>

        {campaign === undefined ? (
          <div className="mt-6 h-40 animate-pulse rounded-[14px] bg-[color:var(--color-cotton-deep)]" />
        ) : !isPayee ? (
          <p className="mt-6 text-sm text-[color:var(--color-ember)]">
            Only the provider for this campaign can submit proof.
          </p>
        ) : !canSubmit ? (
          <p className="mt-6 text-sm text-[color:var(--color-ink-soft)]">
            This campaign isn&apos;t ready for proof yet.
          </p>
        ) : (
          <div className="mt-6 space-y-4">
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPick(f);
              }}
              className="block w-full text-sm text-[color:var(--color-ink-soft)]"
            />
            {uploading && (
              <p className="text-xs text-[color:var(--color-ink-soft)]">
                Uploading…
              </p>
            )}
            {image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image}
                alt="Your proof"
                className="w-full rounded-[14px] object-cover"
              />
            )}
            {(err || actions.error) && (
              <p className="text-sm text-[color:var(--color-ember)]">
                {err ?? actions.error}
              </p>
            )}
            <button
              disabled={busy || uploading || !image}
              onClick={submit}
              className="btn-primary w-full"
            >
              {busy ? "Sending…" : "Submit proof"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
