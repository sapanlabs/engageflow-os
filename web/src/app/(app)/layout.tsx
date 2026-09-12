import Link from "next/link";
import { Sidebar, ThemeToggle } from "@/components/nav";
import { getCurrentUser } from "@/lib/auth";
import { NotificationBell } from "@/components/notification-bell";
import { SearchTrigger } from "@/components/search";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Auth is enforced by the proxy (single source of truth). We only read the
  // user for display here. If it's somehow missing we render a sign-in prompt
  // rather than redirecting — never bounce, so a loop is impossible.
  const user = await getCurrentUser();
  if (!user) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <div className="text-center">
          <p className="font-display text-2xl">Your session has expired</p>
          <a href="/login" className="mt-4 inline-block rounded-[var(--radius-input)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)]">
            Sign in
          </a>
        </div>
      </div>
    );
  }

  return (
    // Lock the shell to the viewport. Sidebar + header stay fixed; only <main> scrolls.
    <div className="flex h-dvh w-full overflow-hidden">
      <Sidebar user={{ name: user.name, avatarColor: user.avatarColor, role: user.role }} />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center gap-4 border-b bg-[var(--bg)] px-6">
          <Link href="/dashboard" className="font-display text-lg md:hidden">
            EngageFlow
          </Link>
          <SearchTrigger />
          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1400px] px-6 py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
