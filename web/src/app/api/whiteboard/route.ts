import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const project = await db.project.findUnique({ where: { id: body.projectId }, select: { clientId: true } });
  if (!project) return NextResponse.json({ error: "not found" }, { status: 404 });
  const ids = await getAccessibleClientIds();
  if (!ids.includes(project.clientId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const el = await db.whiteboardElement.create({
    data: {
      projectId: body.projectId,
      kind: body.kind ?? "NOTE",
      x: body.x ?? 60,
      y: body.y ?? 60,
      width: body.width ?? 180,
      height: body.height ?? 120,
      text: body.text ?? "",
      color: body.color ?? "#FFE066",
    },
  });
  return NextResponse.json({ data: el }, { status: 201 });
}
