import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createMeeting } from "@/lib/meetings";
import { isAppError } from "@/lib/chat";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  try {
    const meeting = await createMeeting({
      title: body.title ? String(body.title) : undefined,
      channelId: body.channelId ?? null,
      projectId: body.projectId ?? null,
      clientId: body.clientId ?? null,
    });
    return NextResponse.json({ data: { id: meeting.id, roomName: meeting.roomName } }, { status: 201 });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed to create meeting" }, { status: 500 });
  }
}
