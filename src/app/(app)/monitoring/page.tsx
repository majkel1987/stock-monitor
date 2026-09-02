import { Calendar, ChevronDown, Search } from "lucide-react";

import { PageHeader } from "@/components/ui/terminal";
import { monitoringRecords } from "@/lib/mock-data/stock-monitor";

const columns =
  "grid-cols-[112px_70px_160px_60px_100px_138px_62px_170px_minmax(180px,1fr)_34px]";

function Filter({
  icon: Icon,
  children,
  wide = false,
}: {
  icon: typeof Search;
  children: string;
  wide?: boolean;
}) {
  return (
    <button
      className={`flex h-7 items-center gap-[7px] rounded-[5px] border border-[var(--border-default)] bg-[var(--bg-secondary)] px-[9px] text-[10px] text-[var(--text-secondary)] ${wide ? "w-[280px]" : "w-[170px]"}`}
      type="button"
    >
      <Icon aria-hidden="true" className="size-3 text-[var(--text-muted)]" />
      {children}
    </button>
  );
}

export default function MonitoringPage() {
  return (
    <div className="flex min-h-[1028px] flex-col gap-[18px] p-6">
      <PageHeader
        description="Chronological research log across every monitored company"
        title="Monitoring history"
      >
        <span className="font-mono text-[10px] text-[var(--text-muted)]">
          214 records
        </span>
      </PageHeader>
      <div className="flex h-[42px] items-center gap-2 rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px]">
        <Filter icon={Search} wide>
          Ticker, company or summary
        </Filter>
        <Filter icon={ChevronDown}>All markets</Filter>
        <Filter icon={ChevronDown}>All statuses</Filter>
        <Filter icon={Calendar}>Last 90 days</Filter>
      </div>
      <div className="h-[592px] overflow-hidden rounded-[7px] border border-[var(--border-default)] bg-[var(--surface-default)]">
        <div
          className={`grid h-[34px] items-center border-b border-[var(--border-subtle)] bg-[var(--bg-tertiary)] ${columns}`}
        >
          {[
            "Date",
            "Ticker",
            "Company",
            "Market",
            "Price",
            "Status",
            "Score",
            "Recommendation",
            "Summary",
          ].map((label) => (
            <span
              className="px-2 text-[9px] font-semibold text-[var(--text-muted)]"
              key={label}
            >
              {label}
            </span>
          ))}
          <ChevronDown
            aria-label="Expand"
            className="size-[13px] text-[var(--text-muted)]"
          />
        </div>
        {monitoringRecords.map((record, index) => (
          <article
            className={`grid h-[52px] items-center border-b border-[var(--border-subtle)] text-[10px] hover:bg-[var(--surface-hover)] ${columns} ${index === 0 ? "bg-[var(--surface-selected)]" : ""}`}
            key={`${record.ticker}-${record.date}`}
          >
            <time className="px-2">{record.date}</time>
            <strong className="px-2">{record.ticker}</strong>
            <span className="truncate px-2">{record.company}</span>
            <span className="px-2">{record.market}</span>
            <span className="px-2 font-mono">{record.price}</span>
            <span
              className={`truncate px-2 ${record.status === "STALE REVIEW" ? "text-[var(--negative)]" : ""}`}
            >
              {record.status}
            </span>
            <span className="px-2 font-mono text-[var(--accent-primary)]">
              {record.score}
            </span>
            <span className="truncate px-2">{record.recommendation}</span>
            <span className="truncate px-2">{record.summary}</span>
            <ChevronDown
              aria-hidden="true"
              className="size-[13px] text-[var(--text-muted)]"
            />
          </article>
        ))}
        <footer className="flex h-[38px] items-center justify-between bg-[var(--bg-tertiary)] px-3">
          <span className="font-mono text-[9px] text-[var(--text-muted)]">
            Showing 1–10 of 214 records
          </span>
          <span className="font-mono text-[10px] text-[var(--text-secondary)]">
            ‹&nbsp; 1&nbsp; 2&nbsp; 3&nbsp; …&nbsp; 22&nbsp; ›
          </span>
        </footer>
      </div>
    </div>
  );
}
