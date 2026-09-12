import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { SectionLabel } from "@/components/ui";
import { AiSettingsForm } from "@/components/ai-settings-form";

export default async function AiSettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "ADMIN") {
    return (
      <div className="rounded-[var(--radius-card)] border border-dashed p-10 text-center">
        <p className="font-display text-2xl">Access restricted</p>
        <p className="mt-2 text-sm text-[var(--muted)]">Only workspace admins can configure AI.</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-8">
      <div>
        <SectionLabel>Settings</SectionLabel>
        <h1 className="font-display mt-1 text-4xl">AI</h1>
        <p className="mt-2 max-w-xl text-[var(--muted)]">
          Bring your own key, choose a provider and model, and turn features on or off. AI is off until
          you enable it, and every AI output is a draft your team approves.
        </p>
      </div>
      <AiSettingsForm />
    </div>
  );
}
