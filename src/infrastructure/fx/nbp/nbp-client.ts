import "server-only";

import { fetchWithRetry } from "@/infrastructure/http/fetch-with-retry";

export class NbpError extends Error {
  constructor(
    public readonly code: "fx_unavailable" | "provider_invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "NbpError";
  }
}

export interface NbpClient {
  getUsdRate(date?: Date): Promise<unknown>;
}

export class HttpNbpClient implements NbpClient {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 8_000,
    private readonly deadlineAtMs = Number.POSITIVE_INFINITY,
  ) {}

  async getUsdRate(date?: Date) {
    const datePath = date ? `/${date.toISOString().slice(0, 10)}` : "";
    const url = `https://api.nbp.pl/api/exchangerates/rates/A/USD${datePath}/?format=json`;

    let response: Response;
    try {
      response = await fetchWithRetry(
        url,
        { headers: { Accept: "application/json" }, cache: "no-store" },
        {
          fetcher: this.fetcher,
          timeoutMs: this.timeoutMs,
          deadlineAtMs: this.deadlineAtMs,
        },
      );
    } catch {
      throw new NbpError("fx_unavailable", "NBP could not be reached.");
    }

    if (!response.ok) {
      throw new NbpError("fx_unavailable", "NBP rate is unavailable.");
    }
    try {
      return await response.json();
    } catch {
      throw new NbpError(
        "provider_invalid_response",
        "NBP returned invalid JSON.",
      );
    }
  }
}
