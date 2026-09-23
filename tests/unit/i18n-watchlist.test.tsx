import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { WatchlistQuery, WatchlistRow } from "@/application/watchlist/types";
import { WatchlistFilters } from "@/components/watchlist/watchlist-filters";
import { WatchlistTable } from "@/components/watchlist/watchlist-table";
import {
  formatDailyChange,
  formatMonitoringDate,
  formatPrice,
  freshnessPresentation,
} from "@/components/watchlist/format";
import { LocaleProvider } from "@/i18n/provider";
import { createTranslator, translate } from "@/i18n/translate";
import { resolveStatusLabel } from "@/i18n/status";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

vi.mock("@/app/(app)/watchlist/actions", () => ({
  archiveStockAction: vi.fn(),
  restoreStockAction: vi.fn(),
}));

const query: WatchlistQuery = {
  q: "",
  view: "active",
  staleOnly: false,
  unmonitoredOnly: false,
  sort: "priority",
  direction: "asc",
};

const row: WatchlistRow = {
  watchlistItemId: "wi-1",
  stockId: "s-1",
  ticker: "PZU",
  name: "PZU S.A.",
  market: { code: "GPW", name: "GPW", currency: "PLN" },
  currency: "PLN",
  dataMode: "provider",
  status: {
    id: "st-1",
    slug: "BUY_CANDIDATE",
    label: "Buy Candidate",
    colorToken: "positive",
    dashboardGroup: "opportunity",
    sortOrder: 10,
    isActive: true,
  },
  price: {
    value: "153.4",
    dayChangePct: "2.0",
    asOf: "2026-09-19T12:00:00.000Z",
    provider: "Stooq CSV",
    qualityStatus: "fresh",
  },
  lastMonitoring: {
    analyzedAt: "2026-09-17T12:00:00.000Z",
    investmentScore: 8,
  },
  displayOrder: 1,
  archivedAt: null,
};

const renderWithLocale = (locale: "en" | "pl", ui: ReactNode) =>
  render(<LocaleProvider locale={locale}>{ui}</LocaleProvider>);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("watchlist i18n presentation", () => {
  it("renders English watchlist labels", () => {
    renderWithLocale(
      "en",
      <>
        <WatchlistFilters
          markets={[
            { code: "GPW", name: "GPW", currency: "PLN" },
            { code: "USA", name: "USA", currency: "USD" },
          ]}
          query={query}
          statuses={[row.status]}
        />
        <WatchlistTable rows={[row]} />
      </>,
    );

    expect(
      screen.getAllByPlaceholderText("Search ticker or company").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("All markets").length).toBeGreaterThan(0);
    expect(screen.getAllByText("All statuses").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Stale price").length).toBeGreaterThan(0);
    expect(screen.getAllByText("No monitoring").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option", { name: "Active" }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("option", { name: "Sort: Priority ↑" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "Ticker" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Company" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Freshness" })).toBeTruthy();
    expect(screen.getAllByText("Buy Candidate").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Fresh").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PZU").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PZU S.A.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GPW").length).toBeGreaterThan(0);
    expect(screen.getByText("Stooq CSV")).toBeTruthy();
    expect(screen.getByText("153.4 PLN")).toBeTruthy();
  });

  it("renders Polish watchlist labels without mutating domain values", () => {
    renderWithLocale(
      "pl",
      <>
        <WatchlistFilters
          markets={[
            { code: "GPW", name: "GPW", currency: "PLN" },
            { code: "USA", name: "USA", currency: "USD" },
          ]}
          query={query}
          statuses={[
            row.status,
            {
              ...row.status,
              id: "st-custom",
              slug: "CUSTOM_ALPHA",
              label: "Moja strategia",
            },
          ]}
        />
        <WatchlistTable rows={[row]} />
      </>,
    );

    expect(
      screen.getAllByPlaceholderText("Szukaj tickera lub spółki").length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Wszystkie rynki").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Wszystkie statusy").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Nieaktualna cena").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Brak monitoringu").length).toBeGreaterThan(0);
    expect(screen.getAllByRole("option", { name: "Aktywne" }).length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("option", { name: "Sortowanie: Priorytet ↑" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByRole("columnheader", { name: "Ticker" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Spółka" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Świeżość" })).toBeTruthy();
    expect(screen.getAllByText("Kandydat do zakupu").length).toBeGreaterThan(0);
    expect(
      screen.getAllByRole("option", { name: "Moja strategia" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText("Aktualne").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PZU").length).toBeGreaterThan(0);
    expect(screen.getAllByText("PZU S.A.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GPW").length).toBeGreaterThan(0);
    expect(screen.getByText("Stooq CSV")).toBeTruthy();
    expect(screen.getByText("153,40 PLN")).toBeTruthy();
    expect(screen.getByText("+2,0%")).toBeTruthy();
  });

  it("keeps filter and sort option values language-independent", () => {
    renderWithLocale(
      "pl",
      <WatchlistFilters
        markets={[{ code: "GPW", name: "GPW", currency: "PLN" }]}
        query={query}
        statuses={[row.status]}
      />,
    );

    const marketSelect = screen.getAllByLabelText("Filtruj według rynku")[0]!;
    const viewSelect = screen.getAllByLabelText(
      "Pokaż aktywne lub zarchiwizowane spółki",
    )[0]!;
    const sortSelect = screen.getAllByLabelText("Sortuj watchlistę")[0]!;

    expect(
      within(marketSelect).getByRole("option", { name: "Wszystkie rynki" }),
    ).toHaveProperty("value", "all");
    expect(
      within(marketSelect).getByRole("option", { name: "GPW" }),
    ).toHaveProperty("value", "GPW");
    expect(
      within(viewSelect).getByRole("option", { name: "Aktywne" }),
    ).toHaveProperty("value", "active");
    expect(
      within(viewSelect).getByRole("option", { name: "Zarchiwizowane" }),
    ).toHaveProperty("value", "archived");
    expect(
      within(sortSelect).getByRole("option", {
        name: "Sortowanie: Priorytet ↑",
      }),
    ).toHaveProperty("value", "priority:asc");
    expect(
      within(sortSelect).getByRole("option", { name: "Ticker A–Z" }),
    ).toHaveProperty("value", "ticker:asc");
  });

  it("translates system statuses and preserves custom labels", () => {
    const t = createTranslator("pl");
    expect(
      resolveStatusLabel({ slug: "BUY_CANDIDATE", label: "Buy Candidate" }, t),
    ).toBe("Kandydat do zakupu");
    expect(
      resolveStatusLabel({ slug: "BUY_CANDIDATE", label: "Mój kandydat" }, t),
    ).toBe("Mój kandydat");
  });

  it("localizes freshness labels only in presentation", () => {
    const tEn = createTranslator("en");
    const tPl = createTranslator("pl");
    const enFresh = freshnessPresentation(row, "en", tEn);
    const plFresh = freshnessPresentation(row, "pl", tPl);
    const closedRow: WatchlistRow = {
      ...row,
      price: row.price
        ? { ...row.price, qualityStatus: "closed" }
        : null,
    };

    expect(row.price?.qualityStatus).toBe("fresh");
    expect(enFresh.label).toBe("Fresh");
    expect(plFresh.label).toBe("Aktualne");
    expect(plFresh.source).toBe("Stooq CSV");
    expect(freshnessPresentation(closedRow, "pl", tPl).label).toBe(
      "Rynek zamknięty",
    );
    expect(closedRow.price?.qualityStatus).toBe("closed");
  });

  it("formats dates and numbers with the active locale", () => {
    expect(formatPrice("153.4", "PLN", "en")).toBe("153.4 PLN");
    expect(formatPrice("153.4", "PLN", "pl")).toBe("153,40 PLN");
    expect(formatDailyChange("2.0", "en")).toBe("+2.0%");
    expect(formatDailyChange("2.0", "pl")).toBe("+2,0%");

    const source = "2026-09-17T12:00:00.000Z";
    const enDate = formatMonitoringDate(source, "en", "Not analyzed");
    const plDate = formatMonitoringDate(source, "pl", "Brak analizy");
    expect(enDate).toMatch(/17/);
    expect(plDate).toMatch(/17/);
    expect(formatMonitoringDate(null, "pl", "Brak analizy")).toBe(
      "Brak analizy",
    );
    expect(source).toBe("2026-09-17T12:00:00.000Z");
  });

  it("pluralizes active instrument summary for Polish", () => {
    expect(translate("pl", "watchlist.activeInstruments", { count: 1 })).toBe(
      "1 aktywny instrument",
    );
    expect(translate("pl", "watchlist.activeInstruments", { count: 2 })).toBe(
      "2 aktywne instrumenty",
    );
    expect(translate("pl", "watchlist.activeInstruments", { count: 5 })).toBe(
      "5 aktywnych instrumentów",
    );
    expect(translate("en", "watchlist.activeInstruments", { count: 9 })).toBe(
      "9 active instruments",
    );
  });
});
