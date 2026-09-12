import { DEFAULT_MODEL, resolveModel, suggestedModelFromError, type ProviderId } from "@/lib/ai/models";

export type LiveModel = { id: string; label: string; vision?: boolean };

// Fetch the models a given key can actually use, live from the provider.
// Falls back to an empty list on failure so callers can use the static catalog.
export async function listModels(provider: ProviderId, apiKey: string): Promise<LiveModel[]> {
  if (!apiKey) return [];
  try {
    return provider === "GEMINI" ? await listGemini(apiKey) : await listOpenRouter(apiKey);
  } catch {
    return [];
  }
}

async function listGemini(apiKey: string): Promise<LiveModel[]> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}&pageSize=1000`,
  );
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  const models: LiveModel[] = (json.models ?? [])
    .filter((m: { supportedGenerationMethods?: string[] }) =>
      (m.supportedGenerationMethods ?? []).includes("generateContent"),
    )
    .map((m: { name: string; displayName?: string }) => {
      const id = m.name.replace(/^models\//, "");
      return { id, label: m.displayName || id, vision: /vision|flash|pro|gemini-\d/.test(id) };
    })
    // newest-looking first
    .sort((a: LiveModel, b: LiveModel) => b.id.localeCompare(a.id));
  return models;
}

async function listOpenRouter(apiKey: string): Promise<LiveModel[]> {
  const res = await fetch("https://openrouter.ai/api/v1/models", {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) throw new Error(String(res.status));
  const json = await res.json();
  return (json.data ?? []).map((m: { id: string; name?: string; architecture?: { modality?: string } }) => ({
    id: m.id,
    label: m.name || m.id,
    vision: (m.architecture?.modality ?? "").includes("image"),
  }));
}

export class AiError extends Error {
  constructor(message: string, public code: "DISABLED" | "NO_KEY" | "PROVIDER" | "FEATURE_OFF" = "PROVIDER") {
    super(message);
    this.name = "AiError";
  }
}

export type GenerateInput = {
  provider: ProviderId;
  apiKey: string;
  model?: string | null;
  system: string;
  prompt: string;
  imageUrl?: string; // optional vision input
  json?: boolean; // request JSON-shaped output
};

// Provider-agnostic text generation. Resolves model deprecation up front, and
// if the provider reports the model is missing/invalid at runtime, retries once
// with the provider default so a retired id never breaks a user request.
export async function generateText(input: GenerateInput): Promise<{ text: string; modelUsed: string; warning?: string }> {
  if (!input.apiKey) throw new AiError("No API key configured", "NO_KEY");
  const resolved = resolveModel(input.provider, input.model);
  try {
    const text = await callProvider(input, resolved.id);
    return { text, modelUsed: resolved.id, warning: resolved.warning };
  } catch (e) {
    const rawMsg = (e as Error).message;
    const msg = rawMsg.toLowerCase();
    const looksLikeModelIssue =
      msg.includes("model") &&
      (msg.includes("not found") || msg.includes("not exist") || msg.includes("no longer available") ||
        msg.includes("unsupported") || msg.includes("deprecat") || msg.includes("404") || msg.includes("400"));

    if (looksLikeModelIssue) {
      // Prefer the exact replacement the provider names in its error, then a
      // live model, then the static default.
      const suggested = suggestedModelFromError(rawMsg);
      const candidates = [suggested, await firstLiveModel(input), DEFAULT_MODEL[input.provider]]
        .filter((m): m is string => !!m && m !== resolved.id);
      for (const candidate of candidates) {
        try {
          const text = await callProvider(input, candidate);
          return { text, modelUsed: candidate, warning: `Model "${resolved.id}" unavailable; used ${candidate}.` };
        } catch {
          // try next candidate
        }
      }
    }
    throw new AiError(`AI provider error: ${rawMsg}`, "PROVIDER");
  }
}

async function callProvider(input: GenerateInput, modelId: string): Promise<string> {
  return input.provider === "GEMINI"
    ? callGemini(input, modelId)
    : callOpenRouter(input, modelId);
}

// Best available live model for the key (prefers a flash-tier for cost/speed).
async function firstLiveModel(input: GenerateInput): Promise<string | null> {
  const live = await listModels(input.provider, input.apiKey);
  if (live.length === 0) return null;
  const flash = live.find((m) => /flash|mini|haiku/i.test(m.id));
  return (flash ?? live[0]).id;
}

// --- Google Gemini (AI Studio) ---
async function callGemini(input: GenerateInput, modelId: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${encodeURIComponent(input.apiKey)}`;
  const parts: Record<string, unknown>[] = [{ text: input.prompt }];
  if (input.imageUrl) {
    const img = await fetchImageAsBase64(input.imageUrl);
    if (img) parts.push({ inline_data: { mime_type: img.mime, data: img.base64 } });
  }
  const body = {
    system_instruction: { parts: [{ text: input.system }] },
    contents: [{ role: "user", parts }],
    generationConfig: {
      temperature: 0.7,
      ...(input.json ? { responseMimeType: "application/json" } : {}),
    },
  };
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("") ?? "";
  if (!text) throw new Error("empty response");
  return text;
}

// --- OpenRouter (OpenAI-compatible) ---
async function callOpenRouter(input: GenerateInput, modelId: string): Promise<string> {
  const content: unknown = input.imageUrl
    ? [{ type: "text", text: input.prompt }, { type: "image_url", image_url: { url: input.imageUrl } }]
    : input.prompt;
  const body = {
    model: modelId,
    messages: [
      { role: "system", content: input.system },
      { role: "user", content },
    ],
    temperature: 0.7,
    ...(input.json ? { response_format: { type: "json_object" } } : {}),
  };
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
      "X-Title": "EngageFlow",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "";
  if (!text) throw new Error("empty response");
  return text;
}

async function fetchImageAsBase64(url: string): Promise<{ mime: string; base64: string } | null> {
  try {
    const abs = url.startsWith("http") ? url : `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}${url}`;
    const res = await fetch(abs);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    return { mime, base64: buf.toString("base64") };
  } catch {
    return null;
  }
}
