"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

type Notif = {
  id: string;
  title: string;
  body: string | null;
  href: string | null;
  read: boolean;
  createdAt: string;
};

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    const res = await fetch("/api/notifications");
    if (!res.ok) return;
    const json = await res.json();
    setItems(json.data);
    setUnread(json.unread);
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  async function markAll() {
    await fetch("/api/notifications", { method: "PATCH" });
    load();
  }

  async function open1(n: Notif) {
    if (!n.read) {
      await fetch(`/api/notifications/${n.id}`, { method: "PATCH" });
      load();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="transition-quiet relative rounded-[var(--radius-input)] border px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
        aria-label="Notifications"
      >
        Alerts
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#C0442E] px-1 text-[10px] font-semibold text-white">
            {unread}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-[var(--radius-card)] border bg-[var(--bg)] shadow-xl">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-medium">Notifications</span>
            <button onClick={markAll} className="text-xs text-[var(--muted)] hover:text-[var(--fg)]">
              Mark all read
            </button>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <p className="px-4 py-6 text-center text-sm text-[var(--muted)]">You're all caught up.</p>
            )}
            {items.map((n) => {
              const inner = (
                <div className={"border-b px-4 py-3 " + (n.read ? "opacity-60" : "")}>
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#2F6FEB]" />}
                    <div>
                      <p className="text-sm font-medium">{n.title}</p>
                      {n.body && <p className="text-xs text-[var(--muted)]">{n.body}</p>}
                      <p className="mt-0.5 text-xs text-[var(--muted)]">{timeAgo(n.createdAt)}</p>
                    </div>
                  </div>
                </div>
              );
              return n.href ? (
                <Link key={n.id} href={n.href} onClick={() => open1(n)}>
                  {inner}
                </Link>
              ) : (
                <button key={n.id} onClick={() => open1(n)} className="block w-full text-left">
                  {inner}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
