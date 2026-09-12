import { NextRequest, NextResponse } from "next/server";
import { appendTranscript, type TranscriptLine } from "@/lib/meetings";
import { isAppError } from "@/lib/chat";

// Append transcript lines. Called by the in-browser captioner or an external
// note-taker agent (LiveKit Agents worker) as speech is transcribed.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const raw = Array.isArray(body.lines) ? body.lines : body.text ? [{ speaker: body.speaker ?? "Speaker", text: body.text, ts: Date.now() }] : [];
  const lines: TranscriptLine[] = raw
    .filter((l: unknown): l is TranscriptLine => !!l && typeof (l as TranscriptLine).text === "string")
    .map((l: TranscriptLine) => ({ speaker: String(l.speaker || "Speaker"), text: String(l.text), ts: Number(l.ts) || Date.now() }));
  if (!lines.length) return NextResponse.json({ error: "no transcript lines" }, { status: 400 });
  try {
    const merged = await appendTranscript(id, lines);
    return NextResponse.json({ data: { count: merged.length } });
  } catch (e) {
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
