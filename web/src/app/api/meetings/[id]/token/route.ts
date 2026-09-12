import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertMeetingAccess } from "@/lib/meetings";
import { isAppError } from "@/lib/chat";
import { createAccessToken, livekitConfig } from "@/lib/livekit";

// Mint a LiveKit join token for the current user + set the meeting LIVE.
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { user, meeting } = await assertMeetingAccess(id);
    const cfg = livekitConfig();
    if (!cfg.configured) {
      return NextResponse.json({ error: "Calling is not configured", code: "NOT_CONFIGURED" }, { status: 503 });
    }
    if (meeting.status === "ENDED") {
      return NextResponse.json({ error: "This meeting has ended" }, { status: 409 });
    }
    const token = createAccessToken({
      identity: user.id,
      name: user.name,
      room: meeting.roomName,
    });
    if (meeting.status !== "LIVE") {
      await db.meeting.update({ where: { id }, data: { status: "LIVE", startedAt: meeting.startedAt ?? new Date() } });
    }
    return NextResponse.json({ data: { token, url: cfg.url, room: meeting.roomName, identity: user.id } });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
