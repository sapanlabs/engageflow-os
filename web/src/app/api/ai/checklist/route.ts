import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { feedbackChecklist } from "@/lib/ai/service";
import { aiErrorResponse } from "@/lib/ai/http";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    rateLimit(`ai:${user.id}`, 20, 60_000);
  } catch (e) {
    return aiErrorResponse(e);
  }
  const body = await req.json().catch(() => ({}));
  if (!body.contentId) return NextResponse.json({ error: "contentId required" }, { status: 400 });

  const content = await getContent(String(body.contentId));
  if (!content) return NextResponse.json({ error: "not found" }, { status: 404 });

  const comments = content.comments
    .filter((c) => !c.resolved)
    .map((c) => ({ authorName: c.authorName, body: c.body }));
  if (comments.length === 0) {
    return NextResponse.json({ data: { items: [], modelUsed: null } });
  }

  try {
    const result = await feedbackChecklist(comments);
    return NextResponse.json({ data: result });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
