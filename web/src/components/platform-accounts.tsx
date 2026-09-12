"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";
import { ACCOUNT_PLATFORMS, ACCOUNT_PLATFORM_LABELS } from "@/lib/constants";

type Account = {
  id: string;
  platform: string;
  label: string | null;
  handle: string | null;
  url: string | null;
  username: string | null;
  hasSecret: boolean;
  notes: string | null;
};

type FormState = {
  platform: string;
  label: string;
  handle: string;
  url: string;
  username: string;
  secret: string;
  notes: string;
};

const empty: FormState = { platform: "INSTAGRAM", label: "", handle: "", url: "", username: "", secret: "", notes: "" };
const inputCls = "w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40";
const labelCls = "mb-1 block text-xs font-medium text-[var(--muted)]";

export function PlatformAccounts({ clientId }: { clientId: string }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(empty);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  async function load() {
    const res = await fetch(`/api/clients/${clientId}/accounts`);
    if (res.ok) setAccounts((await res.json()).data);
    setLoading(false);
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function startAdd() { setForm(empty); setAdding(true); setEditingId(null); }
  function startEdit(a: Account) {
    setForm({ platform: a.platform, label: a.label ?? "", handle: a.handle ?? "", url: a.url ?? "", username: a.username ?? "", secret: "", notes: a.notes ?? "" });
    setEditingId(a.id); setAdding(false);
  }
  function cancel() { setAdding(false); setEditingId(null); setForm(empty); }

  async function save() {
    setBusy(true);
    const payload: Record<string, string> = {
      platform: form.platform, label: form.label, handle: form.handle,
      url: form.url, username: form.username, notes: form.notes,
    };
    // only send secret when user typed one (avoids clearing on edit)
    if (form.secret) payload.secret = form.secret;

    if (editingId) {
      await fetch(`/api/accounts/${editingId}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    } else {
      await fetch(`/api/clients/${clientId}/accounts`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    }
    setBusy(false);
    cancel();
    load();
  }

  async function reveal(id: string) {
    if (revealed[id]) { setRevealed((r) => { const n = { ...r }; delete n[id]; return n; }); return; }
    const res = await fetch(`/api/accounts/${id}/reveal`, { method: "POST" });
    if (res.ok) {
      const { data } = await res.json();
      setRevealed((r) => ({ ...r, [id]: data.secret ?? "" }));
    }
  }

  async function remove(id: string) {
    setAccounts((a) => a.filter((x) => x.id !== id));
    await fetch(`/api/accounts/${id}`, { method: "DELETE" });
  }

  function copy(text: string) { navigator.clipboard.writeText(text); }

  const formCard = (
    <div className="rounded-[var(--radius-card)] border bg-[var(--surface)] p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className={labelCls}>Platform</label>
          <select className={inputCls} value={form.platform} onChange={(e) => setForm({ ...form, platform: e.target.value })}>
            {ACCOUNT_PLATFORMS.map((p) => <option key={p} value={p}>{ACCOUNT_PLATFORM_LABELS[p]}</option>)}
          </select>
        </div>
        <div>
          <label className={labelCls}>Label (optional)</label>
          <input className={inputCls} value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} placeholder="Main handle" />
        </div>
        <div>
          <label className={labelCls}>Handle</label>
          <input className={inputCls} value={form.handle} onChange={(e) => setForm({ ...form, handle: e.target.value })} placeholder="@northwind.coffee" />
        </div>
        <div>
          <label className={labelCls}>Profile / login URL</label>
          <input className={inputCls} value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://instagram.com/…" />
        </div>
        <div>
          <label className={labelCls}>Username / email</label>
          <input className={inputCls} value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} autoComplete="off" />
        </div>
        <div>
          <label className={labelCls}>Password / token {editingId && <span className="text-[var(--muted)]">(leave blank to keep)</span>}</label>
          <input className={inputCls} type="password" value={form.secret} onChange={(e) => setForm({ ...form, secret: e.target.value })} autoComplete="new-password" />
        </div>
      </div>
      <div className="mt-3">
        <label className={labelCls}>Notes</label>
        <textarea className={inputCls} rows={2} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="2FA recovery, agency access notes, etc." />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={cancel} type="button">Cancel</Button>
        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : editingId ? "Save changes" : "Add account"}</Button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-2xl">Platform access</h2>
        {!adding && !editingId && <Button onClick={startAdd}>Add account</Button>}
      </div>

      <p className="rounded-[var(--radius-input)] border border-[#C9A227]/30 bg-[#C9A227]/10 px-3 py-2 text-sm text-[#8a6d1a]">
        Credentials are encrypted at rest. Prefer app-specific passwords or OAuth tokens over primary logins. Reveals are logged.
      </p>

      {adding && formCard}

      {loading ? (
        <p className="text-sm text-[var(--muted)]">Loading…</p>
      ) : accounts.length === 0 && !adding ? (
        <div className="rounded-[var(--radius-card)] border border-dashed p-8 text-center">
          <p className="font-display text-xl">No accounts yet</p>
          <p className="mt-1 text-sm text-[var(--muted)]">Add this client&rsquo;s social and web logins so the team has them in one place.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {accounts.map((a) =>
            editingId === a.id ? (
              <div key={a.id}>{formCard}</div>
            ) : (
              <div key={a.id} className="rounded-[var(--radius-card)] border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-xs font-medium">{ACCOUNT_PLATFORM_LABELS[a.platform] ?? a.platform}</span>
                      {a.label && <span className="text-sm font-medium">{a.label}</span>}
                    </div>
                    <div className="mt-2 grid gap-1 text-sm">
                      {a.handle && <p className="text-[var(--muted)]">{a.handle}</p>}
                      {a.url && <a href={a.url} target="_blank" rel="noreferrer" className="truncate text-[#2F6FEB] hover:underline">{a.url}</a>}
                      {a.username && (
                        <p className="flex items-center gap-2">
                          <span className="text-[var(--muted)]">user:</span> {a.username}
                          <button onClick={() => copy(a.username!)} className="text-xs text-[var(--muted)] hover:text-[var(--fg)]">copy</button>
                        </p>
                      )}
                      {a.hasSecret && (
                        <p className="flex items-center gap-2 font-mono">
                          <span className="font-sans text-[var(--muted)]">secret:</span>
                          <span>{revealed[a.id] !== undefined ? (revealed[a.id] || "—") : "••••••••"}</span>
                          <button onClick={() => reveal(a.id)} className="font-sans text-xs text-[var(--muted)] hover:text-[var(--fg)]">
                            {revealed[a.id] !== undefined ? "hide" : "reveal"}
                          </button>
                          {revealed[a.id] && (
                            <button onClick={() => copy(revealed[a.id])} className="font-sans text-xs text-[var(--muted)] hover:text-[var(--fg)]">copy</button>
                          )}
                        </p>
                      )}
                      {a.notes && <p className="mt-1 text-[var(--muted)]">{a.notes}</p>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button onClick={() => startEdit(a)} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">Edit</button>
                    <button onClick={() => remove(a.id)} className="text-sm text-[var(--muted)] hover:text-[#C0442E]">Delete</button>
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
