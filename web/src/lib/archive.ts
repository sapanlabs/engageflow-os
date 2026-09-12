import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, unlink, stat } from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createGzip, createGunzip } from "node:zlib";
import path from "node:path";
import { db } from "@/lib/db";

// Media that hasn't been touched in this many days gets archived (packed off the
// hot path) to save storage. Restored on request. Lossless: we keep the exact
// bytes gzip-packed, so restore returns the original quality.
export const ARCHIVE_AFTER_DAYS = 7;

const PUBLIC = () => path.join(process.cwd(), "public");
const ARCHIVE_DIR = () => path.join(process.cwd(), "storage", "archive");

function localPathForUrl(url: string): string | null {
  if (!url?.startsWith("/uploads/")) return null; // only local uploads are managed
  return path.join(PUBLIC(), url.replace(/^\//, ""));
}

// Archive one asset: gzip its served file into storage/archive and remove the
// hot file. The poster/thumbnail is kept so lists still render a placeholder.
export async function archiveAsset(assetId: string): Promise<boolean> {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "ready") return false;
  const src = localPathForUrl(asset.url);
  if (!src) return false;
  try {
    await stat(src);
  } catch {
    return false; // file already gone
  }

  await mkdir(ARCHIVE_DIR(), { recursive: true });
  const archivePath = path.join(ARCHIVE_DIR(), `${asset.id}${path.extname(asset.url)}.gz`);

  await pipeline(createReadStream(src), createGzip({ level: 9 }), createWriteStream(archivePath));
  await unlink(src).catch(() => {});

  await db.asset.update({
    where: { id: asset.id },
    data: { status: "archived", archivedAt: new Date(), archivePath },
  });
  return true;
}

// Restore one asset: gunzip back to the hot path and mark ready + touch access.
export async function restoreAsset(assetId: string): Promise<boolean> {
  const asset = await db.asset.findUnique({ where: { id: assetId } });
  if (!asset || asset.status !== "archived" || !asset.archivePath) return false;

  const dest = localPathForUrl(asset.url);
  if (!dest) return false;

  await db.asset.update({ where: { id: asset.id }, data: { status: "restoring" } });
  try {
    await mkdir(path.dirname(dest), { recursive: true });
    await pipeline(createReadStream(asset.archivePath), createGunzip(), createWriteStream(dest));
    await unlink(asset.archivePath).catch(() => {});
    await db.asset.update({
      where: { id: asset.id },
      data: { status: "ready", archivedAt: null, archivePath: null, lastAccessedAt: new Date() },
    });
    return true;
  } catch {
    // roll back to archived so it can be retried
    await db.asset.update({ where: { id: asset.id }, data: { status: "archived" } });
    return false;
  }
}

// Sweep: archive every ready asset untouched for > ARCHIVE_AFTER_DAYS.
// `days` override is for testing.
export async function archiveStaleAssets(days = ARCHIVE_AFTER_DAYS): Promise<number> {
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const stale = await db.asset.findMany({
    where: {
      status: "ready",
      url: { startsWith: "/uploads/" },
      OR: [
        { lastAccessedAt: { lt: cutoff } },
        { lastAccessedAt: null, createdAt: { lt: cutoff } },
      ],
    },
    select: { id: true },
    take: 200,
  });
  let count = 0;
  for (const a of stale) if (await archiveAsset(a.id)) count++;
  return count;
}

// Mark an asset as accessed (resets its archive clock).
export async function touchAsset(assetId: string) {
  await db.asset.update({ where: { id: assetId }, data: { lastAccessedAt: new Date() } }).catch(() => {});
}
