import { db } from "@/lib/db";
import { getWorkspace } from "@/lib/data";
import { decryptSecret } from "@/lib/crypto";
import { generateText, AiError } from "@/lib/ai/provider";
import { DEFAULT_MODEL, type ProviderId } from "@/lib/ai/models";
import { PLATFORM_LABELS } from "@/lib/constants";

export type Feature = "featCaption" | "featChecklist" | "featAnalytics" | "featHeisenberg";

export async function getSettings(workspaceId?: string) {
  const ws = workspaceId ? { id: workspaceId } : await getWorkspace();
  const row = await db.aiSettings.findUnique({ where: { workspaceId: ws.id } });
  return row;
}

// Public status for the UI (no secrets).
export async function getAiStatus() {
  const s = await getSettings();
  const provider = (s?.provider ?? "GEMINI") as ProviderId;
  const hasKey = provider === "GEMINI" ? !!s?.geminiKeyEnc : !!s?.openrouterKeyEnc;
  const on = !!s?.enabled && hasKey;
  return {
    enabled: !!s?.enabled,
    configured: hasKey,
    provider,
    model: s?.model ?? DEFAULT_MODEL[provider],
    features: {
      caption: on && (s?.featCaption ?? true),
      checklist: on && (s?.featChecklist ?? true),
      analytics: on && (s?.featAnalytics ?? true),
      heisenberg: on && (s?.featHeisenberg ?? true),
    },
  };
}

// Resolve an executable config or throw a typed AiError.
async function requireConfig(feature: Feature) {
  const s = await getSettings();
  if (!s || !s.enabled) throw new AiError("AI is turned off for this workspace", "DISABLED");
  if (!s[feature]) throw new AiError("This AI feature is turned off", "FEATURE_OFF");
  const provider = s.provider as ProviderId;
  const enc = provider === "GEMINI" ? s.geminiKeyEnc : s.openrouterKeyEnc;
  if (!enc) throw new AiError(`No API key set for ${provider}`, "NO_KEY");
  return { provider, apiKey: decryptSecret(enc), model: s.model };
}

// --- Feature 1: draft captions (primary + platform variants) ---
export async function draftCaptions(input: {
  title: string;
  platform: string;
  style?: string;
  brandVoice?: string;
  mediaUrl?: string;
}) {
  const cfg = await requireConfig("featCaption");
  const system = [
    "You are a senior social media copywriter for a creative studio.",
    "Write scroll-stopping, on-brand captions. Be concise and natural.",
    "Never use em dashes. Avoid hype words like 'elevate', 'unleash', 'seamless'.",
    input.brandVoice ? `Brand voice: ${input.brandVoice}` : "",
    "Return STRICT JSON: {\"primary\": string, \"variants\": {\"platform\": string, \"caption\": string}[], \"hashtags\": string[]}.",
  ].filter(Boolean).join("\n");

  const prompt = [
    `Content title/idea: ${input.title}`,
    `Primary platform: ${PLATFORM_LABELS[input.platform] ?? input.platform}`,
    input.style ? `Style: ${input.style}` : "",
    "Write a primary caption for the primary platform, then 2 short variants tuned for other platforms (e.g. LinkedIn more professional, X shorter). Include up to 6 relevant hashtags.",
  ].filter(Boolean).join("\n");

  const { text, modelUsed, warning } = await generateText({
    ...cfg, system, prompt, imageUrl: input.mediaUrl, json: true,
  });
  const parsed = safeJson(text);
  return {
    primary: parsed?.primary ?? text.trim(),
    variants: Array.isArray(parsed?.variants) ? parsed.variants : [],
    hashtags: Array.isArray(parsed?.hashtags) ? parsed.hashtags : [],
    modelUsed,
    warning,
  };
}

// --- Feature 2: turn client feedback into an editor checklist ---
export async function feedbackChecklist(comments: { authorName: string; body: string }[]) {
  const cfg = await requireConfig("featChecklist");
  const system = [
    "You convert client review comments into a clear, deduplicated action checklist for an editor.",
    "Merge duplicates, drop pleasantries, keep each item short and imperative.",
    "Never use em dashes.",
    "Return STRICT JSON: {\"items\": string[]}.",
  ].join("\n");
  const prompt =
    "Client comments:\n" +
    comments.map((c, i) => `${i + 1}. ${c.authorName}: ${c.body}`).join("\n") +
    "\n\nProduce the checklist.";
  const { text, modelUsed, warning } = await generateText({ ...cfg, system, prompt, json: true });
  const parsed = safeJson(text);
  const items: string[] = Array.isArray(parsed?.items)
    ? parsed.items
    : text.split("\n").map((l) => l.replace(/^[-*\d.\s]+/, "").trim()).filter(Boolean);
  return { items, modelUsed, warning };
}

// --- Feature 3: plain-language analytics summary ---
export async function analyticsSummary(stats: Record<string, unknown>) {
  const cfg = await requireConfig("featAnalytics");
  const system = [
    "You are a social media analyst. Summarize the numbers in plain language for a client.",
    "3-4 short sentences: what happened, what stood out, one suggestion. No jargon, no em dashes.",
  ].join("\n");
  const prompt = `Here is this workspace's content data as JSON:\n${JSON.stringify(stats)}\n\nWrite the summary.`;
  const { text, modelUsed, warning } = await generateText({ ...cfg, system, prompt });
  return { summary: text.trim(), modelUsed, warning };
}

// --- Feature 4: Heisenberg — the AI teammate in chat ---
// Replies to an @heisenberg mention using recent channel context. Kept concise
// and grounded; it's a teammate, not a chatbot.
export async function heisenbergReply(input: {
  channelName: string;
  question: string;
  history: { author: string; body: string }[];
}) {
  const cfg = await requireConfig("featHeisenberg");
  const system = [
    "You are Heisenberg, an AI teammate inside EngageFlow, a platform for creative studios.",
    "You work alongside the team in chat like a knowledgeable colleague: concise, direct, useful.",
    "You help with campaign ideas, captions, content strategy, summarizing threads, drafting replies, and answering questions.",
    "Keep replies short and skimmable (a few sentences or tight bullets). Never use em dashes. Avoid hype words.",
    "If asked to summarize the conversation, produce a crisp recap. If you lack context, say what you'd need.",
  ].join("\n");
  const transcript = input.history
    .slice(-20)
    .map((h) => `${h.author}: ${h.body}`)
    .join("\n");
  const prompt = [
    `Channel: #${input.channelName}`,
    transcript ? `Recent conversation:\n${transcript}` : "",
    `\nYou were mentioned. Respond to this: ${input.question}`,
  ]
    .filter(Boolean)
    .join("\n");
  const { text, modelUsed, warning } = await generateText({ ...cfg, system, prompt });
  return { text: text.trim(), modelUsed, warning };
}

// --- Feature 4b: Meeting minutes (MoM) from a call transcript ---
// Turns a raw transcript into structured minutes: summary, decisions, action
// items, and follow-ups. Reuses the Heisenberg feature toggle.
export async function meetingMinutes(input: { title: string; transcript: string }) {
  const cfg = await requireConfig("featHeisenberg");
  const system = [
    "You are Heisenberg, taking minutes for a creative-studio meeting.",
    "From the transcript, produce clean, professional minutes in Markdown.",
    "Use these sections exactly: '## Summary', '## Key Decisions', '## Action Items', '## Follow-ups'.",
    "Action items should name the owner when the transcript makes it clear. Be concise. Never use em dashes.",
    "If the transcript is too thin to fill a section, write 'None noted.' under it.",
  ].join("\n");
  const prompt = `Meeting: ${input.title}\n\nTranscript:\n${input.transcript.slice(0, 24000)}\n\nWrite the minutes.`;
  const { text, modelUsed, warning } = await generateText({ ...cfg, system, prompt });
  return { minutes: text.trim(), modelUsed, warning };
}

function safeJson(text: string): any {
  try {
    return JSON.parse(text);
  } catch {
    const m = text.match(/\{[\s\S]*\}/);
    if (m) { try { return JSON.parse(m[0]); } catch { return null; } }
    return null;
  }
}
