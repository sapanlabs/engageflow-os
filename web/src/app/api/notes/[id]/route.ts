import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";

async function allowed(id: string) {
  const note = await db.note.findUnique({ where: { id } });
  if (!note) return null;
  if (!note.clientId) return note; // workspace-level note
  const ids = await getAccessibleClientIds();
  return ids.includes(note.clientId) ? note : null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await allowed(id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  const data: Record<string, unknown> = {};
  if (typeof body.title === "string") data.title = body.title;
  if (typeof body.body === "string") data.body = body.body;
  const note = await db.note.update({ where: { id }, data });
  return NextResponse.json({ data: note });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await allowed(id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await db.note.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
