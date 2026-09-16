import { redirect } from "next/navigation";
import { login } from "@/lib/auth";
import { db } from "@/lib/db";
import { Button } from "@/components/ui";
import { ROLE_LABELS } from "@/lib/constants";

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") || "/dashboard");
  const user = await login(email, password);
  if (!user) redirect(`/login?error=invalid`);
  redirect(user.role === "CLIENT" ? "/login?error=clients-use-preview-links" : next);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;

  const errorText =
    error === "invalid"
      ? "That email or password did not match."
      : error === "clients-use-preview-links"
        ? "Clients review work through their preview links, not the internal app."
        : null;

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="font-display text-3xl tracking-tight">EngageFlow</p>
        <p className="mt-1 text-sm text-[var(--muted)]">Sign in to the studio workspace.</p>

        {errorText && (
          <p className="mt-4 rounded-[var(--radius-input)] border border-[#C0442E]/30 bg-[#C0442E]/10 px-3 py-2 text-sm text-[#C0442E]">
            {errorText}
          </p>
        )}

        <form action={loginAction} className="mt-6 flex flex-col gap-3">
          <input type="hidden" name="next" value={next ?? "/dashboard"} />
          <div>
            <label className="mb-1.5 block text-sm font-medium">Email</label>
            <input
              name="email"
              type="email"
              required
              className="w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">Password</label>
            <input
              name="password"
              type="password"
              required
              className="w-full rounded-[var(--radius-input)] border bg-[var(--bg)] px-3 py-2 text-sm outline-none focus:border-[var(--fg)]/40"
            />
          </div>
          <Button type="submit" className="mt-1 w-full">Sign in</Button>
        </form>
      </div>
    </div>
  );
}
