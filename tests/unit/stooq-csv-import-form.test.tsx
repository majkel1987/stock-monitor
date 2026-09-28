import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { StooqCsvImportForm } from "@/components/settings/stooq-csv-import-form";

vi.mock("@/app/(app)/market-data-actions", () => ({
  importStooqCsvAction: vi.fn(),
}));
afterEach(cleanup);

describe("Stooq CSV import scope", () => {
  it("defaults to all watched GPW stocks and allows a single-stock import", () => {
    render(
      <StooqCsvImportForm
        targets={[{ stockId: "pzu", ticker: "PZU", name: "PZU SA" }]}
      />,
    );
    const scope = screen.getByLabelText(
      "Zakres importu GPW",
    ) as HTMLSelectElement;
    expect(scope.value).toBe("all");
    fireEvent.change(scope, { target: { value: "pzu" } });
    expect(scope.value).toBe("pzu");
    expect(screen.getByText(/Dla pliku bez Ticker/)).toBeTruthy();
  });

  it("disables submission for an empty GPW watchlist", () => {
    render(<StooqCsvImportForm targets={[]} />);
    expect(
      (screen.getByLabelText("Zakres importu GPW") as HTMLSelectElement)
        .disabled,
    ).toBe(true);
    expect(
      (screen.getByText("Import CSV").closest("button") as HTMLButtonElement)
        .disabled,
    ).toBe(true);
  });
});
