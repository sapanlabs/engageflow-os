import { NextRequest, NextResponse } from "next/server";
import { getClients } from "@/lib/data";
import { createClient } from "@/lib/services";

export async function GET() {
  const clients = await getClients();
  return NextResponse.json({ data: clients });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }
  try {
    const client = await createClient({
      name: String(body.name),
      industry: body.industry,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
    });
    return NextResponse.json({ data: client }, { status: 201 });
  } catch (e) {
    if ((e as Error).name === "LimitError") {
      return NextResponse.json({ error: (e as Error).message }, { status: 402 });
    }
    throw e;
  }
}
