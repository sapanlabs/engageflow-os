import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getContent } from "@/lib/data";
import { draftCaptions } from "@/lib/ai/service";
import { aiErrorResponse } from "@/lib/ai/http";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    rateLimit(`ai:${user.id}`, 20, 60_000); // 20 AI calls/min/user
  } catch (e) {
    return aiErrorResponse(e);
  }
  const body = await req.json().catch(() => ({}));

  let title = body.title as string | undefined;
  let platform = body.platform as string | undefined;
  let style = body.style as string | undefined;
  let brandVoice: string | undefined;
  let mediaUrl: string | undefined;

  // If tied to a content item, pull real context (RBAC-checked) for grounding.
  if (body.contentId) {
    const content = await getContent(String(body.contentId));
    if (!content) return NextResponse.json({ error: "not found" }, { status: 404 });
    title = title ?? content.title;
    platform = platform ?? content.platform;
    style = style ?? content.style;
    mediaUrl = content.versions[0]?.mediaUrl;
    const client = content.project.client;
    brandVoice = [client.name, client.industry].filter(Boolean).join(", ");
  }

  if (!title || !platform) {
    return NextResponse.json({ error: "title and platform are required" }, { status: 400 });
  }

  try {
    const result = await draftCaptions({ title, platform, style, brandVoice, mediaUrl });
    return NextResponse.json({ data: result });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
