import { Search } from "lucide-react";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { logout } from "@/app/(auth)/login/actions";
import { RefreshMarketDataButton } from "./refresh-market-data-button";
import { AppSidebar, AppSidebarFallback } from "./app-sidebar";

const syncFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Europe/Warsaw",
});

function TopBar({
  lastSuccessfulSyncAt,
}: {
  lastSuccessfulSyncAt: string | null;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-[52px] items-center justify-between border-b border-[var(--border-default)] bg-[var(--bg-secondary)] px-6">
      <label className="flex h-[30px] w-[360px] items-center gap-2 rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-default)] px-[10px]">
        <Search
          aria-hidden="true"
          className="size-[14px] text-[var(--text-muted)]"
        />
        <input
          aria-label="Global search"
          className="min-w-0 flex-1 bg-transparent text-[11px] text-[var(--text-primary)] outline-none"
          placeholder="Search ticker, company or note…"
          type="search"
        />
        <kbd className="rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-[5px] py-[2px] font-mono text-[9px] leading-3 text-[var(--text-muted)]">
          Ctrl K
        </kbd>
      </label>
      <div className="flex h-8 items-center gap-3">
        <div className="flex h-[27px] flex-col items-end gap-0.5">
          <span className="text-[9px] leading-3 font-semibold text-[var(--text-muted)]">
            MARKET DATA
          </span>
          <span className="font-mono text-[10px] leading-[13px] text-[var(--text-secondary)]">
            {lastSuccessfulSyncAt
              ? `Synced ${syncFormatter.format(new Date(lastSuccessfulSyncAt))} CET`
              : "Never synced"}
          </span>
        </div>
        <RefreshMarketDataButton />
        <form action={logout}>
          <button
            aria-label="Sign out"
            className="grid size-7 place-items-center rounded-[5px] border border-[var(--border-default)] bg-[var(--surface-elevated)] font-mono text-[9px] font-semibold text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
            title="Sign out"
            type="submit"
          >
            MK
          </button>
        </form>
      </div>
    </header>
  );
}

export function AppShell({
  children,
  lastSuccessfulSyncAt,
  providerConfigured,
}: Readonly<{
  children: ReactNode;
  lastSuccessfulSyncAt: string | null;
  providerConfigured: boolean;
}>) {
  return (
    <div className="flex min-h-screen min-w-[1180px] bg-[var(--bg-primary)]">
      <Suspense
        fallback={
          <AppSidebarFallback providerConfigured={providerConfigured} />
        }
      >
        <AppSidebar providerConfigured={providerConfigured} />
      </Suspense>
      <div className="min-w-0 flex-1">
        <TopBar lastSuccessfulSyncAt={lastSuccessfulSyncAt} />
        <main>{children}</main>
      </div>
    </div>
  );
}
