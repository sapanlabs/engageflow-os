import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getAiStatus } from "@/lib/ai/service";

// Lightweight status so client components can show/hide AI affordances.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  return NextResponse.json({ data: await getAiStatus() });
}
