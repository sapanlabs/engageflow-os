import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspacePlan, getUsage } from "@/lib/billing";
import { isUnlimited } from "@/lib/plans";
import { isDodoConfigured } from "@/lib/dodo";
import { PricingTable } from "@/components/pricing-table";
import { Card, SectionLabel } from "@/components/ui";

const ERRORS: Record<string, string> = {
  "admin-only": "Only workspace admins can change the plan.",
  "contact-sales": "Enterprise is set up with our team — reach out to sales.",
  "not-configured": "Billing is not configured on this environment yet.",
  "missing-product": "This plan has no Dodo product id configured yet.",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed p-10 text-center">
        <p className="font-display text-2xl">Access restricted</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Only workspace admins can manage billing and plans.</p>
      </div>
    );
  }
  const { ws, plan } = await getWorkspacePlan();
  const usage = await getUsage();
  const { status, error } = await searchParams;

  const rows: { label: string; used: number; limit: number }[] = [
    { label: "Clients", used: usage.clients, limit: plan.limits.clients },
    { label: "Projects", used: usage.projects, limit: plan.limits.projects },
    { label: "Team seats", used: usage.seats, limit: plan.limits.seats },
    { label: "Storage (GB)", used: usage.storageGb, limit: plan.limits.storageGb },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Settings</SectionLabel>
        <h1 className="font-display mt-1 text-4xl">Billing &amp; plan</h1>
      </div>

      {status === "success" && (
        <p className="rounded-[var(--radius-input)] border border-[#2E7D4F]/30 bg-[#2E7D4F]/10 px-3 py-2 text-sm text-[#2E7D4F]">
          Checkout complete. Your plan will update as soon as the payment is confirmed.
        </p>
      )}
      {error && (
        <p className="rounded-[var(--radius-input)] border border-[#C0442E]/30 bg-[#C0442E]/10 px-3 py-2 text-sm text-[#C0442E]">
          {ERRORS[error] ?? decodeURIComponent(error)}
        </p>
      )}
      {!isDodoConfigured() && (
        <p className="rounded-[var(--radius-input)] border border-[#C9A227]/30 bg-[#C9A227]/10 px-3 py-2 text-sm text-[#8a6d1a]">
          Billing runs on Dodo Payments (Merchant of Record). Add your API key, webhook secret, and product ids
          to <code>.env</code> to enable live checkout. Plans and limits are already enforced.
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
        <Card className="p-6">
          <p className="text-sm text-[var(--muted)]">Current plan</p>
          <p className="font-display mt-1 text-3xl">{plan.name}</p>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Status: <span className="capitalize">{ws.planStatus.replace("_", " ")}</span>
            {ws.currentPeriodEnd && ` · renews ${new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(ws.currentPeriodEnd)}`}
          </p>
        </Card>

        <Card className="p-6">
          <p className="mb-4 text-sm font-medium">Usage this plan</p>
          <div className="flex flex-col gap-4">
            {rows.map((r) => {
              const unlimited = isUnlimited(r.limit);
              const pct = unlimited ? 0 : Math.min(100, Math.round((r.used / Math.max(1, r.limit)) * 100));
              return (
                <div key={r.label}>
                  <div className="mb-1 flex justify-between text-sm">
                    <span>{r.label}</span>
                    <span className="text-[var(--muted)]">{r.used} / {unlimited ? "∞" : r.limit}</span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${unlimited ? 6 : pct}%`, backgroundColor: pct >= 90 ? "#C0442E" : "var(--accent)" }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      <div>
        <h2 className="font-display mb-5 text-2xl">Change plan</h2>
        <PricingTable currentPlan={plan.id} />
      </div>
    </div>
  );
}
