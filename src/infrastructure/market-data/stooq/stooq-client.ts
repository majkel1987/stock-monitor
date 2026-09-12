import "server-only";

import { fetchWithRetry } from "@/infrastructure/http/fetch-with-retry";
import { StooqError } from "./stooq-errors";

const STOOQ_BASE_URL = "https://stooq.com/q/d/l/";

export interface StooqClient {
  dailyHistory(symbol: string, from: string, to: string): Promise<string>;
}

export class HttpStooqClient implements StooqClient {
  constructor(
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 10_000,
    private readonly deadlineAtMs = Number.POSITIVE_INFINITY,
  ) {}

  async dailyHistory(symbol: string, from: string, to: string) {
    const url = new URL(STOOQ_BASE_URL);
    url.search = new URLSearchParams({
      s: symbol.toLowerCase(),
      d1: from,
      d2: to,
      i: "d",
    }).toString();

    let response: Response;
    try {
      response = await fetchWithRetry(
        url,
        { headers: { Accept: "text/csv,text/plain" }, cache: "no-store" },
        {
          fetcher: this.fetcher,
          timeoutMs: this.timeoutMs,
          deadlineAtMs: this.deadlineAtMs,
          maxAttempts: 2,
        },
      );
    } catch {
      throw new StooqError(
        "provider_unavailable",
        "Stooq could not be reached.",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new StooqError(
        "provider_authentication_failed",
        "Stooq authentication failed.",
      );
    }
    if (response.status === 429) {
      throw new StooqError(
        "provider_rate_limited",
        "Stooq rate limit was reached.",
      );
    }
    if (!response.ok) {
      throw new StooqError(
        "provider_unavailable",
        `Stooq request failed with status ${response.status}.`,
      );
    }
    return response.text();
  }
}
