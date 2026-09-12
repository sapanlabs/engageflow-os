import { NextRequest, NextResponse } from "next/server";
import { createWriteStream } from "node:fs";
import { mkdir, unlink, stat } from "node:fs/promises";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { createHash, randomBytes } from "node:crypto";
import path from "node:path";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace, assertClientAccess } from "@/lib/data";
import { handle, ok } from "@/lib/api";
import { Errors } from "@/lib/errors";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { kindFromMime, processImage, processVideo } from "@/lib/media";

export const runtime = "nodejs";
// Allow large uploads to stream through this route.
export const maxDuration = 300;

const MAX_BYTES = 2 * 1024 * 1024 * 1024; // 2 GB

// Broad allowlist for a creative studio. Block only obviously executable types.
const BLOCKED = /(x-msdownload|x-msdos-program|x-sh|x-executable|x-mach-binary|vnd.microsoft.portable-executable)/i;
function allowed(mime: string): boolean {
  if (!mime) return true; // many design files report octet-stream
  if (BLOCKED.test(mime)) return false;
  return (
    mime.startsWith("image/") ||
    mime.startsWith("video/") ||
    mime.startsWith("audio/") ||
    mime.startsWith("application/") ||
    mime.startsWith("font/") ||
    mime === "text/plain"
  );
}

function extFromName(name: string, mime: string): string {
  const e = path.extname(name);
  if (e) return e;
  const m: Record<string, string> = { "image/png": ".png", "image/jpeg": ".jpg", "video/mp4": ".mp4", "application/pdf": ".pdf" };
  return m[mime] ?? "";
}

// Streaming upload: client sends the raw file as the request body.
//   POST /api/upload?projectId=..&clientId=..
//   headers: content-type: <mime>, x-filename: <name>
export const POST = handle(async (req: NextRequest) => {
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();
  rateLimit(`upload:${clientIp(req)}`, 30, 60_000); // 30 uploads/min/IP

  const projectId = req.nextUrl.searchParams.get("projectId") || undefined;
  const clientId = req.nextUrl.searchParams.get("clientId") || undefined;
  const fileName = decodeURIComponent(req.headers.get("x-filename") || "file");
  const mime = req.headers.get("content-type") || "application/octet-stream";

  if (!allowed(mime)) throw Errors.unsupported(`Unsupported type: ${mime}`);
  if (clientId) await assertClientAccess(clientId);
  if (!req.body) throw Errors.badRequest("Missing file body");

  const declared = Number(req.headers.get("content-length") || 0);
  if (declared && declared > MAX_BYTES) throw Errors.tooLarge("File exceeds 2GB limit");

  const ws = await getWorkspace();
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });

  const ext = extFromName(fileName, mime);
  const safeBase = path.basename(fileName, ext).replace(/[^a-z0-9-_]+/gi, "-").slice(0, 40) || "file";
  const storedName = `${safeBase}-${randomBytes(6).toString("hex")}${ext}`;
  const absPath = path.join(dir, storedName);

  // Stream body -> disk while enforcing the cap and hashing for dedupe.
  const hash = createHash("sha256");
  let bytes = 0;
  const source = Readable.fromWeb(req.body as unknown as import("stream/web").ReadableStream);
  const sink = createWriteStream(absPath);
  source.on("data", (chunk: Buffer) => {
    bytes += chunk.length;
    hash.update(chunk);
    if (bytes > MAX_BYTES) source.destroy(new Error("TOO_LARGE"));
  });

  try {
    await pipeline(source, sink);
  } catch (e) {
    await unlink(absPath).catch(() => {});
    if ((e as Error).message === "TOO_LARGE") throw Errors.tooLarge("File exceeds 2GB limit");
    throw e;
  }

  const sha256 = hash.digest("hex");
  const url = `/uploads/${storedName}`;
  const kind = kindFromMime(mime);

  // Dedupe: if we already stored this exact content, reuse it.
  const dup = await db.asset.findFirst({ where: { workspaceId: ws.id, sha256 } });
  if (dup) {
    await unlink(absPath).catch(() => {});
    return ok({ ...dup, deduped: true }, 200);
  }

  // Compress / probe. Images inline; video best-effort (skips cleanly w/o ffmpeg).
  const processed =
    kind === "image" ? await processImage(absPath, url) :
    kind === "video" ? await processVideo(absPath, url) :
    { url, kind, size: (await stat(absPath)).size, status: "ready" as const };

  const asset = await db.asset.create({
    data: {
      workspaceId: ws.id,
      clientId,
      projectId,
      name: fileName,
      url: processed.url,
      mimeType: mime,
      size: processed.size ?? bytes,
      uploaderId: user.id,
      kind: processed.kind,
      status: processed.status,
      width: processed.width,
      height: processed.height,
      aspectRatio: processed.aspectRatio,
      durationSec: processed.durationSec,
      posterUrl: processed.posterUrl,
      sha256,
    },
  });

  return ok(asset, 201);
});
