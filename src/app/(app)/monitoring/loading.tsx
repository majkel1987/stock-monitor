import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/terminal";

export default function MonitoringLoading() {
  return (
    <div
      aria-label="Loading monitoring"
      className="page-frame flex flex-col gap-5"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-56" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full sm:w-36" />
      </div>

      <div className="flex flex-col gap-6 md:hidden">
        <div>
          <Skeleton className="mb-3 h-4 w-28" />
          <div className="flex flex-col gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Surface className="p-4" key={index}>
                <Skeleton className="h-5 w-24" />
                <Skeleton className="mt-2 h-4 w-40" />
                <Skeleton className="mt-3 h-6 w-28" />
                <Skeleton className="mt-3 h-7 w-36" />
                <Skeleton className="mt-4 h-12 w-full" />
              </Surface>
            ))}
          </div>
        </div>
      </div>

      <Surface className="hidden overflow-hidden md:block">
        <div className="border-b border-border bg-muted px-4 py-3">
          <Skeleton className="h-4 w-full max-w-4xl" />
        </div>
        {Array.from({ length: 7 }).map((_, index) => (
          <div
            className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
            key={index}
          >
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-36 flex-1" />
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-4 w-10" />
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-8 w-48" />
          </div>
        ))}
      </Surface>
    </div>
  );
}
