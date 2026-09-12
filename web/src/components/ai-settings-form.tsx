"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

type Settings = {
  enabled: boolean;
  provider: "GEMINI" | "OPENROUTER";
  model: string | null;
  hasGeminiKey: boolean;
  hasOpenrouterKey: boolean;
  featCaption: boolean;
  featChecklist: boolean;
  featAnalytics: boolean;
  featHeisenberg: boolean;
};

function Switch({ on, onChange, label, hint }: { on: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <p className="text-sm font-medium">{label}</p>
        {hint && <p className="text-xs text-[var(--muted)]">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!on)}
        className="relative h-6 w-11 shrink-0 rounded-full transition"
        style={{ backgroundColor: on ? "#2E7D4F" : "var(--surface-2)" }}
        aria-pressed={on}
        aria-label={label}
      >
        <span className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all" style={{ left: on ? 22 : 2 }} />
      </button>
    </div>
  );
}

const inputCls = "w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40";
const labelCls = "mb-1.5 block text-sm font-medium";

export function AiSettingsForm() {
  const [s, setS] = useState<Settings | null>(null);
  const [geminiKey, setGeminiKey] = useState("");
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [liveModels, setLiveModels] = useState<{ id: string; label: string }[]>([]);
  const [modelSource, setModelSource] = useState<"live" | "catalog">("catalog");
  const [loadingModels, setLoadingModels] = useState(false);

  async function load() {
    const res = await fetch("/api/ai/settings");
    if (res.ok) {
      const j = await res.json();
      setS(j.data);
    }
  }
  useEffect(() => { load(); }, []);

  // Fetch live models whenever the provider changes (or on demand).
  async function refreshModels(provider: string) {
    setLoadingModels(true);
    try {
      const res = await fetch(`/api/ai/models?provider=${provider}`);
      if (res.ok) {
        const j = await res.json();
        setLiveModels(j.data.models);
        setModelSource(j.data.source);
      }
    } finally {
      setLoadingModels(false);
    }
  }

  useEffect(() => {
    if (s) refreshModels(s.provider);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [s?.provider]);

  if (!s) return <p className="text-sm text-[var(--muted)]">Loading…</p>;

  const providerModels = liveModels;

  async function save() {
    setSaving(true);
    setSaved(false);
    const payload: Record<string, unknown> = {
      enabled: s!.enabled,
      provider: s!.provider,
      model: s!.model,
      featCaption: s!.featCaption,
      featChecklist: s!.featChecklist,
      featAnalytics: s!.featAnalytics,
      featHeisenberg: s!.featHeisenberg,
    };
    if (geminiKey) payload.geminiKey = geminiKey;
    if (openrouterKey) payload.openrouterKey = openrouterKey;
    const res = await fetch("/api/ai/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);
    if (res.ok) {
      const j = await res.json();
      setS(j.data);
      setGeminiKey("");
      setOpenrouterKey("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  }

  const activeKeyMissing =
    (s.provider === "GEMINI" && !s.hasGeminiKey && !geminiKey) ||
    (s.provider === "OPENROUTER" && !s.hasOpenrouterKey && !openrouterKey);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      {/* master switch */}
      <div className="rounded-[var(--radius-card)] border p-5">
        <Switch on={s.enabled} onChange={(v) => setS({ ...s, enabled: v })} label="Enable AI" hint="Master switch for all AI features in this workspace." />
        {s.enabled && activeKeyMissing && (
          <p className="mt-2 rounded-[var(--radius-input)] border border-[#C9A227]/30 bg-[#C9A227]/10 px-3 py-2 text-xs text-[#8a6d1a]">
            Add an API key for {s.provider === "GEMINI" ? "Gemini" : "OpenRouter"} below to start using AI.
          </p>
        )}
      </div>

      {/* provider + keys */}
      <div className="rounded-[var(--radius-card)] border p-5">
        <p className="mb-3 text-sm font-semibold">Provider</p>
        <div className="mb-4 flex gap-2">
          {(["GEMINI", "OPENROUTER"] as const).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setS({ ...s, provider: p, model: null })}
              className={"rounded-[var(--radius-input)] border px-4 py-2 text-sm " + (s.provider === p ? "border-[var(--fg)] bg-[var(--surface-2)] font-medium" : "text-[var(--muted)]")}
            >
              {p === "GEMINI" ? "Google Gemini" : "OpenRouter"}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          <div>
            <label className={labelCls}>Gemini API key {s.hasGeminiKey && <span className="text-xs text-[#2E7D4F]">• set</span>}</label>
            <input type="password" className={inputCls} value={geminiKey} onChange={(e) => setGeminiKey(e.target.value)} placeholder={s.hasGeminiKey ? "•••••••• (leave blank to keep)" : "AIza…"} autoComplete="off" />
          </div>
          <div>
            <label className={labelCls}>OpenRouter API key {s.hasOpenrouterKey && <span className="text-xs text-[#2E7D4F]">• set</span>}</label>
            <input type="password" className={inputCls} value={openrouterKey} onChange={(e) => setOpenrouterKey(e.target.value)} placeholder={s.hasOpenrouterKey ? "•••••••• (leave blank to keep)" : "sk-or-…"} autoComplete="off" />
          </div>
        </div>
      </div>

      {/* model */}
      <div className="rounded-[var(--radius-card)] border p-5">
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-sm font-medium">Model</label>
          <button type="button" onClick={() => refreshModels(s.provider)} disabled={loadingModels}
            className="transition-quiet rounded-full border px-2.5 py-1 text-xs hover:bg-[var(--surface-2)] disabled:opacity-50">
            {loadingModels ? "Loading…" : "Refresh models"}
          </button>
        </div>
        <select className={inputCls} value={s.model ?? ""} onChange={(e) => setS({ ...s, model: e.target.value || null })}>
          <option value="">Provider default (auto)</option>
          {providerModels.map((m) => (
            <option key={m.id} value={m.id}>{m.label}</option>
          ))}
        </select>
        <p className="mt-2 text-xs text-[var(--muted)]">
          {modelSource === "live"
            ? "Live list fetched from your provider using your API key."
            : "Showing built-in list. Add and save an API key, then refresh to load your account's live models."}
          {" "}Retired models auto-upgrade to the provider's suggested replacement at request time.
        </p>
      </div>

      {/* per-feature */}
      <div className="rounded-[var(--radius-card)] border p-5">
        <p className="mb-1 text-sm font-semibold">Features</p>
        <div className="divide-y">
          <Switch on={s.featCaption} onChange={(v) => setS({ ...s, featCaption: v })} label="Caption drafting" hint="Draft on-brand captions and platform variants." />
          <Switch on={s.featChecklist} onChange={(v) => setS({ ...s, featChecklist: v })} label="Feedback to checklist" hint="Turn client comments into an editor action list." />
          <Switch on={s.featAnalytics} onChange={(v) => setS({ ...s, featAnalytics: v })} label="Analytics summary" hint="Explain the numbers in plain language." />
          <Switch on={s.featHeisenberg} onChange={(v) => setS({ ...s, featHeisenberg: v })} label="Heisenberg (AI teammate)" hint="Tag @heisenberg in chat and generate meeting minutes from call transcripts." />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save AI settings"}</Button>
        {saved && <span className="text-sm text-[#2E7D4F]">Saved</span>}
      </div>
    </div>
  );
}
