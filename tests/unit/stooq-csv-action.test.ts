import { beforeEach, describe, expect, it, vi } from "vitest";
import { importStooqCsvAction } from "@/app/(app)/market-data-actions";

const mocks = vi.hoisted(() => ({
  requireAllowedUser: vi.fn(),
  revalidatePath: vi.fn(),
  repository: {
    loadActiveGpwImportInstruments: vi.fn(),
    startRun: vi.fn(),
    finishRun: vi.fn(),
    importPrices: vi.fn(),
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("@/infrastructure/supabase/server/auth", () => ({
  requireAllowedUser: mocks.requireAllowedUser,
}));
vi.mock("@/infrastructure/supabase/server/create-service-client", () => ({
  createServiceClient: () => ({}),
}));
vi.mock("@/infrastructure/supabase/queries/market-data-sync", () => ({
  createSupabaseMarketDataSyncRepository: () => mocks.repository,
}));

function upload(payload: string) {
  const file = new File([payload], "daily.csv", { type: "text/csv" });
  const data = new FormData();
  data.set("stockId", "all");
  data.set("file", file);
  Object.defineProperty(data.get("file"), "text", {
    value: async () => payload,
  });
  return data;
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAllowedUser.mockResolvedValue({ id: "owner" });
  mocks.repository.loadActiveGpwImportInstruments.mockResolvedValue([
    {
      stockId: "pzu",
      providerSymbol: "PZU",
      provider: "STOOQ",
      market: "GPW",
      currency: "PLN",
    },
    {
      stockId: "xtb",
      providerSymbol: "XTB",
      provider: "STOOQ",
      market: "GPW",
      currency: "PLN",
    },
  ]);
  mocks.repository.startRun.mockResolvedValue("run");
  mocks.repository.finishRun.mockResolvedValue(undefined);
  mocks.repository.importPrices.mockResolvedValue({
    quoteUpdated: true,
    historyInsertedCount: 1,
  });
});

const csv =
  "Ticker,Date,Open,High,Low,Close,Volume\nPZU,2026-09-10,60,62,59,61,100\nXTB,2026-09-10,70,72,69,71,100";

describe("Stooq bulk import Server Action", () => {
  it("imports one uploaded file for the authenticated watchlist and refreshes affected views", async () => {
    const result = await importStooqCsvAction({ status: "idle" }, upload(csv));
    expect(result.status).toBe("success");
    expect(result.message).toContain("Zaktualizowano kursy: 2");
    expect(
      mocks.repository.loadActiveGpwImportInstruments,
    ).toHaveBeenCalledWith("owner");
    expect(mocks.repository.importPrices).toHaveBeenCalledTimes(2);
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/watchlist");
    expect(mocks.revalidatePath).toHaveBeenCalledWith(
      "/stocks/[market]/[ticker]",
      "page",
    );
  });

  it("refreshes views and returns a warning after partial persistence", async () => {
    mocks.repository.importPrices.mockRejectedValueOnce(
      new Error("unavailable"),
    );
    expect(
      await importStooqCsvAction({ status: "idle" }, upload(csv)),
    ).toMatchObject({ status: "partial" });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/watchlist");
  });

  it("requires authentication before processing any upload", async () => {
    mocks.requireAllowedUser.mockRejectedValueOnce(new Error("unauthorized"));
    await expect(
      importStooqCsvAction({ status: "idle" }, upload(csv)),
    ).rejects.toThrow("unauthorized");
    expect(
      mocks.repository.loadActiveGpwImportInstruments,
    ).not.toHaveBeenCalled();
    expect(mocks.repository.importPrices).not.toHaveBeenCalled();
  });

  it("instructs users to choose a single stock for a file without a ticker", async () => {
    const result = await importStooqCsvAction(
      { status: "idle" },
      upload("Date,Open,High,Low,Close,Volume\n2026-09-10,60,62,59,61,100"),
    );
    expect(result.status).toBe("error");
    expect(result.message).toContain("wybierz jedną spółkę");
    expect(mocks.repository.importPrices).not.toHaveBeenCalled();
  });
});
