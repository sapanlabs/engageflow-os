import { NextRequest, NextResponse } from "next/server";
import { approveContent } from "@/lib/services";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const content = await approveContent(id, body.byName);
  return NextResponse.json({ data: content });
}
