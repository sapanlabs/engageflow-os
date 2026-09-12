"use client";

import { useEffect, useState } from "react";

// Coded product-loop: In Review -> pinned comment -> new version -> Approved.
// Reuses the app's visual language; pure CSS transitions, no video, no deps.
const STEPS = 4;
const STEP_MS = 2300;

const STATUS = [
  { label: "In Review", color: "#C9A227" },
  { label: "In Review", color: "#C9A227" },
  { label: "Changes addressed", color: "#2F6FEB" },
  { label: "Approved", color: "#2E7D4F" },
];

export function HeroDemo() {
  const [step, setStep] = useState(0);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    if (mq.matches) {
      setStep(3); // show the resolved "Approved" state statically
      return;
    }
    const t = setInterval(() => setStep((s) => (s + 1) % STEPS), STEP_MS);
    return () => clearInterval(t);
  }, []);

  const status = STATUS[step];
  const showPin = step >= 1;
  const pinResolved = step >= 3;
  const showComment = step === 1 || step === 2;
  const version = step >= 2 ? 3 : 2;
  const approved = step === 3;

  return (
    <div className="relative mx-auto w-full max-w-md">
      {/* card */}
      <div className="overflow-hidden rounded-[18px] border bg-[var(--bg)] shadow-[0_24px_60px_rgba(0,0,0,0.10)]">
        {/* header */}
        <div className="flex items-center gap-2 px-4 py-3">
          <span className="h-8 w-8 rounded-full bg-gradient-to-tr from-[#f9ce34] via-[#ee2a7b] to-[#6228d7]" />
          <span className="text-sm font-semibold">engageflow.media</span>
          <span
            className="ml-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-500"
            style={{ backgroundColor: `${status.color}1f`, color: status.color }}
          >
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: status.color }} />
            {status.label}
          </span>
        </div>

        {/* media with pin */}
        <div className="relative aspect-square w-full overflow-hidden bg-black">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://picsum.photos/seed/engageflow-hero-v2/800/800"
            alt="content preview"
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: version === 2 ? 1 : 0 }}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://picsum.photos/seed/engageflow-hero-v3/800/800"
            alt="content preview revised"
            className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
            style={{ opacity: version === 3 ? 1 : 0 }}
          />

          {/* pin */}
          <span
            className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-500"
            style={{ left: "42%", top: "22%", opacity: showPin ? 1 : 0, transform: `translate(-50%,-50%) scale(${showPin ? 1 : 0.5})` }}
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white text-[11px] font-semibold text-white shadow-md transition-colors duration-500"
              style={{ backgroundColor: pinResolved ? "#2E7D4F" : "#0a0a0a" }}
            >
              1
            </span>
          </span>

          {/* comment chip */}
          <div
            className="absolute left-[46%] top-[26%] max-w-[190px] rounded-lg bg-black/80 px-3 py-2 text-xs text-white shadow-lg transition-all duration-500"
            style={{ opacity: showComment ? 1 : 0, transform: `translateY(${showComment ? 0 : 6}px)` }}
          >
            <span className="font-medium">Tomas</span> Move the logo left a touch.
          </div>
        </div>

        {/* actions + version rail */}
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex gap-1.5">
            {[1, 2, 3].map((n) => (
              <span
                key={n}
                className="flex h-6 w-6 items-center justify-center rounded-md border text-[10px] font-medium transition-all duration-500"
                style={{
                  borderColor: n === version ? "var(--fg)" : "var(--border)",
                  opacity: n <= version ? 1 : 0.35,
                }}
              >
                V{n}
              </span>
            ))}
          </div>
          <div className="relative ml-auto">
            <button
              className="rounded-[8px] px-4 py-2 text-sm font-medium text-white transition-all duration-300"
              style={{ backgroundColor: approved ? "#2E7D4F" : "#0a0a0a", transform: `scale(${approved ? 0.97 : 1})` }}
            >
              {approved ? "Approved ✓" : "Approve"}
            </button>
            {/* synthetic cursor */}
            <span
              className="absolute -bottom-1 right-2 transition-all duration-500"
              style={{ opacity: step === 3 ? 1 : 0, transform: `translate(${step === 3 ? 0 : 10}px, ${step === 3 ? 0 : 10}px)` }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M4 2l7 18 2.5-7L21 10 4 2z" fill="#0a0a0a" stroke="#fff" strokeWidth="1.5" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {!reduced && (
        <p className="mt-3 text-center text-xs text-[var(--muted)]">Live preview · client review to approval</p>
      )}
    </div>
  );
}
