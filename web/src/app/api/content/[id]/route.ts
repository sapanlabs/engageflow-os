import { NextResponse } from "next/server";
import { getContent } from "@/lib/data";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const content = await getContent(id);
  if (!content) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ data: content });
}
