"use client";

import { useEffect, useState } from "react";

export type AiStatus = {
  enabled: boolean;
  configured: boolean;
  provider: string;
  model: string;
  features: { caption: boolean; checklist: boolean; analytics: boolean };
};

// Fetches AI status once so components can show/hide AI affordances.
export function useAiStatus() {
  const [status, setStatus] = useState<AiStatus | null>(null);
  useEffect(() => {
    let alive = true;
    fetch("/api/ai/status")
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => { if (alive && j) setStatus(j.data); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);
  return status;
}
