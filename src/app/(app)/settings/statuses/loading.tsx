import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/terminal";

export default function StatusSettingsLoading() {
  return (
    <div className="page-frame flex min-w-0 flex-col gap-5 overflow-x-hidden sm:gap-6">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
        <Skeleton className="h-11 w-full sm:w-36" />
      </div>

      <Skeleton className="h-11 w-full max-w-md" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
        <div className="flex flex-col gap-3 md:hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <Surface className="p-4" key={index}>
              <Skeleton className="h-5 w-40" />
              <Skeleton className="mt-2 h-4 w-56 max-w-full" />
              <Skeleton className="mt-3 h-6 w-28" />
            </Surface>
          ))}
        </div>

        <Surface className="hidden overflow-hidden md:block">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-3.5 last:border-b-0"
              key={index}
            >
              <Skeleton className="size-6" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="mt-2 h-3 w-56 max-w-full" />
              </div>
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </Surface>

        <Surface className="hidden p-6 lg:block">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-56" />
          <Skeleton className="mt-6 h-11 w-full" />
          <Skeleton className="mt-5 h-11 w-full" />
          <Skeleton className="mt-5 h-11 w-full" />
          <Skeleton className="mt-5 h-20 w-full" />
        </Surface>
      </div>
    </div>
  );
}
