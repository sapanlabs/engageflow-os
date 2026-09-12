import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { listMessages, postMessage, postAssistantMessage, isAppError } from "@/lib/chat";
import { heisenbergReply } from "@/lib/ai/service";
import { AiError } from "@/lib/ai/provider";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const url = new URL(req.url);
  const parentId = url.searchParams.get("parentId");
  const before = url.searchParams.get("before") ?? undefined;
  try {
    const messages = await listMessages(id, {
      parentId: parentId === null ? null : parentId,
      before,
    });
    return NextResponse.json({ data: messages });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.body) return NextResponse.json({ error: "body required" }, { status: 400 });
  try {
    const result = await postMessage(id, String(body.body), body.parentId ?? null);

    // If Heisenberg was tagged, generate a reply. Done inline (single-process
    // local server); the assistant message also fans out over SSE so every
    // open client sees it arrive. Failures degrade to a short helpful note.
    if (result.mentionsHeisenberg) {
      void respondAsHeisenberg(id, result.channel.name, result.question, body.parentId ?? null);
    }

    return NextResponse.json({ data: result.dto }, { status: 201 });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed to post" }, { status: 500 });
  }
}

// Fire-and-forget Heisenberg response. Awaited work is inside; the caller does
// not block on it so the user's own message returns immediately.
async function respondAsHeisenberg(channelId: string, channelName: string, question: string, parentId: string | null) {
  try {
    const recent = await db.message.findMany({
      where: { channelId, parentId: parentId ?? null },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: { authorName: true, body: true },
    });
    const history = recent.reverse().map((m) => ({ author: m.authorName, body: m.body }));
    const { text } = await heisenbergReply({ channelName, question, history });
    await postAssistantMessage(channelId, text, parentId);
  } catch (e) {
    const msg =
      e instanceof AiError && e.code !== "PROVIDER"
        ? "I'm not switched on yet. An admin can enable me in Settings → AI (I use the workspace's own key)."
        : "I hit a snag reaching my model just now. Try me again in a moment.";
    await postAssistantMessage(channelId, msg, parentId).catch(() => {});
  }
}
