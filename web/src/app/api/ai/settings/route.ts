import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspace } from "@/lib/data";
import { encryptSecret } from "@/lib/crypto";
import { modelsFor, type ProviderId } from "@/lib/ai/models";

async function adminGuard() {
  const user = await getCurrentUser();
  if (!user) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  if (user.role !== "ADMIN") return { error: NextResponse.json({ error: "admins only" }, { status: 403 }) };
  return { user };
}

export async function GET() {
  const g = await adminGuard();
  if (g.error) return g.error;
  const ws = await getWorkspace();
  const s = await db.aiSettings.findUnique({ where: { workspaceId: ws.id } });
  const provider = (s?.provider ?? "GEMINI") as ProviderId;
  return NextResponse.json({
    data: {
      enabled: s?.enabled ?? false,
      provider,
      model: s?.model ?? null,
      hasGeminiKey: !!s?.geminiKeyEnc,
      hasOpenrouterKey: !!s?.openrouterKeyEnc,
      featCaption: s?.featCaption ?? true,
      featChecklist: s?.featChecklist ?? true,
      featAnalytics: s?.featAnalytics ?? true,
      featHeisenberg: s?.featHeisenberg ?? true,
    },
    models: {
      GEMINI: modelsFor("GEMINI"),
      OPENROUTER: modelsFor("OPENROUTER"),
    },
  });
}

export async function PATCH(req: NextRequest) {
  const g = await adminGuard();
  if (g.error) return g.error;
  const ws = await getWorkspace();
  const body = await req.json().catch(() => ({}));

  const data: Record<string, unknown> = {};
  if (typeof body.enabled === "boolean") data.enabled = body.enabled;
  if (body.provider === "GEMINI" || body.provider === "OPENROUTER") data.provider = body.provider;
  if ("model" in body) data.model = body.model || null;
  for (const f of ["featCaption", "featChecklist", "featAnalytics", "featHeisenberg"]) {
    if (typeof body[f] === "boolean") data[f] = body[f];
  }
  // Keys: only touch when explicitly provided. "" clears, undefined leaves as-is.
  if ("geminiKey" in body) data.geminiKeyEnc = body.geminiKey ? encryptSecret(String(body.geminiKey)) : null;
  if ("openrouterKey" in body) data.openrouterKeyEnc = body.openrouterKey ? encryptSecret(String(body.openrouterKey)) : null;

  const saved = await db.aiSettings.upsert({
    where: { workspaceId: ws.id },
    create: { workspaceId: ws.id, ...data },
    update: data,
  });
  return NextResponse.json({
    data: {
      enabled: saved.enabled,
      provider: saved.provider,
      model: saved.model,
      hasGeminiKey: !!saved.geminiKeyEnc,
      hasOpenrouterKey: !!saved.openrouterKeyEnc,
      featCaption: saved.featCaption,
      featChecklist: saved.featChecklist,
      featAnalytics: saved.featAnalytics,
      featHeisenberg: saved.featHeisenberg,
    },
  });
}
