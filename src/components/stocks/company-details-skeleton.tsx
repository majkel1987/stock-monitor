import { Skeleton } from "@/components/ui/skeleton";
import { Surface } from "@/components/ui/terminal";

export function CompanyDetailsSkeleton() {
  return (
    <div className="page-frame flex flex-col gap-5 sm:gap-6">
      <div className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-9 w-64 max-w-full" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="mt-1 h-6 w-28" />
        </div>
        <Surface className="flex flex-col gap-2 p-4 lg:min-w-[16rem] lg:items-end">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-8 w-36" />
          <Skeleton className="h-4 w-44" />
        </Surface>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row">
        <Skeleton className="h-11 w-full lg:w-40" />
        <div className="grid grid-cols-2 gap-2 lg:flex">
          <Skeleton className="h-11 w-full lg:w-36" />
          <Skeleton className="h-11 w-full lg:w-28" />
          <Skeleton className="h-11 w-full lg:w-28" />
          <Skeleton className="h-11 w-full lg:w-28" />
        </div>
      </div>

      <Surface className="p-4 sm:p-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div className="flex flex-col gap-2" key={index}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-6 w-10" />
              <Skeleton className="h-1 w-full" />
            </div>
          ))}
        </div>
      </Surface>

      <Surface>
        <div className="border-b border-[var(--border-subtle)] bg-muted/60 px-4 py-3">
          <Skeleton className="h-4 w-36" />
        </div>
        <div className="grid grid-cols-2 gap-3 p-4 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Surface className="p-4 shadow-none" key={index}>
              <Skeleton className="h-3 w-24" />
              <Skeleton className="mt-2 h-6 w-28" />
            </Surface>
          ))}
        </div>
      </Surface>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(17rem,32%)_minmax(0,1fr)]">
        <Surface>
          <div className="border-b border-[var(--border-subtle)] bg-muted/60 px-4 py-3">
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="p-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="mt-2 h-12 w-full" />
          </div>
        </Surface>
        <Surface>
          <div className="border-b border-[var(--border-subtle)] bg-muted/60 px-4 py-3">
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="p-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="mt-3 h-20 w-full" />
          </div>
        </Surface>
      </div>
    </div>
  );
}
