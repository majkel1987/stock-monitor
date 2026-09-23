"use client";

import {
  BriefcaseBusiness,
  ChartNoAxesCombined,
  History,
  LayoutDashboard,
  List,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentType } from "react";

import type { MarketDataConfiguration } from "@/application/sync/market-data-configuration";
import { useT } from "@/i18n/provider";
import type { TranslationKey } from "@/i18n/dictionaries";
import { cn } from "@/lib/utils/cn";

const SIDEBAR_STORAGE_KEY = "stock-monitor-sidebar-collapsed";

const navigation: ReadonlyArray<{
  href: string;
  labelKey: TranslationKey;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  matches: (pathname: string) => boolean;
}> = [
  {
    href: "/dashboard",
    labelKey: "navigation.dashboard",
    icon: LayoutDashboard,
    matches: (path) => path === "/dashboard" || path === "/monitoring/new",
  },
  {
    href: "/watchlist",
    labelKey: "navigation.watchlist",
    icon: List,
    matches: (path) => path === "/watchlist" || path.startsWith("/stocks/"),
  },
  {
    href: "/portfolio",
    labelKey: "navigation.portfolio",
    icon: BriefcaseBusiness,
    matches: (path) => path.startsWith("/portfolio"),
  },
  {
    href: "/monitoring",
    labelKey: "navigation.monitoring",
    icon: History,
    matches: (path) => path.startsWith("/monitoring"),
  },
  {
    href: "/settings/statuses",
    labelKey: "navigation.settings",
    icon: Settings,
    matches: (path) => path.startsWith("/settings"),
  },
];

function SidebarContents({
  pathname,
  marketDataConfiguration = "incomplete",
  collapsed,
  onToggleCollapsed,
}: {
  pathname?: string;
  marketDataConfiguration?: MarketDataConfiguration;
  collapsed: boolean;
  onToggleCollapsed: () => void;
}) {
  const t = useT();
  const ready = marketDataConfiguration === "ready";
  const incomplete = marketDataConfiguration === "incomplete";

  const statusLabel = ready
    ? t("sidebar.marketDataReady")
    : incomplete
      ? t("sidebar.configIncomplete")
      : t("sidebar.gpwCsvMode");
  const statusShort = ready
    ? t("sidebar.marketDataReadyShort")
    : incomplete
      ? t("sidebar.configIncompleteShort")
      : t("sidebar.gpwCsvModeShort");
  const statusDetail = ready
    ? t("sidebar.marketDataReadyDetail")
    : incomplete
      ? t("sidebar.configIncompleteDetail")
      : t("sidebar.gpwCsvModeDetail");

  return (
    <aside
      className={cn(
        "sticky top-0 flex h-dvh w-[4.25rem] shrink-0 flex-col items-center gap-4 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground",
        collapsed ? "md:w-[4.25rem]" : "md:w-[240px] md:items-stretch md:p-4",
      )}
    >
      <div
        className={cn(
          "flex w-full flex-col items-center gap-2",
          !collapsed && "md:flex-row md:justify-between",
        )}
      >
        <Link
          aria-label={`${t("brand.name")}, ${t("brand.markets")}`}
          className={cn(
            "flex items-center justify-center",
            !collapsed && "md:justify-start md:gap-2.5",
          )}
          href="/dashboard"
        >
          <span
            aria-hidden="true"
            className="grid size-9 place-items-center rounded-[var(--radius-md)] bg-sidebar-primary text-sidebar-primary-foreground shadow-[var(--shadow-sm)]"
          >
            <ChartNoAxesCombined className="size-4" />
          </span>
          {collapsed ? (
            <span className="sr-only">{t("brand.markets")}</span>
          ) : (
            <span className="hidden flex-col gap-0.5 md:flex">
              <strong className="text-sm leading-none font-semibold tracking-tight">
                {t("brand.name")}
              </strong>
              <span className="font-mono text-[0.6875rem] leading-none tracking-wide text-muted-foreground uppercase">
                {t("brand.markets")}
              </span>
            </span>
          )}
        </Link>
        <button
          aria-expanded={!collapsed}
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
          className="hidden size-9 place-items-center rounded-[var(--radius-md)] text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground md:grid"
          onClick={onToggleCollapsed}
          type="button"
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden="true" className="size-4" />
          ) : (
            <PanelLeftClose aria-hidden="true" className="size-4" />
          )}
        </button>
      </div>
      <nav
        aria-label={t("navigation.primary")}
        className="flex w-full flex-col gap-0.5"
      >
        {navigation.map((item) => {
          const active = pathname ? item.matches(pathname) : false;
          const Icon = item.icon;
          const label = t(item.labelKey);
          return (
            <Link
              aria-current={active ? "page" : undefined}
              aria-label={label}
              className={cn(
                "relative flex min-h-10 items-center justify-center rounded-[var(--radius-md)] px-0 text-sm font-medium transition-colors",
                !collapsed && "md:justify-start md:gap-2.5 md:px-3",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-secondary-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
              href={item.href}
              key={item.href}
              title={collapsed ? label : undefined}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute left-0 h-5 w-0.5 rounded-r-full bg-sidebar-primary",
                    collapsed ? "block" : "hidden md:block",
                  )}
                />
              ) : null}
              <Icon
                aria-hidden={true}
                className={cn(
                  "size-4",
                  active ? "text-sidebar-primary" : "text-muted-foreground",
                )}
              />
              {collapsed ? null : (
                <span className="hidden md:inline">{label}</span>
              )}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <div
        className={cn(
          "flex flex-col items-center gap-1.5 border-t border-sidebar-border px-0 pt-3",
          !collapsed && "md:items-stretch md:px-1",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={cn(
              "size-2 shrink-0 rounded-full",
              ready
                ? "bg-positive"
                : incomplete
                  ? "bg-negative"
                  : "bg-warning",
            )}
            title={statusShort}
          />
          {collapsed ? (
            <span className="sr-only">{statusShort}</span>
          ) : (
            <>
              <span className="sr-only md:hidden">{statusShort}</span>
              <span className="hidden text-[0.75rem] leading-normal font-semibold text-secondary-foreground md:inline">
                {statusLabel}
              </span>
            </>
          )}
        </div>
        {collapsed ? null : (
          <span className="ui-meta hidden md:block">{statusDetail}</span>
        )}
      </div>
    </aside>
  );
}

const SIDEBAR_EVENT = "stock-monitor-sidebar";

const subscribeSidebar = (onStoreChange: () => void) => {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_EVENT, onStoreChange);
  };
};

const getCollapsedSidebar = () =>
  window.localStorage.getItem(SIDEBAR_STORAGE_KEY) === "1";

function useCollapsedSidebar() {
  const collapsed = useSyncExternalStore(
    subscribeSidebar,
    getCollapsedSidebar,
    () => false,
  );

  const handleToggleCollapsed = () => {
    window.localStorage.setItem(SIDEBAR_STORAGE_KEY, collapsed ? "0" : "1");
    window.dispatchEvent(new Event(SIDEBAR_EVENT));
  };

  return { collapsed, handleToggleCollapsed };
}

export function AppSidebar({
  marketDataConfiguration,
}: {
  marketDataConfiguration: MarketDataConfiguration;
}) {
  const { collapsed, handleToggleCollapsed } = useCollapsedSidebar();
  return (
    <SidebarContents
      pathname={usePathname()}
      marketDataConfiguration={marketDataConfiguration}
      collapsed={collapsed}
      onToggleCollapsed={handleToggleCollapsed}
    />
  );
}

export function AppSidebarFallback({
  marketDataConfiguration,
}: {
  marketDataConfiguration: MarketDataConfiguration;
}) {
  return (
    <SidebarContents
      marketDataConfiguration={marketDataConfiguration}
      collapsed={false}
      onToggleCollapsed={() => undefined}
    />
  );
}
