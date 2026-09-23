import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/terminal";

export default function DataSettingsLoading() {
  return (
    <div className="page-frame flex min-w-0 flex-col gap-5 overflow-x-hidden sm:gap-6">
      <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-36" />
          <Skeleton className="h-4 w-80 max-w-full" />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Skeleton className="h-11 w-full sm:w-36" />
          <Skeleton className="h-11 w-full sm:w-36" />
        </div>
      </div>
      <Skeleton className="h-11 w-full max-w-md" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Surface className="p-4" key={index}>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-3 h-6 w-32" />
            <Skeleton className="mt-2 h-4 w-40" />
          </Surface>
        ))}
      </div>
      <Surface>
        <div className="border-b border-[var(--border-subtle)] bg-muted/60 px-4 py-3">
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="p-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="mt-2 h-12 w-full" />
        </div>
      </Surface>
    </div>
  );
}
