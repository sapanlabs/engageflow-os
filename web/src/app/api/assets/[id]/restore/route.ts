import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";
import { restoreAsset } from "@/lib/archive";
import { handle, ok } from "@/lib/api";
import { Errors } from "@/lib/errors";

// "Request to view": uncompress an archived asset and make it visible again.
export const POST = handle(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) throw Errors.unauthorized();

  const asset = await db.asset.findUnique({ where: { id } });
  if (!asset) throw Errors.notFound();
  if (asset.clientId) {
    const ids = await getAccessibleClientIds();
    if (!ids.includes(asset.clientId)) throw Errors.forbidden();
  }

  if (asset.status === "ready") return ok({ status: "ready", alreadyReady: true });
  const restored = await restoreAsset(id);
  if (!restored) throw new Error("Restore failed");
  return ok({ status: "ready" });
});
