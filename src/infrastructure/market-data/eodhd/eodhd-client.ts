import "server-only";

import { fetchWithRetry } from "@/infrastructure/http/fetch-with-retry";
import { EodhdError } from "./eodhd-errors";

const EODHD_BASE_URL = "https://eodhd.com/api";

export interface EodhdClient {
  search(query: string): Promise<unknown>;
  quotes(symbols: string[]): Promise<unknown>;
}

export class HttpEodhdClient implements EodhdClient {
  constructor(
    private readonly apiToken: string,
    private readonly fetcher: typeof fetch = fetch,
    private readonly timeoutMs = 8_000,
    private readonly deadlineAtMs = Number.POSITIVE_INFINITY,
  ) {}

  private async get(path: string, params: Record<string, string>) {
    const url = new URL(`${EODHD_BASE_URL}${path}`);
    url.search = new URLSearchParams({
      ...params,
      api_token: this.apiToken,
      fmt: "json",
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
        },
      );
    } catch {
      throw new EodhdError(
        "provider_unavailable",
        "EODHD could not be reached.",
      );
    }

    if (response.status === 401 || response.status === 403) {
      throw new EodhdError(
        "provider_authentication_failed",
        "EODHD authentication failed.",
      );
    }
    if (response.status === 429) {
      throw new EodhdError(
        "provider_rate_limited",
        "EODHD rate limit reached after bounded retries.",
      );
    }
    if (!response.ok) {
      throw new EodhdError(
        "provider_unavailable",
        `EODHD request failed with status ${response.status}.`,
      );
    }

    try {
      return await response.json();
    } catch {
      throw new EodhdError(
        "provider_invalid_response",
        "EODHD returned invalid JSON.",
      );
    }
  }

  search(query: string) {
    return this.get(`/search/${encodeURIComponent(query)}`, { limit: "20" });
  }

  quotes(symbols: string[]) {
    if (symbols.length === 0 || symbols.length > 20) {
      throw new EodhdError(
        "provider_invalid_response",
        "EODHD quote batches must contain between 1 and 20 symbols.",
      );
    }
    const [first, ...additional] = symbols;
    return this.get(`/real-time/${encodeURIComponent(first!)}`, {
      ...(additional.length ? { s: additional.join(",") } : {}),
    });
  }
}
