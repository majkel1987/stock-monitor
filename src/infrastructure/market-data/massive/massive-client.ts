import "server-only";

import { fetchWithRetry } from "@/infrastructure/http/fetch-with-retry";
import { MassiveError } from "./massive-errors";

const MASSIVE_BASE_URL = "https://api.massive.com";
const BASIC_PLAN_REQUEST_INTERVAL_MS = 12_100;

export interface MassiveClient {
  search(query: string): Promise<unknown>;
  previousDay(symbol: string): Promise<unknown>;
}

type RateLimitOptions = {
  sleep?: (delayMs: number) => Promise<void>;
  now?: () => number;
};

export class HttpMassiveClient implements MassiveClient {
  private nextRequestAtMs = 0;
  private readonly sleep: (delayMs: number) => Promise<void>;
  private readonly now: () => number;

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 8_000,
    private readonly deadlineAtMs = Number.POSITIVE_INFINITY,
    rateLimitOptions: RateLimitOptions = {},
  ) {
    this.sleep =
      rateLimitOptions.sleep ??
      ((delayMs) =>
        new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
    this.now = rateLimitOptions.now ?? Date.now;
  }

  private async throttle() {
    const delayMs = Math.max(0, this.nextRequestAtMs - this.now());
    if (this.now() + delayMs >= this.deadlineAtMs - 1_000) {
      throw new MassiveError(
        "provider_unavailable",
        "Massive synchronization deadline was reached.",
      );
    }
    if (delayMs > 0) await this.sleep(delayMs);
    this.nextRequestAtMs = this.now() + BASIC_PLAN_REQUEST_INTERVAL_MS;
  }

  private async get(path: string, params: Record<string, string>) {
    await this.throttle();
    const url = new URL(path, MASSIVE_BASE_URL);
    url.search = new URLSearchParams({
      ...params,
      apiKey: this.apiKey,
    }).toString();

    let response: Response;
    try {
      response = await fetchWithRetry(
        url,
        { headers: { Accept: "application/json" }, cache: "no-store" },
        {
          fetcher: this.fetcher,
          timeoutMs: this.timeoutMs,
          deadlineAtMs: this.deadlineAtMs,
          maxAttempts: 2,
          retryRateLimits: false,
        },
      );
    } catch {
      throw new MassiveError(
        "provider_unavailable",
        "Massive could not be reached.",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new MassiveError(
        "provider_authentication_failed",
        "Massive authentication failed.",
      );
    }
    if (response.status === 429) {
      throw new MassiveError(
        "provider_rate_limited",
        "Massive Basic rate limit was reached.",
      );
    }
    if (!response.ok) {
      throw new MassiveError(
        "provider_unavailable",
        `Massive request failed with status ${response.status}.`,
      );
    }
    try {
      return await response.json();
    } catch {
      throw new MassiveError(
        "provider_invalid_response",
        "Massive returned invalid JSON.",
      );
    }
  }

  search(query: string) {
    return this.get("/v3/reference/tickers", {
      ticker: query.toUpperCase(),
      market: "stocks",
      active: "true",
      limit: "12",
      sort: "ticker",
    });
  }

  previousDay(symbol: string) {
    return this.get(`/v2/aggs/ticker/${encodeURIComponent(symbol)}/prev`, {
      adjusted: "true",
    });
  }
}
