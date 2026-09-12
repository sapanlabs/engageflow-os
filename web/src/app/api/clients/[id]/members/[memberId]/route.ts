import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";
import { canManageMembers } from "../route";

async function guard(clientId: string, memberId: string) {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const ids = await getAccessibleClientIds();
  if (!ids.includes(clientId)) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  if (!(await canManageMembers(user.id, user.role, clientId))) {
    return { error: NextResponse.json({ error: "Only admins and creative leads can manage the team" }, { status: 403 }) };
  }
  const member = await db.clientMember.findUnique({ where: { id: memberId } });
  if (!member || member.clientId !== clientId) {
    return { error: NextResponse.json({ error: "not found" }, { status: 404 }) };
  }
  return { user, member };
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  const g = await guard(id, memberId);
  if (g.error) return g.error;
  const body = await req.json().catch(() => ({}));
  if (!body.role) return NextResponse.json({ error: "role required" }, { status: 400 });
  const updated = await db.clientMember.update({
    where: { id: memberId },
    data: { role: String(body.role) },
    include: { user: true },
  });
  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string; memberId: string }> }) {
  const { id, memberId } = await params;
  const g = await guard(id, memberId);
  if (g.error) return g.error;
  await db.clientMember.delete({ where: { id: memberId } });
  return NextResponse.json({ ok: true });
}
