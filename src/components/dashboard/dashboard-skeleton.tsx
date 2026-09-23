import { SectionHeader, Surface } from "@/components/ui/terminal";
import { Skeleton } from "@/components/ui/skeleton";
import { getServerTranslator } from "@/i18n/get-locale";

export async function DashboardSkeleton() {
  const { t } = await getServerTranslator();

  return (
    <div className="page-frame flex flex-col gap-4">
      <div className="flex min-h-10 flex-wrap items-end justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-full max-w-80" />
        </div>
        <div className="flex flex-col gap-2 lg:items-end">
          <div className="flex flex-col gap-2 min-[360px]:flex-row">
            <Skeleton className="h-11 w-full min-[360px]:w-40" />
            <Skeleton className="h-11 w-full min-[360px]:w-36" />
          </div>
          <Skeleton className="h-7 w-44" />
        </div>
      </div>

      <div className="metric-strip">
        {Array.from({ length: 4 }, (_, index) => (
          <div className="flex flex-col gap-1.5 p-4" key={index}>
            <Skeleton className="h-3 w-28" />
            <Skeleton className="mt-1 h-8 w-16" />
            <Skeleton className="h-3 w-24" />
          </div>
        ))}
      </div>

      <Surface>
        <SectionHeader title={t("dashboard.currentOpportunities")} />
        <div className="flex flex-col gap-0 divide-y divide-[var(--border-subtle)]">
          {Array.from({ length: 5 }, (_, index) => (
            <div className="px-4 py-3" key={index}>
              <Skeleton className="h-10 w-full" />
            </div>
          ))}
        </div>
      </Surface>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(18rem,22rem)]">
        <Surface>
          <SectionHeader title={t("dashboard.latestMonitoring")} />
          <div className="flex flex-col gap-0 divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="px-4 py-3" key={index}>
                <Skeleton className="h-10 w-full" />
              </div>
            ))}
          </div>
        </Surface>
        <div className="flex flex-col gap-4">
          <Surface>
            <SectionHeader title={t("dashboard.needsAttention")} />
            <div className="flex flex-col gap-0 divide-y divide-[var(--border-subtle)]">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="px-4 py-3" key={index}>
                  <Skeleton className="h-10 w-full" />
                </div>
              ))}
            </div>
          </Surface>
          <Surface>
            <SectionHeader title={t("dashboard.researchPipeline")} />
            <div className="flex flex-col gap-4 p-4">
              {Array.from({ length: 4 }, (_, index) => (
                <div className="flex flex-col gap-2" key={index}>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-1.5 w-full" />
                </div>
              ))}
            </div>
          </Surface>
        </div>
      </div>
    </div>
  );
}
