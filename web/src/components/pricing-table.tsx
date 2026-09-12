"use client";

import { useState } from "react";
import { PLAN_ORDER, PLANS, annualMonthlyEquivalent } from "@/lib/plans";

export function PricingTable({ currentPlan }: { currentPlan?: string }) {
  const [interval, setInterval] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-center gap-3">
        <span className={interval === "monthly" ? "text-sm font-medium" : "text-sm text-[var(--muted)]"}>Monthly</span>
        <button
          onClick={() => setInterval((i) => (i === "monthly" ? "annual" : "monthly"))}
          className="relative h-6 w-11 rounded-full bg-[var(--surface-2)] transition"
          aria-label="Toggle billing interval"
        >
          <span
            className="absolute top-0.5 h-5 w-5 rounded-full bg-[var(--accent)] transition-all"
            style={{ left: interval === "annual" ? 22 : 2 }}
          />
        </button>
        <span className={interval === "annual" ? "text-sm font-medium" : "text-sm text-[var(--muted)]"}>
          Annual <span className="text-[#2E7D4F]">(2 months free)</span>
        </span>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const plan = PLANS[id];
          const isCurrent = currentPlan === id;
          const featured = id === "AGENCY";
          const price =
            plan.priceMonthly == null
              ? null
              : interval === "monthly"
                ? plan.priceMonthly
                : annualMonthlyEquivalent(plan);

          return (
            <div
              key={id}
              className={
                "flex flex-col rounded-[var(--radius-card)] border p-6 " +
                (featured ? "border-[var(--fg)] shadow-sm" : "")
              }
            >
              {featured && (
                <span className="mb-3 w-fit rounded-full bg-[var(--accent)] px-2.5 py-0.5 text-xs font-medium text-[var(--accent-fg)]">
                  Most popular
                </span>
              )}
              <h3 className="font-display text-3xl">{plan.name}</h3>
              <p className="mt-1 min-h-10 text-sm text-[var(--muted)]">{plan.tagline}</p>

              <div className="mt-4">
                {price == null ? (
                  <p className="font-display text-4xl">Custom</p>
                ) : (
                  <p className="font-display text-4xl">
                    ${price}
                    <span className="text-base text-[var(--muted)]"> /mo</span>
                  </p>
                )}
                {plan.priceAnnual != null && interval === "annual" && (
                  <p className="mt-1 text-xs text-[var(--muted)]">${plan.priceAnnual} billed yearly</p>
                )}
                {price == null && <p className="mt-1 text-xs text-[var(--muted)]">Tailored to your team</p>}
              </div>

              <div className="mt-5">
                {isCurrent ? (
                  <span className="block rounded-[var(--radius-input)] border px-4 py-2 text-center text-sm text-[var(--muted)]">
                    Current plan
                  </span>
                ) : plan.selfServe ? (
                  <a
                    href={`/api/billing/checkout?plan=${plan.id}&interval=${interval}`}
                    className={
                      "block rounded-[var(--radius-input)] px-4 py-2 text-center text-sm font-medium transition-quiet " +
                      (featured
                        ? "bg-[var(--accent)] text-[var(--accent-fg)] hover:opacity-90"
                        : "border hover:bg-[var(--surface-2)]")
                    }
                  >
                    Choose {plan.name}
                  </a>
                ) : (
                  <a
                    href="mailto:sales@engageflow.media?subject=EngageFlow%20Enterprise"
                    className="block rounded-[var(--radius-input)] border px-4 py-2 text-center text-sm font-medium hover:bg-[var(--surface-2)]"
                  >
                    Contact sales
                  </a>
                )}
              </div>

              <ul className="mt-6 flex flex-col gap-2 text-sm">
                {plan.highlights.map((h) => (
                  <li key={h} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--fg)]" />
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="text-center text-xs text-[var(--muted)]">
        Prices in USD. Billed globally via Dodo Payments (Merchant of Record) — taxes and GST handled at checkout.
      </p>
    </div>
  );
}
