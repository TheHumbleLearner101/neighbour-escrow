"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCrossmintAuth, useWallet } from "@crossmint/client-sdk-react-ui";
import { Header } from "@/components/Header";
import { useCampaignActions } from "@/lib/useCampaignActions";
import {
  getCampaignCount,
  cleanMoneyInput,
  parseMoney,
  type CampaignType,
} from "@/lib/campaigns";
import { isAddress } from "viem";
import { uploadPhoto } from "@/lib/uploadPhoto";

const TYPES: { value: CampaignType; label: string; hint: string }[] = [
  { value: "event", label: "Street event", hint: "party, fair, clean-up" },
  { value: "project", label: "Community project", hint: "play area, classes" },
  { value: "job", label: "Local job", hint: "lawn, odd jobs" },
];

// How long a campaign raises, how long after that the job must be done, and how
// long the organiser has to review the proof. The quick option runs the whole
// loop in minutes for testing and the demo video.
const MIN = 60;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const TIMINGS = [
  { label: "Quick test", hint: "raises for 15 min", funding: 15 * MIN, job: 2 * HOUR, review: 30 * MIN },
  { label: "1 day", hint: "job within 3 days", funding: DAY, job: 3 * DAY, review: DAY },
  { label: "3 days", hint: "job within a week", funding: 3 * DAY, job: 7 * DAY, review: 2 * DAY },
  { label: "1 week", hint: "job within 2 weeks", funding: 7 * DAY, job: 14 * DAY, review: 2 * DAY },
];
const FEE_BPS = 300; // 3%

export default function CreatePage() {
  const router = useRouter();
  const { status, login } = useCrossmintAuth();
  const { wallet } = useWallet();
  const actions = useCampaignActions();

  const [type, setType] = useState<CampaignType>("event");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [goal, setGoal] = useState("");
  const [timing, setTiming] = useState(1); // 1 day by default
  const [payee, setPayee] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loggedIn = status === "logged-in";
  const busy = actions.state === "signing" || actions.state === "confirming";

  async function onPickImage(file: File) {
    setUploading(true);
    setFormError(null);
    try {
      setImage(await uploadPhoto(file));
    } catch (e) {
      setFormError(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    setFormError(null);
    if (!title.trim()) return setFormError("Give it a name.");
    if (!payee.trim() || !isAddress(payee))
      return setFormError("Paste the provider's Hearth ID.");
    if (wallet && payee.toLowerCase() === wallet.address.toLowerCase())
      return setFormError("That's your own ID. The person getting paid has to be someone else, because you're the one who approves the job.");
    const goalAmount = parseMoney(goal);
    if (!goalAmount) return setFormError("Set a goal, for example 150.");

    // Pack metadata into a data URI (tiny; no hosting needed).
    const meta = { title: title.trim(), description: description.trim(), type, image: image ?? undefined };
    const metadataURI = `data:application/json;base64,${btoa(
      unescape(encodeURIComponent(JSON.stringify(meta))),
    )}`;

    const now = Math.floor(Date.now() / 1000);
    try {
      const nextId = await getCampaignCount(); // the id this new campaign will get
      await actions.createCampaign({
        metadataURI,
        goal: goalAmount,
        fundingDeadline: now + TIMINGS[timing].funding,
        completionDeadline: now + TIMINGS[timing].funding + TIMINGS[timing].job,
        reviewWindow: TIMINGS[timing].review,
        feeBps: FEE_BPS,
        payee: payee as `0x${string}`,
      });
      setTimeout(() => router.push(`/campaign/${nextId}`), 1500);
    } catch {
      /* actions.error shows it */
    }
  }

  return (
    <div className="min-h-full pb-16">
      <Header />
      <div className="mx-auto max-w-xl px-4 py-6">
        <h1 className="font-display text-3xl">Start a campaign</h1>
        <p className="mt-1 text-[color:var(--color-ink-soft)]">
          Raise money for something your street needs. It stays locked until the
          job is done.
        </p>

        {!loggedIn ? (
          <button onClick={login} className="btn-primary mt-6 w-full">
            Join your street to start
          </button>
        ) : (
          <div className="mt-6 space-y-5">
            {/* Type */}
            <div>
              <Label>What is it?</Label>
              <div className="grid grid-cols-3 gap-2">
                {TYPES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setType(t.value)}
                    className="rounded-[10px] border p-3 text-left transition-colors"
                    style={{
                      borderColor:
                        type === t.value
                          ? "var(--color-ember)"
                          : "var(--color-line)",
                      background:
                        type === t.value
                          ? "oklch(0.379 0.155 29.4 / 0.06)"
                          : "transparent",
                    }}
                  >
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className="text-xs text-[color:var(--color-ink-soft)]">
                      {t.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Name it">
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Bouncy castle for the street party"
                className="input"
              />
            </Field>

            <Field label="What's the plan?">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Saturday 10 Oct, on the green. For all the kids on the road."
                rows={3}
                className="input resize-none"
              />
            </Field>

            <Field label="Goal ($)">
              <input
                type="text"
                inputMode="decimal"
                value={goal}
                onChange={(e) => setGoal(cleanMoneyInput(e.target.value))}
                placeholder="150"
                className="input"
              />
            </Field>

            <div>
              <Label>How long to raise?</Label>
              <div className="grid grid-cols-2 gap-2">
                {TIMINGS.map((t, i) => (
                  <button
                    key={t.label}
                    onClick={() => setTiming(i)}
                    className="rounded-[10px] border p-3 text-left transition-colors"
                    style={{
                      borderColor:
                        timing === i ? "var(--color-ember)" : "var(--color-line)",
                      background:
                        timing === i
                          ? "oklch(0.379 0.155 29.4 / 0.06)"
                          : "transparent",
                    }}
                  >
                    <div className="text-sm font-semibold">{t.label}</div>
                    <div className="text-xs text-[color:var(--color-ink-soft)]">
                      {t.hint}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Who's getting paid? (not you: paste the provider's Hearth ID, from their Copy my ID button)">
              <input
                value={payee}
                onChange={(e) => setPayee(e.target.value)}
                placeholder="0x…"
                className="input font-mono text-sm"
              />
            </Field>

            <Field label="Photo (optional)">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) onPickImage(f);
                }}
                className="block w-full text-sm text-[color:var(--color-ink-soft)]"
              />
              {uploading && (
                <p className="mt-1 text-xs text-[color:var(--color-ink-soft)]">
                  Uploading…
                </p>
              )}
              {image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={image}
                  alt=""
                  className="mt-2 h-32 w-full rounded-[10px] object-cover"
                />
              )}
            </Field>

            {formError && (
              <p className="text-sm text-[color:var(--color-ember)]">
                {formError}
              </p>
            )}
            {actions.error && (
              <p className="text-sm text-[color:var(--color-ember)]">
                {actions.error}
              </p>
            )}

            <button
              disabled={busy || uploading}
              onClick={submit}
              className="btn-primary w-full"
            >
              {busy
                ? actions.state === "confirming"
                  ? "Creating…"
                  : "Confirm in your wallet…"
                : "Start the campaign"}
            </button>
            <p className="text-center text-xs text-[color:var(--color-ink-soft)]">
              Pull out before the goal is reached and 3% stays in the pot for the street.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 text-sm font-medium">{children}</div>;
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-sm font-medium">{label}</div>
      {children}
    </label>
  );
}
