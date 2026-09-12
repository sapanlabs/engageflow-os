import Link from "next/link";
import { getClients } from "@/lib/data";
import { Card, Avatar, SectionLabel, EmptyState } from "@/components/ui";
import { NewClientButton } from "@/components/forms";

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-end justify-between">
        <div>
          <SectionLabel>Clients</SectionLabel>
          <h1 className="font-display mt-1 text-4xl">Everyone you work with</h1>
        </div>
        <NewClientButton />
      </div>

      {clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          hint="Create your first client to start organizing projects and content."
          action={<NewClientButton />}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}>
              <Card className="transition-quiet p-5 hover:border-[var(--fg)]/20">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{c.name}</p>
                  <span className="text-xs text-[var(--muted)]">{c._count.projects} projects</span>
                </div>
                <p className="mt-1 text-sm text-[var(--muted)]">{c.industry ?? "—"}</p>
                <div className="mt-4 flex -space-x-2">
                  {c.members.slice(0, 5).map((m) => (
                    <Avatar key={m.id} name={m.user.name} color={m.user.avatarColor} />
                  ))}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
