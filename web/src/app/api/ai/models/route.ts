import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/data";
import { decryptSecret } from "@/lib/crypto";
import { listModels } from "@/lib/ai/provider";
import { modelsFor, type ProviderId } from "@/lib/ai/models";

// Returns models the workspace's key can actually use, fetched LIVE from the
// provider. Falls back to the static catalog if there's no key or the fetch
// fails. Admin only (reads/uses the decrypted key).
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (user.role !== "ADMIN") return NextResponse.json({ error: "admins only" }, { status: 403 });

  const provider = (req.nextUrl.searchParams.get("provider") ?? "GEMINI") as ProviderId;
  const ws = await getWorkspace();
  const s = await db.aiSettings.findUnique({ where: { workspaceId: ws.id } });
  const enc = provider === "GEMINI" ? s?.geminiKeyEnc : s?.openrouterKeyEnc;

  let source: "live" | "catalog" = "catalog";
  let models = modelsFor(provider).filter((m) => m.status !== "retired").map((m) => ({ id: m.id, label: m.label }));

  if (enc) {
    const live = await listModels(provider, decryptSecret(enc));
    if (live.length > 0) {
      source = "live";
      models = live.map((m) => ({ id: m.id, label: m.label }));
    }
  }

  return NextResponse.json({ data: { source, models } });
}
