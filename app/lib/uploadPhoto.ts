/**
 * Shrink a phone photo in the browser, then upload it. Phone photos are often
 * 4 to 10MB, above Vercel's 4.5MB request limit, and a proof photo only needs
 * to be clear on a phone screen. Returns the hosted URL, which is what goes on-chain.
 */
const MAX_EDGE = 1600;
const QUALITY = 0.82;

async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Couldn't read that photo."))),
      "image/jpeg",
      QUALITY,
    ),
  );
}

export async function uploadPhoto(file: File): Promise<string> {
  let body: Blob = file;
  try {
    body = await shrink(file);
  } catch {
    // Formats the browser can't decode go up as they are; the server checks the size.
  }
  const fd = new FormData();
  fd.append("file", body, file.name.replace(/\.\w+$/, "") + ".jpg");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const json = (await res.json()) as { url?: string; error?: string };
  if (!json.url) throw new Error(json.error ?? "Upload failed");
  return json.url;
}
