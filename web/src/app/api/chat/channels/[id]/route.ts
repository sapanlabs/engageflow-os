import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assertChannelAccess, isAppError } from "@/lib/chat";
import { HEISENBERG } from "@/lib/constants";
import { getAiStatus } from "@/lib/ai/service";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const { channel } = await assertChannelAccess(id);
    const memberRows = await db.channelMember.findMany({ where: { channelId: id } });
    const userIds = memberRows.map((m) => m.userId);
    const users = await db.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, avatarColor: true, role: true },
    });
    const ai = await getAiStatus();

    // Heisenberg is a virtual member of every channel (shown only when enabled).
    const members = users.map((u) => ({ id: u.id, name: u.name, color: u.avatarColor, role: u.role, kind: "USER" as const }));
    if (ai.features.heisenberg) {
      members.unshift({ id: HEISENBERG.id, name: HEISENBERG.name, color: HEISENBERG.color, role: HEISENBERG.role, kind: "ASSISTANT" as never });
    }

    return NextResponse.json({
      data: {
        id: channel.id,
        name: channel.name,
        topic: channel.topic,
        kind: channel.kind,
        isPrivate: channel.isPrivate,
        clientId: channel.clientId,
        projectId: channel.projectId,
        members,
        heisenbergEnabled: ai.features.heisenberg,
      },
    });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
