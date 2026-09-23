"use client";

import { LogOut, Search } from "lucide-react";
import type { ReactNode } from "react";
import { Suspense } from "react";

import { logout } from "@/app/(auth)/login/actions";
import type { MarketDataConfiguration } from "@/application/sync/market-data-configuration";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { formatDateTime } from "@/i18n/format";
import { useTranslate } from "@/i18n/provider";
import { RefreshMarketDataButton } from "./refresh-market-data-button";
import { AppSidebar, AppSidebarFallback } from "./app-sidebar";

function TopBar({
  lastSuccessfulSyncAt,
}: {
  lastSuccessfulSyncAt: string | null;
}) {
  const { t, locale } = useTranslate();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-end gap-2 border-b border-border bg-background px-3 sm:px-4 lg:justify-between lg:px-6">
      <label className="hidden h-9 w-full max-w-[360px] items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card/80 px-3 lg:flex">
        <Search aria-hidden="true" className="size-3.5 text-muted-foreground" />
        <input
          aria-label={t("topbar.globalSearch")}
          className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          placeholder={t("topbar.searchPlaceholder")}
          type="search"
        />
        <kbd className="rounded-[var(--radius-sm)] border border-border bg-muted px-1.5 py-0.5 font-mono text-[0.6875rem] leading-none text-muted-foreground">
          ⌘K
        </kbd>
      </label>
      <div className="flex items-center gap-1.5 sm:gap-2">
        <div className="hidden flex-col items-end gap-0 sm:flex">
          <span className="ui-meta font-semibold uppercase tracking-wider">
            {t("topbar.marketData")}
          </span>
          <span className="font-mono text-[0.75rem] leading-normal text-secondary-foreground">
            {lastSuccessfulSyncAt
              ? `${t("topbar.synced")} ${formatDateTime(lastSuccessfulSyncAt, locale)} CET`
              : t("topbar.neverSynced")}
          </span>
        </div>
        <RefreshMarketDataButton />
        <LanguageSwitcher />
        <ThemeToggle />
        <form action={logout}>
          <button
            aria-label={t("topbar.signOut")}
            className="grid size-9 place-items-center rounded-[var(--radius-md)] border border-border bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            title={t("topbar.signOut")}
            type="submit"
          >
            <LogOut aria-hidden="true" className="size-3.5" />
          </button>
        </form>
      </div>
    </header>
  );
}

export function AppShell({
  children,
  lastSuccessfulSyncAt,
  marketDataConfiguration,
}: Readonly<{
  children: ReactNode;
  lastSuccessfulSyncAt: string | null;
  marketDataConfiguration: MarketDataConfiguration;
}>) {
  return (
    <div className="flex min-h-screen bg-background">
      <Suspense
        fallback={
          <AppSidebarFallback
            marketDataConfiguration={marketDataConfiguration}
          />
        }
      >
        <AppSidebar marketDataConfiguration={marketDataConfiguration} />
      </Suspense>
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar lastSuccessfulSyncAt={lastSuccessfulSyncAt} />
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
