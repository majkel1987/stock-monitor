import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/terminal";

export default function WatchlistLoading() {
  return (
    <div className="page-frame flex flex-col gap-5">
      <div className="flex min-h-12 flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-4">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-11 w-32" />
      </div>

      <Surface padded>
        <div className="flex flex-col gap-3 md:flex-row md:flex-wrap">
          <Skeleton className="h-10 w-full max-w-xs" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-36" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="ml-auto hidden h-10 w-40 md:block" />
        </div>
      </Surface>

      <div className="flex flex-col gap-3 md:hidden">
        {Array.from({ length: 3 }).map((_, index) => (
          <Surface className="p-4" key={index}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="mt-3 h-6 w-28" />
            <Skeleton className="mt-3 h-7 w-36" />
            <Skeleton className="mt-4 h-4 w-full" />
          </Surface>
        ))}
      </div>

      <Surface className="hidden overflow-hidden md:block">
        <div className="border-b border-border bg-muted px-4 py-2.5">
          <Skeleton className="h-3 w-full max-w-3xl" />
        </div>
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3 last:border-b-0"
            key={index}
          >
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-4 w-36 flex-1" />
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-14" />
            <Skeleton className="h-6 w-28" />
          </div>
        ))}
      </Surface>
    </div>
  );
}
