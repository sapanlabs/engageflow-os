import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";
import { canManageCredentials } from "@/lib/constants";
import { encryptSecret } from "@/lib/crypto";

async function guard(accountId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!canManageCredentials(user.role)) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const account = await db.platformAccount.findUnique({ where: { id: accountId } });
  if (!account) return { error: NextResponse.json({ error: "not found" }, { status: 404 }) };
  const ids = await getAccessibleClientIds();
  if (!ids.includes(account.clientId)) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user, account };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  for (const k of ["platform", "label", "handle", "url", "username", "notes"]) {
    if (k in body) data[k] = body[k] || null;
  }
  // Only touch the secret if the caller explicitly sends one.
  // secret === "" clears it; undefined leaves it unchanged.
  if ("secret" in body) {
    data.secretEnc = body.secret ? encryptSecret(String(body.secret)) : null;
  }
  const updated = await db.platformAccount.update({ where: { id }, data });
  return NextResponse.json({
    data: { id: updated.id, hasSecret: !!updated.secretEnc },
  });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.error) return g.error;
  await db.platformAccount.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
