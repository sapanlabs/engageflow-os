import { NextRequest, NextResponse } from "next/server";
import { getContent } from "@/lib/data";
import { scheduleContent } from "@/lib/services";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  // getContent enforces RBAC (returns null if not accessible)
  const content = await getContent(id);
  if (!content) return NextResponse.json({ error: "not found" }, { status: 404 });
  const body = await req.json().catch(() => ({}));
  if (!body.scheduledAt) return NextResponse.json({ error: "scheduledAt required" }, { status: 400 });
  const updated = await scheduleContent(id, new Date(body.scheduledAt));
  return NextResponse.json({ data: updated });
}
