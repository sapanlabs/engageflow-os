import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";

async function canAccessProject(projectId: string) {
  const project = await db.project.findUnique({ where: { id: projectId }, select: { clientId: true } });
  if (!project) return false;
  const ids = await getAccessibleClientIds();
  return ids.includes(project.clientId);
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.projectId || !body.title) {
    return NextResponse.json({ error: "projectId and title required" }, { status: 400 });
  }
  if (!(await canAccessProject(body.projectId))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const count = await db.task.count({ where: { projectId: body.projectId, status: body.status ?? "TODO" } });
  const task = await db.task.create({
    data: {
      projectId: body.projectId,
      title: String(body.title),
      status: body.status ?? "TODO",
      position: count,
      assigneeId: body.assigneeId ?? null,
    },
    include: { assignee: true },
  });
  return NextResponse.json({ data: task }, { status: 201 });
}
