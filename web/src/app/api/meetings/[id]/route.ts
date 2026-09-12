import { NextRequest, NextResponse } from "next/server";
import { getMeeting } from "@/lib/meetings";
import { isAppError } from "@/lib/chat";
import { livekitConfigured } from "@/lib/livekit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { meeting, transcript } = await getMeeting(id);
    return NextResponse.json({
      data: {
        id: meeting.id,
        title: meeting.title,
        status: meeting.status,
        roomName: meeting.roomName,
        channelId: meeting.channelId,
        projectId: meeting.projectId,
        clientId: meeting.clientId,
        createdByName: meeting.createdByName,
        startedAt: meeting.startedAt,
        endedAt: meeting.endedAt,
        transcript,
        minutes: meeting.minutes,
        callConfigured: livekitConfigured(),
      },
    });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
