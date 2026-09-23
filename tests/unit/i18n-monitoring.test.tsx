import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";

import type { MonitoringTimelineItem } from "@/application/monitoring/history-types";
import { MonitoringMobileList } from "@/components/monitoring/monitoring-mobile-list";
import { MonitoringTable } from "@/components/monitoring/monitoring-table";
import {
  formatDecision,
  formatHistoryDate,
  formatPrice,
  formatSourceLabel,
} from "@/components/monitoring/format";
import { LocaleProvider } from "@/i18n/provider";
import { resolveStatusLabel } from "@/i18n/status";
import { createTranslator, translate } from "@/i18n/translate";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn(), refresh: vi.fn() }),
}));

const record: MonitoringTimelineItem = {
  id: "m-1",
  analyzedAt: "2026-09-19T10:00:00.000Z",
  ticker: "CDW",
  companyName: "CDW Corporation",
  marketCode: "USA",
  price: "146.19",
  currency: "USD",
  statusSlug: "BUY_CANDIDATE",
  statusLabel: "Buy Candidate",
  investmentScore: 75,
  decisionAction: "BUY_GRADUALLY",
  summary: "CDW to wysokiej jakości pośrednik/Integrator IT...",
  sourceType: "json_import",
};

const customStatusRecord: MonitoringTimelineItem = {
  ...record,
  id: "m-2",
  ticker: "XTB",
  companyName: "XTB S.A.",
  marketCode: "GPW",
  price: "148.4",
  currency: "PLN",
  statusSlug: "BUY_CANDIDATE",
  statusLabel: "Moja strategia",
  decisionAction: "WATCH",
  summary: "Custom thesis remains unchanged.",
  sourceType: "manual",
};

const renderWithLocale = (locale: "en" | "pl", ui: ReactNode) =>
  render(<LocaleProvider locale={locale}>{ui}</LocaleProvider>);

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe("monitoring i18n presentation", () => {
  it("renders English monitoring labels", () => {
    renderWithLocale(
      "en",
      <>
        <h1>{translate("en", "monitoring.title")}</h1>
        <p>{translate("en", "monitoring.subtitle")}</p>
        <button type="button">{translate("en", "monitoring.importJson")}</button>
        <MonitoringTable records={[record]} />
      </>,
    );

    expect(
      screen.getByRole("heading", { name: "Monitoring history" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Chronological research log across every monitored company",
      ),
    ).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import JSON" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Date" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Ticker" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Company" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Market" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Price" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Score" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Decision" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Summary" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Source" })).toBeTruthy();
    expect(screen.getByText("Buy Candidate")).toBeTruthy();
    expect(screen.getByText("Buy Gradually")).toBeTruthy();
    expect(screen.getByText("JSON Import")).toBeTruthy();
    expect(screen.getByText("Showing 1–1 of 1 record")).toBeTruthy();
    expect(screen.getAllByText("CDW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CDW Corporation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("USA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("146.19 USD").length).toBeGreaterThan(0);
    expect(
      screen.getByText("CDW to wysokiej jakości pośrednik/Integrator IT..."),
    ).toBeTruthy();
  });

  it("renders Polish monitoring labels without mutating domain values", () => {
    renderWithLocale(
      "pl",
      <>
        <h1>{translate("pl", "monitoring.title")}</h1>
        <p>{translate("pl", "monitoring.subtitle")}</p>
        <button type="button">{translate("pl", "monitoring.importJson")}</button>
        <MonitoringTable records={[record, customStatusRecord]} />
        <MonitoringMobileList records={[record]} />
      </>,
    );

    expect(
      screen.getByRole("heading", { name: "Historia monitoringu" }),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "Chronologiczna historia analiz wszystkich monitorowanych spółek",
      ),
    ).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Importuj JSON" }),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Data" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Ticker" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Spółka" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Rynek" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Cena" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Status" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Ocena" })).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Decyzja" })).toBeTruthy();
    expect(
      screen.getByRole("columnheader", { name: "Podsumowanie" }),
    ).toBeTruthy();
    expect(screen.getByRole("columnheader", { name: "Źródło" })).toBeTruthy();

    expect(screen.getAllByText("Kandydat do zakupu").length).toBeGreaterThan(0);
    expect(screen.getByText("Moja strategia")).toBeTruthy();
    expect(screen.getAllByText("Buy Gradually").length).toBeGreaterThan(0);
    expect(screen.getByText("Watch")).toBeTruthy();
    expect(screen.getAllByText("Import JSON").length).toBeGreaterThan(0);
    expect(screen.getByText("Ręczny")).toBeTruthy();
    expect(screen.getByText("Wyświetlanie 1–2 z 2 wpisów")).toBeTruthy();
    expect(screen.getAllByText("CDW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("CDW Corporation").length).toBeGreaterThan(0);
    expect(screen.getAllByText("USA").length).toBeGreaterThan(0);
    expect(screen.getAllByText("XTB").length).toBeGreaterThan(0);
    expect(screen.getAllByText("XTB S.A.").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GPW").length).toBeGreaterThan(0);
    expect(screen.getAllByText("146,19 USD").length).toBeGreaterThan(0);
    expect(screen.getAllByText("148,40 PLN").length).toBeGreaterThan(0);
    expect(
      screen.getAllByText(
        "CDW to wysokiej jakości pośrednik/Integrator IT...",
      ).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText("Custom thesis remains unchanged.")).toBeTruthy();
  });

  it("localizes dates and keeps decision formatting language-independent", () => {
    const source = "2026-09-19T10:00:00.000Z";
    expect(formatHistoryDate(source, "en")).toMatch(/Sept|Sep/);
    expect(formatHistoryDate(source, "pl")).toMatch(/wrz/i);
    expect(formatDecision("BUY_GRADUALLY")).toBe("Buy Gradually");
    expect(formatPrice("275.12", "USD", "pl")).toBe("275,12 USD");
  });

  it("localizes system status labels and keeps custom labels", () => {
    const t = createTranslator("pl");
    expect(
      resolveStatusLabel(
        { slug: "BUY_CANDIDATE", label: "Buy Candidate" },
        t,
      ),
    ).toBe("Kandydat do zakupu");
    expect(
      resolveStatusLabel(
        { slug: "BUY_CANDIDATE", label: "Moja strategia" },
        t,
      ),
    ).toBe("Moja strategia");
  });

  it("localizes source presentation only", () => {
    const t = createTranslator("pl");
    expect(formatSourceLabel("json_import", t)).toBe("Import JSON");
    expect(formatSourceLabel("manual", t)).toBe("Ręczny");
    expect(formatSourceLabel("api_import", t)).toBe("Import API");
  });

  it("pluralizes Polish monitoring record ranges", () => {
    expect(
      translate("pl", "monitoring.recordsRange", {
        count: 1,
        from: 1,
        to: 1,
      }),
    ).toBe("Wyświetlanie 1–1 z 1 wpisu");
    expect(
      translate("pl", "monitoring.recordsRange", {
        count: 2,
        from: 1,
        to: 2,
      }),
    ).toBe("Wyświetlanie 1–2 z 2 wpisów");
    expect(
      translate("pl", "monitoring.recordsRange", {
        count: 5,
        from: 1,
        to: 5,
      }),
    ).toBe("Wyświetlanie 1–5 z 5 wpisów");
    expect(
      translate("pl", "monitoring.recordsRange", {
        count: 22,
        from: 1,
        to: 22,
      }),
    ).toBe("Wyświetlanie 1–22 z 22 wpisów");
  });

  it("exposes import JSON UI labels in both locales", () => {
    expect(translate("en", "monitoring.importJson")).toBe("Import JSON");
    expect(translate("pl", "monitoring.importJson")).toBe("Importuj JSON");
    expect(translate("en", "monitoring.import.selectJsonFile")).toBe(
      "Select JSON file",
    );
    expect(translate("pl", "monitoring.import.selectJsonFile")).toBe(
      "Wybierz plik JSON",
    );
    expect(translate("en", "monitoring.import.title")).toBe(
      "Import monitoring JSON",
    );
    expect(translate("pl", "monitoring.import.title")).toBe(
      "Importuj monitoring JSON",
    );
  });
});
