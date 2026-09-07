import "server-only";

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
  ) {}

  async getUsdRate(date?: Date) {
    const datePath = date ? `/${date.toISOString().slice(0, 10)}` : "";
    const url = `https://api.nbp.pl/api/exchangerates/rates/A/USD${datePath}/?format=json`;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await this.fetcher(url, {
          headers: { Accept: "application/json" },
          cache: "no-store",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        if (!response.ok) {
          if (response.status >= 500 && attempt === 0) continue;
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
      } catch (error) {
        if (error instanceof NbpError) throw error;
        if (attempt === 0) continue;
        throw new NbpError("fx_unavailable", "NBP could not be reached.");
      }
    }

    throw new NbpError("fx_unavailable", "NBP could not be reached.");
  }
}
