import { NextRequest, NextResponse } from "next/server";
import { addVersion } from "@/lib/services";
import { getUsers } from "@/lib/data";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  // fall back to first editor if authorId not supplied
  let authorId = body.authorId as string | undefined;
  if (!authorId) {
    const users = await getUsers();
    authorId = users.find((u) => u.role === "EDITOR")?.id ?? users[0]?.id;
  }
  if (!authorId) return NextResponse.json({ error: "no author available" }, { status: 400 });
  const version = await addVersion({
    contentId: id,
    mediaUrl: body.mediaUrl ?? `https://picsum.photos/seed/api${Date.now()}/1200/1200`,
    mediaType: body.mediaType,
    width: typeof body.width === "number" ? body.width : undefined,
    height: typeof body.height === "number" ? body.height : undefined,
    posterUrl: body.posterUrl,
    notes: body.notes,
    authorId,
  });
  return NextResponse.json({ data: version }, { status: 201 });
}
