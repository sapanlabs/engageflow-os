import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace, getAccessibleClientIds } from "@/lib/data";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ws = await getWorkspace();
  const body = await req.json().catch(() => ({}));

  if (body.clientId) {
    const ids = await getAccessibleClientIds();
    if (!ids.includes(body.clientId)) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const note = await db.note.create({
    data: {
      workspaceId: ws.id,
      clientId: body.clientId ?? null,
      projectId: body.projectId ?? null,
      parentId: body.parentId ?? null,
      title: body.title ?? "Untitled",
      body: body.body ?? "",
      authorId: user.id,
    },
  });
  return NextResponse.json({ data: note }, { status: 201 });
}
