import { NextRequest, NextResponse } from "next/server";
import { markRead, isAppError } from "@/lib/chat";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await markRead(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
