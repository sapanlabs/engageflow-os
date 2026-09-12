import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Liveness + DB connectivity check.
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ status: "ok", db: "connected", time: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { status: "error", db: "disconnected", message: (e as Error).message },
      { status: 503 },
    );
  }
}
