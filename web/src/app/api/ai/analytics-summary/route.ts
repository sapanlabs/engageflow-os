import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getAccessibleClientIds } from "@/lib/data";
import { analyticsSummary } from "@/lib/ai/service";
import { aiErrorResponse } from "@/lib/ai/http";
import { rateLimit } from "@/lib/rate-limit";
import { CONTENT_STATUS_LABELS, PLATFORM_LABELS } from "@/lib/constants";

export async function POST() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    rateLimit(`ai:${user.id}`, 20, 60_000);
  } catch (e) {
    return aiErrorResponse(e);
  }

  const clientIds = await getAccessibleClientIds();
  const content = await db.content.findMany({
    where: { project: { clientId: { in: clientIds } } },
    select: { status: true, platform: true },
  });

  const byStatus: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};
  for (const c of content) {
    byStatus[CONTENT_STATUS_LABELS[c.status] ?? c.status] = (byStatus[CONTENT_STATUS_LABELS[c.status] ?? c.status] ?? 0) + 1;
    byPlatform[PLATFORM_LABELS[c.platform] ?? c.platform] = (byPlatform[PLATFORM_LABELS[c.platform] ?? c.platform] ?? 0) + 1;
  }
  const stats = { totalContent: content.length, byStatus, byPlatform };

  try {
    const result = await analyticsSummary(stats);
    return NextResponse.json({ data: result });
  } catch (e) {
    return aiErrorResponse(e);
  }
}
