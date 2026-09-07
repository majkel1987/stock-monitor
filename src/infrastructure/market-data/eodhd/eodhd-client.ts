import "server-only";

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
  ) {}

  private async get(path: string, params: Record<string, string>) {
    const url = new URL(`${EODHD_BASE_URL}${path}`);
    url.search = new URLSearchParams({
      ...params,
      api_token: this.apiToken,
      fmt: "json",
    }).toString();

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.fetcher(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.status === 429) {
          throw new EodhdError(
            "provider_rate_limited",
            "EODHD rate limit reached.",
          );
        }
        if (!response.ok) {
          if (response.status >= 500 && attempt === 0) continue;
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
      } catch (error) {
        if (error instanceof EodhdError) throw error;
        if (attempt === 0) continue;
        throw new EodhdError(
          "provider_unavailable",
          "EODHD could not be reached.",
        );
      }
    }

    throw new EodhdError("provider_unavailable", "EODHD could not be reached.");
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
