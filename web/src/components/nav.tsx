"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn, initials } from "@/lib/utils";
import { ROLE_LABELS } from "@/lib/constants";
import {
  DashboardIcon, ClientsIcon, ContentIcon, CalendarIcon,
  NotesIcon, AnalyticsIcon, AiIcon, BillingIcon, ChatIcon,
} from "@/components/icons";

// `roles` (optional) restricts a nav item to those roles. Items without it are
// visible to everyone. AI and Billing are workspace-admin-only settings, so we
// hide them from users who can't configure them.
const NAV: { href: string; label: string; Icon: typeof DashboardIcon; roles?: string[] }[] = [
  { href: "/dashboard", label: "Dashboard", Icon: DashboardIcon },
  { href: "/chat", label: "Chat", Icon: ChatIcon },
  { href: "/clients", label: "Clients", Icon: ClientsIcon },
  { href: "/content", label: "Content", Icon: ContentIcon },
  { href: "/calendar", label: "Calendar", Icon: CalendarIcon },
  { href: "/notes", label: "Notes", Icon: NotesIcon },
  { href: "/analytics", label: "Analytics", Icon: AnalyticsIcon },
  { href: "/settings/ai", label: "AI", Icon: AiIcon, roles: ["ADMIN"] },
  { href: "/settings/billing", label: "Billing", Icon: BillingIcon, roles: ["ADMIN"] },
];

type SidebarUser = { name: string; avatarColor: string; role: string };

export function Sidebar({ user }: { user: SidebarUser }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem("ef-sidebar-collapsed") === "1");
  }, []);

  function toggle() {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("ef-sidebar-collapsed", next ? "1" : "0");
      return next;
    });
  }

  return (
    <aside
      className={cn(
        "transition-quiet hidden h-full shrink-0 flex-col border-r bg-[var(--surface)] md:flex",
        collapsed ? "w-16" : "w-60",
      )}
      style={{ transition: "width 200ms cubic-bezier(0.16,1,0.3,1)" }}
    >
      {/* brand + collapse toggle */}
      <div className={cn("flex shrink-0 items-center py-5", collapsed ? "justify-center px-0" : "px-6")}>
        {!collapsed && (
          <Link href="/dashboard" className="font-display text-2xl tracking-tight">
            EngageFlow
          </Link>
        )}
        <button
          onClick={toggle}
          className={cn(
            "transition-quiet rounded-[var(--radius-input)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]",
            collapsed ? "" : "ml-auto",
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand" : "Collapse"}
        >
          <Chevron dir={collapsed ? "right" : "left"} />
        </button>
      </div>

      {/* nav */}
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3">
        {NAV.filter((item) => !item.roles || item.roles.includes(user.role)).map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.Icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={cn(
                "transition-quiet flex items-center gap-3 rounded-[var(--radius-input)] text-sm",
                collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                active
                  ? "bg-[var(--accent)] text-[var(--accent-fg)]"
                  : "text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]",
              )}
            >
              <Icon size={19} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* user profile at the bottom */}
      <div className="shrink-0 border-t p-3">
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium text-white"
              style={{ backgroundColor: user.avatarColor }}
              title={`${user.name} · ${ROLE_LABELS[user.role] ?? user.role}`}
            >
              {initials(user.name)}
            </span>
            <a
              href="/logout"
              title="Sign out"
              className="transition-quiet rounded-[var(--radius-input)] p-1.5 text-[var(--muted)] hover:bg-[var(--surface-2)] hover:text-[var(--fg)]"
              aria-label="Sign out"
            >
              <LogoutIcon />
            </a>
          </div>
        ) : (
          <div className="flex items-center gap-2 rounded-[var(--radius-input)] p-2 hover:bg-[var(--surface-2)]">
            <span
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white"
              style={{ backgroundColor: user.avatarColor }}
            >
              {initials(user.name)}
            </span>
            <div className="min-w-0 leading-tight">
              <p className="truncate text-sm font-medium">{user.name}</p>
              <p className="truncate text-xs text-[var(--muted)]">{ROLE_LABELS[user.role] ?? user.role}</p>
            </div>
            <a
              href="/logout"
              title="Sign out"
              className="transition-quiet ml-auto rounded-[var(--radius-input)] p-1.5 text-[var(--muted)] hover:bg-[var(--bg)] hover:text-[var(--fg)]"
              aria-label="Sign out"
            >
              <LogoutIcon />
            </a>
          </div>
        )}
      </div>
    </aside>
  );
}

function Chevron({ dir }: { dir: "left" | "right" }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {dir === "left" ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
    </svg>
  );
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem("ef-theme");
    const isDark = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDark(isDark);
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, []);
  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.setAttribute("data-theme", next ? "dark" : "light");
    localStorage.setItem("ef-theme", next ? "dark" : "light");
  }
  return (
    <button
      onClick={toggle}
      className="transition-quiet rounded-[var(--radius-input)] border px-3 py-1.5 text-sm text-[var(--muted)] hover:text-[var(--fg)]"
      aria-label="Toggle theme"
    >
      {dark ? "Light" : "Dark"}
    </button>
  );
}
