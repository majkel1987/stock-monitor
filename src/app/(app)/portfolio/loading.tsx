import { Skeleton } from "@/components/ui/skeleton";

export default function PortfolioLoading() {
  return (
    <div
      aria-label="Loading portfolio"
      className="page-frame flex flex-col gap-5"
    >
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-96 max-w-[70vw]" />
        </div>
        <Skeleton className="h-11 w-40" />
      </div>
      <div className="metric-strip">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-28 rounded-none" key={index} />
        ))}
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}
