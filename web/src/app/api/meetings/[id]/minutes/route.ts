import { NextRequest, NextResponse } from "next/server";
import { generateMinutes } from "@/lib/meetings";
import { isAppError } from "@/lib/chat";
import { AiError } from "@/lib/ai/provider";

// Generate minutes-of-meeting from the transcript via Heisenberg (reuses the
// workspace AI config + the featHeisenberg toggle).
export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const minutes = await generateMinutes(id);
    return NextResponse.json({ data: { minutes } });
  } catch (e) {
    if (e instanceof AiError) {
      const status = e.code === "DISABLED" || e.code === "FEATURE_OFF" ? 403 : e.code === "NO_KEY" ? 400 : 502;
      return NextResponse.json({ error: e.message, code: e.code }, { status });
    }
    if (isAppError(e)) return NextResponse.json({ error: e.message }, { status: e.status });
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}
