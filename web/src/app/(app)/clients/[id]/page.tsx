import Link from "next/link";
import { notFound } from "next/navigation";
import { getClient, getUsers } from "@/lib/data";
import { getCurrentUser } from "@/lib/auth";
import { Card, StatusBadge, EmptyState, Button } from "@/components/ui";
import { NewProjectButton } from "@/components/forms";
import { ClientTeam } from "@/components/client-team";
import { canManageCredentials } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export default async function ClientPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const client = await getClient(id);
  if (!client) notFound();
  const user = await getCurrentUser();
  const showAccess = user ? canManageCredentials(user.role) : false;
  const workspaceUsers = await getUsers();
  // Admins, or a creative lead assigned to this client, can manage the team.
  const canManageTeam =
    user?.role === "ADMIN" ||
    client.members.some((m) => m.userId === user?.id && m.role === "CREATIVE_LEAD");

  return (
    <div className="flex flex-col gap-8">
      <div>
        <Link href="/clients" className="text-sm text-[var(--muted)] hover:text-[var(--fg)]">
          ← Clients
        </Link>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="font-display text-4xl">{client.name}</h1>
            <p className="mt-1 text-[var(--muted)]">
              {client.industry ?? "—"} · {client.contactName ?? "No contact"}
            </p>
          </div>
          <div className="flex gap-2">
            {showAccess && (
              <Link href={`/clients/${client.id}/access`}>
                <Button variant="secondary">Platform access</Button>
              </Link>
            )}
            <NewProjectButton clientId={client.id} />
          </div>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        <section>
          <h2 className="font-display mb-4 text-2xl">Projects</h2>
          {client.projects.length === 0 ? (
            <EmptyState
              title="No projects yet"
              hint="Projects organize the work being done for this client."
              action={<NewProjectButton clientId={client.id} />}
            />
          ) : (
            <div className="flex flex-col gap-3">
              {client.projects.map((p) => (
                <Link key={p.id} href={`/projects/${p.id}`}>
                  <Card className="transition-quiet flex items-center justify-between p-5 hover:border-[var(--fg)]/20">
                    <div>
                      <p className="font-medium">{p.name}</p>
                      <p className="mt-1 text-sm text-[var(--muted)]">
                        {p._count.contents} content pieces · {formatDate(p.startDate)}
                      </p>
                    </div>
                    <StatusBadge status={p.status} kind="project" />
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <ClientTeam
            clientId={client.id}
            canManage={canManageTeam}
            initialMembers={client.members.map((m) => ({
              id: m.id,
              userId: m.userId,
              role: m.role,
              user: { name: m.user.name, avatarColor: m.user.avatarColor },
            }))}
            workspaceUsers={workspaceUsers.map((u) => ({
              id: u.id, name: u.name, role: u.role, avatarColor: u.avatarColor,
            }))}
          />
        </section>
      </div>
    </div>
  );
}
