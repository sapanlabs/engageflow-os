import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getClient } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { canManageCredentials } from "@/lib/constants";
import { PlatformAccounts } from "@/components/platform-accounts";

export default async function ClientAccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  const client = await getClient(id); // enforces client access (null if not allowed)
  if (!client) notFound();
  // Role check first: users who can't manage credentials should never see the
  // vault — or the billing upsell (which links to the admin-only plan page) —
  // regardless of whether the workspace has the feature enabled.
  if (!canManageCredentials(user.role)) {
    return (
      <div className="flex flex-col gap-4">
        <Link href={`/clients/${id}`} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">← {client.name}</Link>
        <div className="rounded-[var(--radius-card)] border border-dashed p-10 text-center">
          <p className="font-display text-2xl">Access restricted</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Only admins, creative leads, and social media managers can view credentials.</p>
        </div>
      </div>
    );
  }
  const { hasFeature } = await import("@/lib/billing");
  const vaultEnabled = await hasFeature("credentialVault");
  if (!vaultEnabled) {
    return (
      <div className="flex flex-col gap-4">
        <Link href={`/clients/${id}`} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">← {client.name}</Link>
        <div className="rounded-[var(--radius-card)] border border-dashed p-10 text-center">
          <p className="font-display text-2xl">Credential vault is an Agency feature</p>
          <p className="mt-2 text-sm text-[var(--muted)]">Upgrade to Agency to securely store client platform logins.</p>
          <Link href="/settings/billing" className="mt-4 inline-block rounded-[var(--radius-input)] bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)]">View plans</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link href={`/clients/${id}`} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">← {client.name}</Link>
        <h1 className="font-display mt-2 text-4xl">Platform access</h1>
        <p className="mt-1 text-[var(--muted)]">Social and web logins for {client.name}, in one secure place.</p>
      </div>
      <PlatformAccounts clientId={id} />
    </div>
  );
}
