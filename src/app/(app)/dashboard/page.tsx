import Link from "next/link";

import { getDashboard } from "@/application/dashboard/get-dashboard";
import { resolveDashboardMarketFilter } from "@/application/dashboard/market-query";
import { CurrentOpportunities } from "@/components/dashboard/current-opportunities";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { NeedsAttentionCard } from "@/components/dashboard/needs-attention-card";
import { RecentMonitoring } from "@/components/dashboard/recent-monitoring";
import { ResearchPipeline } from "@/components/dashboard/research-pipeline";
import { EmptyState, PageHeader, Surface } from "@/components/ui/terminal";
import { getServerTranslator } from "@/i18n/get-locale";
import {
  createSupabaseDashboardReader,
  DashboardInfrastructureError,
} from "@/infrastructure/supabase/queries/dashboard";
import { requireAllowedUser } from "@/infrastructure/supabase/server/auth";
import { createClient } from "@/infrastructure/supabase/server/create-client";

type DashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

async function EmptyDashboard({ market }: { market: "ALL" | "GPW" | "USA" }) {
  const { t } = await getServerTranslator();
  const filtered = market !== "ALL";
  return (
    <Surface>
      <EmptyState
        action={
          <Link className="ui-button ui-button-primary" href="/watchlist">
            {t("dashboard.openWatchlist")}
          </Link>
        }
        description={
          filtered
            ? t("dashboard.emptyDescriptionFiltered")
            : t("dashboard.emptyDescription")
        }
        title={
          filtered
            ? t("dashboard.emptyTitleFiltered", { market })
            : t("dashboard.emptyTitle")
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
        description={t("dashboard.description")}
        eyebrow={t("brand.tagline")}
        index
        title={t("dashboard.title")}
      />
      <Surface className="border-negative bg-[var(--negative-subtle)]" padded>
        <h2 className="text-card-title">{t("dashboard.unavailableTitle")}</h2>
        <p className="mt-2 text-sm text-secondary-foreground">
          {t("dashboard.unavailableDescription")}
        </p>
      </Surface>
    </div>
  );
}

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const market = resolveDashboardMarketFilter(params.market);
  const selectedMarket = market === "ALL" ? undefined : market;
  const user = await requireAllowedUser();
  const client = await createClient();
  const now = new Date();
  let data: Awaited<ReturnType<typeof getDashboard>>;

  try {
    data = await getDashboard(createSupabaseDashboardReader(client), user.id, {
      now,
      market: selectedMarket,
    });
  } catch (error) {
    if (error instanceof DashboardInfrastructureError) return <DataError />;
    throw error;
  }

  return (
    <div className="page-frame flex flex-col gap-4">
      <DashboardHeader
        freshness={data.quoteFreshness}
        lastSuccessfulSyncAt={data.metadata.lastSuccessfulSyncAt}
        market={market}
        now={now}
      />

      {data.kpis.monitored === 0 ? (
        <EmptyDashboard market={market} />
      ) : (
        <>
          <DashboardStats kpis={data.kpis} />
          <CurrentOpportunities rows={data.currentOpportunities} />
          <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,22rem)]">
            <RecentMonitoring rows={data.recentMonitoring} />
            <div className="flex flex-col gap-4">
              <NeedsAttentionCard rows={data.needsAttention} />
              <ResearchPipeline
                deepDiveCount={data.kpis.deepDive}
                rows={data.statusOverview}
                total={data.kpis.monitored}
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
