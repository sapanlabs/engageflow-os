import Link from "next/link";
import { PricingTable } from "@/components/pricing-table";

export const metadata = { title: "Pricing — EngageFlow" };

export default function PricingPage() {
  return (
    <div className="min-h-dvh">
      <header className="border-b">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between px-6 py-5">
          <Link href="/" className="font-display text-2xl tracking-tight">EngageFlow</Link>
          <Link href="/login" className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">Sign in</Link>
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-6 py-14">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h1 className="font-display text-5xl">Pricing that scales with your studio</h1>
          <p className="mt-3 text-[var(--muted)]">
            Start solo, grow into an agency, or run at enterprise scale. Every plan includes the full
            client → project → content → approval workflow.
          </p>
        </div>
        <PricingTable />
      </main>
    </div>
  );
}
