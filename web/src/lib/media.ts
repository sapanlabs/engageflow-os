import { spawn } from "node:child_process";
import { stat, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export type MediaKind = "image" | "video" | "audio" | "doc" | "other";

export function kindFromMime(mime: string): MediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  if (mime.startsWith("audio/")) return "audio";
  if (mime === "application/pdf" || mime.includes("word") || mime.includes("document")) return "doc";
  return "other";
}

export function aspectRatioString(w: number, h: number): string {
  const g = gcd(w, h);
  return `${w / g}:${h / g}`;
}
function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

export type ProcessResult = {
  url: string; // possibly rewritten (e.g. .webp)
  kind: MediaKind;
  width?: number;
  height?: number;
  aspectRatio?: string;
  durationSec?: number;
  posterUrl?: string;
  size: number;
  status: "ready" | "processing" | "failed";
};

// Detect ffmpeg once (cached). Video processing is best-effort: if ffmpeg is
// absent we keep the original file and just record what we can.
let ffmpegAvailable: boolean | null = null;
export async function hasFfmpeg(): Promise<boolean> {
  if (ffmpegAvailable !== null) return ffmpegAvailable;
  ffmpegAvailable = await new Promise<boolean>((resolve) => {
    const p = spawn("ffmpeg", ["-version"]);
    p.on("error", () => resolve(false));
    p.on("close", (code) => resolve(code === 0));
  });
  return ffmpegAvailable;
}

const UPLOAD_DIR = () => path.join(process.cwd(), "public", "uploads");

// Compress + probe an image: re-encode to WebP, downscale to a sane cap, make a thumbnail.
export async function processImage(absPath: string, publicUrl: string): Promise<ProcessResult> {
  try {
    const img = sharp(absPath, { failOn: "none" });
    const meta = await img.metadata();
    const base = path.basename(publicUrl, path.extname(publicUrl));
    const webpName = `${base}.webp`;
    const thumbName = `${base}.thumb.webp`;
    const dir = UPLOAD_DIR();

    await img
      .rotate() // respect EXIF orientation
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(dir, webpName));

    await sharp(absPath, { failOn: "none" })
      .rotate()
      .resize({ width: 480, height: 480, fit: "inside", withoutEnlargement: true })
      .webp({ quality: 70 })
      .toFile(path.join(dir, thumbName));

    const out = await stat(path.join(dir, webpName));
    // Drop the original to save storage — the WebP is what we serve.
    if (path.basename(absPath) !== webpName) await unlink(absPath).catch(() => {});
    const w = meta.width ?? undefined;
    const h = meta.height ?? undefined;
    return {
      url: `/uploads/${webpName}`,
      kind: "image",
      width: w,
      height: h,
      aspectRatio: w && h ? aspectRatioString(w, h) : undefined,
      posterUrl: `/uploads/${thumbName}`,
      size: out.size,
      status: "ready",
    };
  } catch {
    const s = await stat(absPath).catch(() => ({ size: 0 }) as { size: number });
    return { url: publicUrl, kind: "image", size: s.size, status: "ready" };
  }
}

// Probe + transcode a video (best-effort). Without ffmpeg we keep the original.
export async function processVideo(absPath: string, publicUrl: string): Promise<ProcessResult> {
  const s = await stat(absPath).catch(() => ({ size: 0 }) as { size: number });
  const base = { url: publicUrl, kind: "video" as const, size: s.size };

  if (!(await hasFfmpeg())) {
    return { ...base, status: "ready" };
  }

  const dir = UPLOAD_DIR();
  const name = path.basename(publicUrl, path.extname(publicUrl));
  const probe = await ffprobe(absPath);
  const posterName = `${name}.poster.webp`;

  // poster frame at ~1s
  await run("ffmpeg", ["-y", "-ss", "1", "-i", absPath, "-frames:v", "1", "-vf", "scale=640:-2", path.join(dir, posterName)]).catch(() => {});

  // transcode to a compressed, web-friendly mp4
  const outName = `${name}.opt.mp4`;
  const transcoded = await run("ffmpeg", [
    "-y", "-i", absPath,
    "-c:v", "libx264", "-preset", "veryfast", "-crf", "28",
    "-vf", "scale='min(1080,iw)':-2",
    "-movflags", "+faststart", "-pix_fmt", "yuv420p",
    "-c:a", "aac", "-b:a", "128k",
    path.join(dir, outName),
  ]).then(() => true).catch(() => false);

  const finalUrl = transcoded ? `/uploads/${outName}` : publicUrl;
  const finalSize = transcoded ? (await stat(path.join(dir, outName)).catch(() => ({ size: s.size }) as { size: number })).size : s.size;
  // Drop the original once we have a compressed rendition.
  if (transcoded) await unlink(absPath).catch(() => {});

  return {
    ...base,
    url: finalUrl,
    size: finalSize,
    width: probe?.width,
    height: probe?.height,
    aspectRatio: probe?.width && probe?.height ? aspectRatioString(probe.width, probe.height) : undefined,
    durationSec: probe?.duration,
    posterUrl: `/uploads/${posterName}`,
    status: "ready",
  };
}

async function ffprobe(absPath: string): Promise<{ width?: number; height?: number; duration?: number } | null> {
  try {
    const out = await run("ffprobe", [
      "-v", "error", "-select_streams", "v:0",
      "-show_entries", "stream=width,height:format=duration",
      "-of", "json", absPath,
    ]);
    const json = JSON.parse(out);
    const stream = json.streams?.[0] ?? {};
    return { width: stream.width, height: stream.height, duration: json.format?.duration ? Number(json.format.duration) : undefined };
  } catch {
    return null;
  }
}

function run(cmd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args);
    let stdout = "";
    let stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", reject);
    p.on("close", (code) => (code === 0 ? resolve(stdout) : reject(new Error(stderr.slice(0, 300)))));
  });
}
