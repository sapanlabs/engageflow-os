// Model catalog + deprecation logic.
//
// Model names churn constantly (providers retire ids every few months). This
// catalog is the single place to keep them current. Each entry has a lifecycle
// status so the backend can transparently fall back when a selected model is
// deprecated or retired, instead of failing the user's request.

export type ModelStatus = "active" | "deprecated" | "retired";

export type ModelInfo = {
  id: string;
  label: string;
  status: ModelStatus;
  replacedBy?: string; // where to route if deprecated/retired
  vision?: boolean;
};

export type ProviderId = "GEMINI" | "OPENROUTER";

// Google Gemini (AI Studio / generativelanguage API)
export const GEMINI_MODELS: ModelInfo[] = [
  { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash (fast, cheap)", status: "active", vision: true },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro (higher quality)", status: "active", vision: true },
  { id: "gemini-2.0-flash", label: "Gemini 2.0 Flash", status: "active", vision: true },
  { id: "gemini-1.5-flash", label: "Gemini 1.5 Flash (legacy)", status: "deprecated", replacedBy: "gemini-2.5-flash", vision: true },
  { id: "gemini-1.5-pro", label: "Gemini 1.5 Pro (legacy)", status: "deprecated", replacedBy: "gemini-2.5-pro", vision: true },
  { id: "gemini-pro", label: "Gemini Pro (retired)", status: "retired", replacedBy: "gemini-2.5-flash" },
];

// OpenRouter (OpenAI-compatible gateway; ids are "vendor/model")
export const OPENROUTER_MODELS: ModelInfo[] = [
  { id: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", status: "active", vision: true },
  { id: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", status: "active", vision: true },
  { id: "openai/gpt-4o-mini", label: "GPT-4o mini", status: "active", vision: true },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet", status: "active", vision: true },
  { id: "openai/gpt-4o", label: "GPT-4o", status: "active", vision: true },
];

export const DEFAULT_MODEL: Record<ProviderId, string> = {
  GEMINI: "gemini-2.5-flash",
  OPENROUTER: "google/gemini-2.5-flash",
};

export function modelsFor(provider: ProviderId): ModelInfo[] {
  return provider === "GEMINI" ? GEMINI_MODELS : OPENROUTER_MODELS;
}

export function activeModelsFor(provider: ProviderId): ModelInfo[] {
  return modelsFor(provider).filter((m) => m.status !== "retired");
}

export type ResolvedModel = { id: string; warning?: string };

// Deprecation resolver: given a requested model id, return the id to actually
// use. Retired -> replacement/default. Deprecated -> still used, but warned.
// Unknown -> provider default (protects against typos and removed ids).
export function resolveModel(provider: ProviderId, requested?: string | null): ResolvedModel {
  const list = modelsFor(provider);
  const fallback = DEFAULT_MODEL[provider];
  if (!requested) return { id: fallback };

  const found = list.find((m) => m.id === requested);
  // Unknown id = a live/dynamically-fetched model the static catalog doesn't
  // track. Trust it and pass through (do NOT force the stale default).
  if (!found) return { id: requested };
  if (found.status === "retired") {
    const next = found.replacedBy ?? fallback;
    return { id: next, warning: `Model "${requested}" is retired; using ${next}.` };
  }
  if (found.status === "deprecated") {
    return { id: found.id, warning: `Model "${requested}" is deprecated; consider ${found.replacedBy ?? fallback}.` };
  }
  return { id: found.id };
}

// Parse a provider's "use models/X instead" hint out of an error message so the
// runtime can self-heal when a model is retired mid-flight.
export function suggestedModelFromError(message: string): string | null {
  // Gemini: "...use models/gemini-3.6-flash for..."
  const gem = message.match(/models\/([a-zA-Z0-9.\-:]+)/);
  if (gem) return gem[1];
  return null;
}
