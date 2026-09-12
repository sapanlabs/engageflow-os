import { NextRequest, NextResponse } from "next/server";
import { endMeeting } from "@/lib/meetings";
import { isAppError } from "@/lib/chat";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const m = await endMeeting(id);
    return NextResponse.json({ data: { id: m.id, status: m.status } });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
