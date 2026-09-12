"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

export function ShareLink({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const url =
    (typeof window !== "undefined" ? window.location.origin : "") + `/preview/${token}`;

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  return (
    <Button variant="secondary" onClick={copy} title={url}>
      {copied ? "Link copied" : "Copy client preview link"}
    </Button>
  );
}
