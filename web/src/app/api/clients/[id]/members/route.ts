import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";

// Who can manage a client's team: workspace ADMIN, or a CREATIVE_LEAD member of
// that client.
export async function canManageMembers(userId: string, role: string, clientId: string): Promise<boolean> {
  if (role === "ADMIN") return true;
  const membership = await db.clientMember.findUnique({
    where: { clientId_userId: { clientId, userId } },
  });
  return membership?.role === "CREATIVE_LEAD";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const ids = await getAccessibleClientIds();
  if (!ids.includes(id)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!(await canManageMembers(user.id, user.role, id))) {
    return NextResponse.json({ error: "Only admins and creative leads can manage the team" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  if (!body.userId || !body.role) {
    return NextResponse.json({ error: "userId and role are required" }, { status: 400 });
  }
  // ensure the target user is in the same workspace
  const client = await db.client.findUnique({ where: { id }, select: { workspaceId: true } });
  const target = await db.user.findUnique({ where: { id: String(body.userId) }, select: { workspaceId: true } });
  if (!client || !target || target.workspaceId !== client.workspaceId) {
    return NextResponse.json({ error: "invalid user" }, { status: 400 });
  }

  const member = await db.clientMember.upsert({
    where: { clientId_userId: { clientId: id, userId: String(body.userId) } },
    create: { clientId: id, userId: String(body.userId), role: String(body.role) },
    update: { role: String(body.role) },
    include: { user: true },
  });
  return NextResponse.json({ data: member }, { status: 201 });
}
