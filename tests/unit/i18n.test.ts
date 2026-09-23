import { describe, expect, it, vi } from "vitest";

import { dictionaries } from "@/i18n/dictionaries";
import {
  formatDate,
  formatPrice,
  formatRelativeTime,
} from "@/i18n/format";
import { persistLocaleClient, parseLocale } from "@/i18n/locale-cookie";
import { resolveStatusLabel } from "@/i18n/status";
import { createTranslator, translate } from "@/i18n/translate";
import type { TranslationKey } from "@/i18n/dictionaries";

describe("i18n dictionaries", () => {
  it("keeps EN and PL dictionary structures aligned", () => {
    const walk = (value: unknown, path: string[] = []): string[] => {
      if (typeof value === "string") return [path.join(".")];
      if (
        value &&
        typeof value === "object" &&
        ("one" in value || "other" in value)
      ) {
        return [path.join(".")];
      }
      return Object.entries(value as Record<string, unknown>).flatMap(
        ([key, nested]) => walk(nested, [...path, key]),
      );
    };

    expect(walk(dictionaries.pl).sort()).toEqual(walk(dictionaries.en).sort());
  });

  it("falls back to English when a key lookup returns nothing", () => {
    expect(translate("pl", "dashboard.title")).toBe("Pulpit");
    // Unknown keys are typed out of the public API; cast only for fallback coverage.
    expect(translate("pl", "missing.key" as TranslationKey)).toBe("missing.key");
    expect(translate("en", "dashboard.monitored")).toBe("Monitored");
  });
});

describe("i18n pluralization", () => {
  it("formats English relative day counts", () => {
    expect(translate("en", "relative.daysAgo", { count: 1 })).toBe("1d ago");
    expect(translate("en", "relative.daysAgo", { count: 3 })).toBe("3d ago");
  });

  it("formats Polish relative day counts with plural forms", () => {
    expect(translate("pl", "relative.daysAgo", { count: 1 })).toBe(
      "1 dzień temu",
    );
    expect(translate("pl", "relative.daysAgo", { count: 2 })).toBe(
      "2 dni temu",
    );
    expect(translate("pl", "relative.daysAgo", { count: 5 })).toBe(
      "5 dni temu",
    );
  });
});

describe("i18n formatting", () => {
  it("keeps EN price formatting and localizes PL prices", () => {
    expect(formatPrice("24.5", "PLN", "en")).toBe("24.5 PLN");
    expect(formatPrice("24.5", "PLN", "pl")).toBe("24,50 PLN");
    expect(formatPrice("275.12", "USD", "pl")).toBe("275,12 USD");
  });

  it("formats dates for the active locale without mutating the source", () => {
    const source = "2026-09-19T12:00:00.000Z";
    expect(formatDate(source, "en")).toMatch(/19/);
    expect(formatDate(source, "pl")).toMatch(/19/);
    expect(source).toBe("2026-09-19T12:00:00.000Z");
  });

  it("formats relative time for EN and PL", () => {
    const now = new Date("2026-09-21T12:00:00.000Z");
    const threeDaysAgo = "2026-09-18T12:00:00.000Z";
    expect(formatRelativeTime(threeDaysAgo, now, "en")).toBe("3d ago");
    expect(formatRelativeTime(threeDaysAgo, now, "pl")).toBe("3 dni temu");
  });
});

describe("status presentation mapping", () => {
  const t = createTranslator("pl");

  it("translates seeded status labels by slug", () => {
    expect(
      resolveStatusLabel({ slug: "BUY_CANDIDATE", label: "Buy Candidate" }, t),
    ).toBe("Kandydat do zakupu");
    expect(
      resolveStatusLabel(
        { slug: "WAIT_FOR_CORRECTION", label: "Wait for Correction" },
        t,
      ),
    ).toBe("Czekaj na korektę");
  });

  it("keeps customized user labels unchanged", () => {
    expect(
      resolveStatusLabel(
        { slug: "BUY_CANDIDATE", label: "Mój kandydat" },
        t,
      ),
    ).toBe("Mój kandydat");
  });

  it("keeps unknown custom status labels unchanged", () => {
    expect(
      resolveStatusLabel({ slug: "CUSTOM_ALPHA", label: "Alpha Idea" }, t),
    ).toBe("Alpha Idea");
  });
});

describe("locale persistence helpers", () => {
  it("parses supported locales and defaults to English", () => {
    expect(parseLocale("pl")).toBe("pl");
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("de")).toBe("en");
    expect(parseLocale(undefined)).toBe("en");
  });

  it("persists locale to cookie and localStorage", () => {
    const cookieSetter = vi.fn();
    Object.defineProperty(document, "cookie", {
      configurable: true,
      get: () => "",
      set: cookieSetter,
    });
    window.localStorage.clear();

    persistLocaleClient("pl");

    expect(cookieSetter).toHaveBeenCalled();
    expect(window.localStorage.getItem("stock-monitor-locale")).toBe("pl");
  });
});

describe("domain values stay untranslated", () => {
  it("does not translate market codes, tickers or currencies", () => {
    const t = createTranslator("pl");
    expect(t("filters.gpw")).toBe("GPW");
    expect(t("filters.usa")).toBe("USA");
    expect(formatPrice("10", "PLN", "pl")).toContain("PLN");
    expect(formatPrice("10", "USD", "pl")).toContain("USD");
  });

  it("uses typed keys rather than English source text", () => {
    const key: TranslationKey = "dashboard.currentOpportunities";
    expect(translate("en", key)).toBe("Current opportunities");
    expect(translate("pl", key)).toBe("Aktualne okazje");
  });
});
