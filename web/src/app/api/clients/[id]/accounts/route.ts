import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";
import { canManageCredentials } from "@/lib/constants";
import { encryptSecret } from "@/lib/crypto";

async function guard(clientId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (!canManageCredentials(user.role)) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const ids = await getAccessibleClientIds();
  if (!ids.includes(clientId)) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  return { user };
}

function mask(a: { id: string; platform: string; label: string | null; handle: string | null; url: string | null; username: string | null; secretEnc: string | null; notes: string | null; updatedAt: Date }) {
  return {
    id: a.id,
    platform: a.platform,
    label: a.label,
    handle: a.handle,
    url: a.url,
    username: a.username,
    hasSecret: !!a.secretEnc,
    notes: a.notes,
    updatedAt: a.updatedAt,
  };
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.error) return g.error;
  const accounts = await db.platformAccount.findMany({ where: { clientId: id }, orderBy: { createdAt: "asc" } });
  return NextResponse.json({ data: accounts.map(mask) });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const g = await guard(id);
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  if (!body.platform) return NextResponse.json({ error: "platform required" }, { status: 400 });
  const account = await db.platformAccount.create({
    data: {
      clientId: id,
      platform: String(body.platform),
      label: body.label || null,
      handle: body.handle || null,
      url: body.url || null,
      username: body.username || null,
      secretEnc: body.secret ? encryptSecret(String(body.secret)) : null,
      notes: body.notes || null,
    },
  });
  return NextResponse.json({ data: mask(account) }, { status: 201 });
}
