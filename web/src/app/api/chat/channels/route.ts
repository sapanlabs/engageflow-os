import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getChannelsForUser, createChannel, ensureDefaultChannels, isAppError } from "@/lib/chat";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  await ensureDefaultChannels();
  return NextResponse.json({ data: await getChannelsForUser() });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    const channel = await createChannel({
      name: String(body.name),
      topic: body.topic ? String(body.topic) : undefined,
      isPrivate: !!body.isPrivate,
      clientId: body.clientId ?? null,
      projectId: body.projectId ?? null,
      memberIds: Array.isArray(body.memberIds) ? body.memberIds : [],
    });
    return NextResponse.json({ data: { id: channel.id, name: channel.name } }, { status: 201 });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed to create channel" }, { status: 500 });
  }
}
