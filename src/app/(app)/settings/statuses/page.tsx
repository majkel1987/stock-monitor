import { getStatusDefinitions } from "@/application/settings/get-status-definitions";
import { StatusManager } from "@/components/settings/status-manager";
import { PageHeader, Surface } from "@/components/ui/terminal";
import {
  createSupabaseStatusDefinitionStore,
  StatusDefinitionInfrastructureError,
} from "@/infrastructure/supabase/queries/status-definitions";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

function DataError() {
  return (
    <div className="page-frame flex min-w-0 flex-col gap-5 overflow-x-hidden">
      <PageHeader
        description="Konfiguracja etykiet workflow badań i operacji na danych"
        eyebrow="Settings"
        index
        title="Ustawienia"
      />
      <Surface className="border-negative bg-[var(--negative-subtle)] p-4 sm:p-5">
        <h2 className="text-card-title">Statusy niedostępne</h2>
        <p className="mt-2 text-sm text-secondary-foreground">
          Nie udało się wczytać statusów workflow. Odśwież stronę i spróbuj
          ponownie.
        </p>
      </Surface>
    </div>
  );
}

export default async function StatusSettingsPage() {
  const user = await requireAllowedUser();
  const client = await createClient();

  let statuses: Awaited<ReturnType<typeof getStatusDefinitions>>;
  try {
    statuses = await getStatusDefinitions(
      createSupabaseStatusDefinitionStore(client),
      user.id,
    );
  } catch (error) {
    if (error instanceof StatusDefinitionInfrastructureError) {
      return <DataError />;
    }
    throw error;
  }

  return (
    <div className="page-frame flex min-w-0 flex-col gap-5 overflow-x-hidden sm:gap-6">
      <StatusManager statuses={statuses} />
    </div>
  );
}
