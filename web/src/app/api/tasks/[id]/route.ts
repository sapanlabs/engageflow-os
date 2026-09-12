import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";

async function loadIfAllowed(id: string) {
  const task = await db.task.findUnique({
    where: { id },
    include: { project: { select: { clientId: true } } },
  });
  if (!task) return null;
  const ids = await getAccessibleClientIds();
  return ids.includes(task.project.clientId) ? task : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await loadIfAllowed(id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.status === "string") data.status = body.status;
  if (typeof body.title === "string") data.title = body.title;
  if ("assigneeId" in body) data.assigneeId = body.assigneeId || null;
  const task = await db.task.update({ where: { id }, data, include: { assignee: true } });
  return NextResponse.json({ data: task });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await loadIfAllowed(id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await db.task.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
