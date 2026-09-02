"use client";

import { History, LayoutDashboard, List, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";

const navigation: ReadonlyArray<{
  href: string;
  label: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  matches: (pathname: string) => boolean;
}> = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    matches: (path) => path === "/dashboard" || path === "/monitoring/new",
  },
  {
    href: "/watchlist",
    label: "Watchlist",
    icon: List,
    matches: (path) => path === "/watchlist" || path.startsWith("/stocks/"),
  },
  {
    href: "/monitoring",
    label: "Monitoring",
    icon: History,
    matches: (path) => path === "/monitoring",
  },
  {
    href: "/settings/statuses",
    label: "Settings",
    icon: Settings,
    matches: (path) => path.startsWith("/settings"),
  },
];

function SidebarContents({ pathname }: { pathname?: string }) {
  return (
    <aside className="flex w-[208px] shrink-0 flex-col gap-5 border-r border-[var(--border-default)] bg-[var(--bg-secondary)] p-4">
      <Link className="flex h-9 items-center gap-[9px]" href="/dashboard">
        <span className="grid size-6 place-items-center rounded-[5px] bg-[var(--accent-primary)] font-mono text-[9px] font-bold text-[var(--bg-primary)]">
          SM
        </span>
        <span className="flex flex-col gap-px">
          <strong className="text-[11px] leading-[14px] font-bold">
            STOCK MONITOR
          </strong>
          <span className="font-mono text-[9px] leading-3 text-[var(--text-muted)]">
            GPW + USA
          </span>
        </span>
      </Link>
      <nav aria-label="Primary navigation" className="flex flex-col gap-1">
        {navigation.map((item) => {
          const active = pathname ? item.matches(pathname) : false;
          const Icon = item.icon;
          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={`relative flex h-[34px] items-center gap-[9px] rounded-[5px] px-[10px] text-xs font-semibold transition-colors ${active ? "bg-[var(--surface-selected)] text-[var(--text-primary)]" : "text-[var(--text-secondary)] hover:bg-[var(--surface-hover)] hover:text-[var(--text-primary)]"}`}
              href={item.href}
              key={item.href}
            >
              {active ? (
                <span
                  aria-hidden="true"
                  className="absolute left-0 h-5 w-0.5 bg-[var(--accent-primary)]"
                />
              ) : null}
              <Icon
                aria-hidden={true}
                className={`size-[15px] ${active ? "text-[var(--accent-primary)]" : "text-[var(--text-muted)]"}`}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex-1" />
      <div className="flex flex-col gap-[5px] border-t border-[var(--border-subtle)] px-2 pt-[10px]">
        <div className="flex items-center gap-[7px]">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-[var(--positive)]"
          />
          <span className="text-[9px] leading-3 font-semibold text-[var(--text-secondary)]">
            DATA PROVIDER ONLINE
          </span>
        </div>
        <span className="text-[9px] leading-3 text-[var(--text-muted)]">
          Delayed quotes · 15 min
        </span>
      </div>
    </aside>
  );
}

export function AppSidebar() {
  return <SidebarContents pathname={usePathname()} />;
}

export function AppSidebarFallback() {
  return <SidebarContents />;
}
