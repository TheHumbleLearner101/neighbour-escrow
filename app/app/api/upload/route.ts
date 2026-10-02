import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";

/**
 * Image upload to Vercel Blob (free tier). Only the returned URL goes on-chain.
 *
 * There is deliberately no fallback that embeds the image itself in a data URI:
 * the contract stores the URI as a string, so an embedded photo would be written
 * into contract storage, costing millions of gas or failing outright.
 */
export const runtime = "nodejs";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(req: NextRequest) {
  // Vercel connects a Blob store either with BLOB_STORE_ID (newer stores, signed in
  // automatically on Vercel) or with BLOB_READ_WRITE_TOKEN (older stores, and local dev).
  if (!process.env.BLOB_STORE_ID && !process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: "Photo upload isn't set up yet (no Blob store connected)." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "That isn't a photo." }, { status: 415 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Photo too large. Keep it under 4MB." },
      { status: 413 },
    );
  }

  try {
    const blob = await put(`hearth/${Date.now()}-${file.name}`, file, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch (e) {
    console.error("blob upload failed", e);
    return NextResponse.json(
      { error: "Upload failed. Try again." },
      { status: 502 },
    );
  }
}
