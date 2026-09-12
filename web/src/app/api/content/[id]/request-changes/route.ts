import { NextRequest, NextResponse } from "next/server";
import { requestChanges } from "@/lib/services";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.body) return NextResponse.json({ error: "body (feedback) is required" }, { status: 400 });
  const content = await requestChanges({
    contentId: id,
    body: String(body.body),
    byName: body.byName,
    versionId: body.versionId,
    pinX: body.pinX,
    pinY: body.pinY,
  });
  return NextResponse.json({ data: content });
}
