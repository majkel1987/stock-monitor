import Link from "next/link";

import { getWatchlist } from "@/application/watchlist/get-watchlist";
import type {
  MarketDefinition,
  StatusDefinition,
} from "@/application/watchlist/types";
import { FlashToast } from "@/components/ui/flash-toast";
import { EmptyState, PageHeader, Surface } from "@/components/ui/terminal";
import { AddStockDialog } from "@/components/watchlist/add-stock-dialog";
import { WatchlistFilters } from "@/components/watchlist/watchlist-filters";
import { WatchlistHeader } from "@/components/watchlist/watchlist-header";
import { WatchlistMobileList } from "@/components/watchlist/watchlist-mobile-list";
import { WatchlistTable } from "@/components/watchlist/watchlist-table";
import { getServerTranslator } from "@/i18n/get-locale";
import type { Translator } from "@/i18n/translate";
import {
  createSupabaseWatchlistReader,
  WatchlistInfrastructureError,
} from "@/infrastructure/supabase/queries/watchlist";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";
import { getServerEnv } from "@/lib/env/server";

type WatchlistPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function WatchlistEmptyState({
  isUnfilteredEmpty,
  statuses,
  markets,
  providerConfigured,
  t,
}: {
  isUnfilteredEmpty: boolean;
  statuses: StatusDefinition[];
  markets: MarketDefinition[];
  providerConfigured: boolean;
  t: Translator;
}) {
  return (
    <Surface>
      <EmptyState
        action={
          isUnfilteredEmpty ? (
            <AddStockDialog
              markets={markets}
              providerConfigured={providerConfigured}
              statuses={statuses}
            />
          ) : (
            <Link className="ui-button ui-button-secondary" href="/watchlist">
              {t("watchlist.clearFilters")}
            </Link>
          )
        }
        description={
          isUnfilteredEmpty
            ? t("watchlist.emptyDescription")
            : t("watchlist.emptyFilteredDescription")
        }
        title={
          isUnfilteredEmpty
            ? t("watchlist.emptyTitle")
            : t("watchlist.emptyFilteredTitle")
        }
      />
    </Surface>
  );
}

async function DataError() {
  const { t } = await getServerTranslator();
  return (
    <div className="page-frame flex flex-col gap-4">
      <PageHeader
        description={t("watchlist.description")}
        eyebrow={t("brand.markets")}
        index
        title={t("watchlist.title")}
      />
      <Surface className="border-negative bg-[var(--negative-subtle)]" padded>
        <h2 className="text-card-title">{t("watchlist.unavailableTitle")}</h2>
        <p className="mt-2 text-sm text-secondary-foreground">
          {t("watchlist.unavailableDescription")}
        </p>
      </Surface>
    </div>
  );
}

export default async function WatchlistPage({
  searchParams,
}: WatchlistPageProps) {
  const rawQuery = await searchParams;
  const { t } = await getServerTranslator();
  const user = await requireAllowedUser();
  const client = await createClient();

  let data: Awaited<ReturnType<typeof getWatchlist>>;
  try {
    data = await getWatchlist(
      createSupabaseWatchlistReader(client),
      user.id,
      rawQuery,
    );
  } catch (error) {
    if (error instanceof WatchlistInfrastructureError) return <DataError />;
    throw error;
  }

  const errorCode =
    typeof rawQuery.error === "string" ? rawQuery.error : undefined;
  const mutationError = errorCode
    ? {
        invalid_action: t("watchlist.invalidAction"),
        archive_failed: t("watchlist.archiveFailed"),
        restore_failed: t("watchlist.restoreFailed"),
      }[errorCode]
    : undefined;
  const isUnfilteredEmpty =
    data.summary.active === 0 &&
    data.query.view === "active" &&
    !data.query.q &&
    !data.query.market &&
    !data.query.status &&
    !data.query.staleOnly &&
    !data.query.unmonitoredOnly;
  const providerConfigured = Boolean(getServerEnv().MASSIVE_API_KEY);

  return (
    <div className="page-frame flex flex-col gap-4">
      <WatchlistHeader summary={data.summary} />

      {mutationError ? (
        <FlashToast
          clearParams={["error"]}
          description={mutationError}
          title={t("watchlist.actionFailed")}
          variant="error"
        />
      ) : null}

      <WatchlistFilters
        action={
          <AddStockDialog
            markets={data.markets}
            providerConfigured={providerConfigured}
            statuses={data.statuses}
          />
        }
        markets={data.markets}
        query={data.query}
        statuses={data.statuses}
      />

      {data.rows.length ? (
        <>
          <WatchlistTable rows={data.rows} />
          <WatchlistMobileList rows={data.rows} />
        </>
      ) : (
        <WatchlistEmptyState
          isUnfilteredEmpty={isUnfilteredEmpty}
          markets={data.markets}
          providerConfigured={providerConfigured}
          statuses={data.statuses}
          t={t}
        />
      )}
    </div>
  );
}
