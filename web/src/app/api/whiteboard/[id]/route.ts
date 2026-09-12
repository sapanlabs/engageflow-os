import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";

async function allowed(id: string) {
  const el = await db.whiteboardElement.findUnique({
    where: { id },
    include: { project: { select: { clientId: true } } },
  });
  if (!el) return null;
  const ids = await getAccessibleClientIds();
  return ids.includes(el.project.clientId) ? el : null;
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
  for (const k of ["x", "y", "width", "height", "text", "color"]) {
    if (k in body) data[k] = body[k];
  }
  const el = await db.whiteboardElement.update({ where: { id }, data });
  return NextResponse.json({ data: el });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  if (!(await allowed(id))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await db.whiteboardElement.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
