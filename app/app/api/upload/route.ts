import { NextRequest, NextResponse } from "next/server";

/**
 * Image upload. Uses Vercel Blob when BLOB_READ_WRITE_TOKEN is set (free tier,
 * on Vercel), otherwise falls back to a base64 data URI so the app works with
 * zero external services locally and in the demo. Data URIs are fine for small
 * photos; Blob is preferred in production for size.
 */
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const tooBig = bytes.byteLength > 4 * 1024 * 1024; // keep data-URI fallback small

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    try {
      const { put } = await import("@vercel/blob");
      const blob = await put(`hearth/${Date.now()}-${file.name}`, bytes, {
        access: "public",
        contentType: file.type,
      });
      return NextResponse.json({ url: blob.url });
    } catch (e) {
      // fall through to data URI
      console.error("blob upload failed, using data uri", e);
    }
  }

  if (tooBig) {
    return NextResponse.json(
      { error: "Image too large. Keep it under 4MB." },
      { status: 413 },
    );
  }
  const dataUri = `data:${file.type};base64,${bytes.toString("base64")}`;
  return NextResponse.json({ url: dataUri });
}
