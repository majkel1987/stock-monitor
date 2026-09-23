import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";
import { CurrentOpportunities } from "@/components/dashboard/current-opportunities";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { LocaleProvider } from "@/i18n/provider";
import type { OpportunityRow } from "@/application/dashboard/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
  usePathname: () => "/dashboard",
}));

vi.mock("@/app/(app)/market-data-actions", () => ({
  refreshMarketDataAction: async () => ({ status: "idle" as const }),
}));

const opportunity: OpportunityRow = {
  stockId: "1",
  ticker: "PZU",
  name: "PZU SA",
  marketCode: "GPW",
  currency: "PLN",
  status: {
    id: "s1",
    slug: "BUY_CANDIDATE",
    label: "Buy Candidate",
    colorToken: "positive",
    dashboardGroup: "opportunity",
    sortOrder: 10,
  },
  quote: {
    price: "24.5",
    currency: "PLN",
    dayChangePct: null,
    asOf: "2026-09-19T12:00:00.000Z",
    provider: "stooq",
    qualityStatus: "fresh",
  },
  investmentScore: 8,
  nearestBuyLevel: null,
  lastAnalysisAt: null,
};

const renderWithLocale = (locale: "en" | "pl", ui: ReactNode) =>
  render(<LocaleProvider locale={locale}>{ui}</LocaleProvider>);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("dashboard i18n rendering", () => {
  it("renders dashboard chrome in English", () => {
    renderWithLocale(
      "en",
      <>
        <DashboardHeader
          freshness={{ status: "current", lastQuoteAsOf: null }}
          lastSuccessfulSyncAt={null}
          market="ALL"
          now={new Date("2026-09-21T12:00:00.000Z")}
        />
        <DashboardStats
          kpis={{
            monitored: 4,
            gpw: 2,
            usa: 2,
            buyCandidates: 1,
            deepDive: 0,
            portfolio: 1,
            needsAttention: 0,
            lastAnalysisAt: null,
          }}
        />
        <CurrentOpportunities rows={[opportunity]} />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    expect(screen.getByText("Monitored")).toBeTruthy();
    expect(screen.getByText("Current opportunities")).toBeTruthy();
    expect(screen.getAllByText("Buy Candidate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PZU").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GPW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("24.5 PLN").length).toBeGreaterThan(0);
  });

  it("renders dashboard chrome in Polish", () => {
    window.localStorage.setItem("stock-monitor-locale", "pl");

    renderWithLocale(
      "pl",
      <>
        <DashboardHeader
          freshness={{ status: "stale", lastQuoteAsOf: null }}
          lastSuccessfulSyncAt={null}
          market="ALL"
          now={new Date("2026-09-21T12:00:00.000Z")}
        />
        <DashboardStats
          kpis={{
            monitored: 4,
            gpw: 2,
            usa: 2,
            buyCandidates: 1,
            deepDive: 0,
            portfolio: 1,
            needsAttention: 0,
            lastAnalysisAt: null,
          }}
        />
        <CurrentOpportunities rows={[opportunity]} />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Pulpit" })).toBeTruthy();
    expect(screen.getByText("Monitorowane")).toBeTruthy();
    expect(screen.getByText("Aktualne okazje")).toBeTruthy();
    expect(screen.getAllByText("Kandydat do zakupu").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PZU").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GPW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("24,50 PLN").length).toBeGreaterThan(0);
    expect(screen.getByText("Nieaktualne")).toBeTruthy();
  });

  it("updates UI when the language switcher changes locale", () => {
    window.localStorage.setItem("stock-monitor-locale", "en");

    renderWithLocale(
      "en",
      <>
        <LanguageSwitcher />
        <DashboardHeader
          freshness={{ status: "current", lastQuoteAsOf: null }}
          lastSuccessfulSyncAt={null}
          market="ALL"
          now={new Date("2026-09-21T12:00:00.000Z")}
        />
      </>,
    );

    expect(screen.getByRole("heading", { name: "Dashboard" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Switch to Polish" }));
    expect(window.localStorage.getItem("stock-monitor-locale")).toBe("pl");
    expect(screen.getByRole("heading", { name: "Pulpit" })).toBeTruthy();
  });
});
