import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds, getWorkspace } from "@/lib/data";
import { canManageCredentials } from "@/lib/constants";
import { decryptSecret } from "@/lib/crypto";

// Returns the decrypted secret. Role + client-access gated, and every reveal is
// recorded in the activity log for auditability.
export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!canManageCredentials(user.role)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const account = await db.platformAccount.findUnique({ where: { id }, include: { client: true } });
  if (!account) return NextResponse.json({ error: "not found" }, { status: 404 });
  const ids = await getAccessibleClientIds();
  if (!ids.includes(account.clientId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!account.secretEnc) return NextResponse.json({ data: { secret: null } });

  const ws = await getWorkspace();
  await db.activity.create({
    data: {
      workspaceId: ws.id,
      actorId: user.id,
      actorName: user.name,
      verb: `revealed ${account.platform} credentials for ${account.client.name}`,
      entityType: "credential",
      entityId: account.id,
    },
  });

  return NextResponse.json({ data: { secret: decryptSecret(account.secretEnc) } });
}
