"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, Button } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";

type Member = { id: string; userId: string; role: string; user: { name: string; avatarColor: string } };
type WsUser = { id: string; name: string; role: string; avatarColor: string };

const ASSIGNABLE_ROLES = ["CREATIVE_LEAD", "SOCIAL_MEDIA_MANAGER", "EDITOR", "CLIENT"];
const selectCls = "rounded-[var(--radius-input)] border bg-[var(--bg)] px-2 py-1.5 text-sm outline-none focus:border-[var(--fg)]/40";

export function ClientTeam({
  clientId,
  initialMembers,
  workspaceUsers,
  canManage,
}: {
  clientId: string;
  initialMembers: Member[];
  workspaceUsers: WsUser[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [members, setMembers] = useState<Member[]>(initialMembers);
  const [adding, setAdding] = useState(false);
  const [pickUser, setPickUser] = useState("");
  const [pickRole, setPickRole] = useState("EDITOR");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const memberUserIds = new Set(members.map((m) => m.userId));
  const available = workspaceUsers.filter((u) => !memberUserIds.has(u.id));

  async function add() {
    if (!pickUser) return;
    setBusy(true); setError(null);
    const res = await fetch(`/api/clients/${clientId}/members`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ userId: pickUser, role: pickRole }),
    });
    setBusy(false);
    if (res.ok) {
      const { data } = await res.json();
      setMembers((m) => [...m, data]);
      setAdding(false); setPickUser("");
      router.refresh();
    } else {
      setError((await res.json().catch(() => ({}))).error ?? "Failed to add member");
    }
  }

  async function changeRole(memberId: string, role: string) {
    setMembers((m) => m.map((x) => (x.id === memberId ? { ...x, role } : x)));
    const res = await fetch(`/api/clients/${clientId}/members/${memberId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) router.refresh();
  }

  async function remove(memberId: string) {
    const prev = members;
    setMembers((m) => m.filter((x) => x.id !== memberId));
    const res = await fetch(`/api/clients/${clientId}/members/${memberId}`, { method: "DELETE" });
    if (!res.ok) setMembers(prev);
    else router.refresh();
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Team</p>
        {canManage && !adding && available.length > 0 && (
          <button onClick={() => { setAdding(true); setPickUser(available[0].id); }} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
            + Add
          </button>
        )}
      </div>

      {adding && (
        <div className="mb-3 rounded-[var(--radius-card)] border bg-[var(--surface)] p-3">
          <div className="flex flex-col gap-2">
            <select className={selectCls} value={pickUser} onChange={(e) => setPickUser(e.target.value)}>
              {available.map((u) => (
                <option key={u.id} value={u.id}>{u.name} · {ROLE_LABELS[u.role] ?? u.role}</option>
              ))}
            </select>
            <select className={selectCls} value={pickRole} onChange={(e) => setPickRole(e.target.value)}>
              {ASSIGNABLE_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => { setAdding(false); setError(null); }} type="button">Cancel</Button>
              <Button onClick={add} disabled={busy || !pickUser}>{busy ? "Adding…" : "Add member"}</Button>
            </div>
            {error && <p className="text-xs text-[#C0442E]">{error}</p>}
          </div>
        </div>
      )}

      <div className="divide-y rounded-[var(--radius-card)] border">
        {members.length === 0 && <p className="p-4 text-sm text-[var(--muted)]">No team members yet.</p>}
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-3 p-3">
            <Avatar name={m.user.name} color={m.user.avatarColor} size={32} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{m.user.name}</p>
              {canManage ? (
                <select
                  className="mt-0.5 rounded-[6px] border bg-[var(--bg)] px-1.5 py-0.5 text-xs outline-none"
                  value={m.role}
                  onChange={(e) => changeRole(m.id, e.target.value)}
                >
                  {ASSIGNABLE_ROLES.concat(m.role === "ADMIN" ? ["ADMIN"] : []).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r] ?? r}</option>
                  ))}
                </select>
              ) : (
                <p className="text-xs text-[var(--muted)]">{ROLE_LABELS[m.role] ?? m.role}</p>
              )}
            </div>
            {canManage && (
              <button onClick={() => remove(m.id)} className="text-xs text-[var(--muted)] hover:text-[#C0442E]" aria-label="Remove member">
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
