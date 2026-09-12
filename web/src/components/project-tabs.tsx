"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function ProjectTabs({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;
  const tabs = [
    { href: base, label: "Content" },
    { href: `${base}/tasks`, label: "Tasks" },
    { href: `${base}/calendar`, label: "Calendar" },
    { href: `${base}/whiteboard`, label: "Whiteboard" },
    { href: `${base}/notes`, label: "Notes" },
    { href: `${base}/files`, label: "Files" },
    { href: `${base}/chat`, label: "Chat" },
  ];
  return (
    <nav className="flex gap-1 border-b">
      {tabs.map((t) => {
        const active = t.href === base ? pathname === base : pathname.startsWith(t.href);
        return (
          <Link
            key={t.href}
            href={t.href}
            className={cn(
              "transition-quiet -mb-px border-b-2 px-3 py-2.5 text-sm",
              active
                ? "border-[var(--fg)] text-[var(--fg)]"
                : "border-transparent text-[var(--muted)] hover:text-[var(--fg)]",
            )}
          >
            {t.label}
          </Link>
        );
      })}
    </nav>
  );
}
