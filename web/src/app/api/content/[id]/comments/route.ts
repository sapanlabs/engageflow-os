import { NextRequest, NextResponse } from "next/server";
import { addComment } from "@/lib/services";
import { getContent } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const content = await getContent(id);
  if (!content) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: content.comments });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  if (!body.body) return NextResponse.json({ error: "body is required" }, { status: 400 });
  const comment = await addComment({
    contentId: id,
    versionId: body.versionId,
    authorName: body.authorName ?? "Team",
    body: String(body.body),
    pinX: body.pinX,
    pinY: body.pinY,
  });
  return NextResponse.json({ data: comment }, { status: 201 });
}
