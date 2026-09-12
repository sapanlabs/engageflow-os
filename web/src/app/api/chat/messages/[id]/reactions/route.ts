import { NextRequest, NextResponse } from "next/server";
import { toggleReaction, isAppError } from "@/lib/chat";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.emoji) return NextResponse.json({ error: "emoji required" }, { status: 400 });
  try {
    const dto = await toggleReaction(id, String(body.emoji));
    return NextResponse.json({ data: dto });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
