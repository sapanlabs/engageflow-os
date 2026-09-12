import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/data";

// Team members available to add to a group (excludes external CLIENT contacts
// and the current user, who is always added as creator).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const ws = await getWorkspace();
  const users = await db.user.findMany({
    where: { workspaceId: ws.id, role: { not: "CLIENT" }, id: { not: user.id } },
    select: { id: true, name: true, avatarColor: true, role: true },
    orderBy: { name: "asc" },
  });
  return NextResponse.json({ data: users });
}
