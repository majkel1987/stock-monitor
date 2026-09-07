import "server-only";

import type {
  MarketDataProvider,
  NormalizedQuote,
  ProviderInstrument,
} from "@/application/sync/market-data-provider";
import type { MarketCode } from "@/domain/markets/market";
import { HttpEodhdClient, type EodhdClient } from "./eodhd-client";
import { EodhdError } from "./eodhd-errors";
import { mapEodhdCandidate, mapEodhdQuote } from "./eodhd-mapper";
import {
  eodhdQuoteResponseSchema,
  eodhdSearchResponseSchema,
} from "./eodhd-schemas";

export class EodhdMarketDataProvider implements MarketDataProvider {
  constructor(private readonly client: EodhdClient) {}

  async search(query: string, market?: MarketCode) {
    const parsed = eodhdSearchResponseSchema.safeParse(
      await this.client.search(query),
    );
    if (!parsed.success) {
      throw new EodhdError(
        "provider_invalid_response",
        "EODHD returned an invalid search response.",
      );
    }

    return parsed.data
      .map(mapEodhdCandidate)
      .filter((candidate) => candidate !== null)
      .filter((candidate) => !market || candidate.market === market)
      .slice(0, 12);
  }

  async getQuotes(instruments: ProviderInstrument[]) {
    const parsed = eodhdQuoteResponseSchema.safeParse(
      await this.client.quotes(
        instruments.map((instrument) => instrument.providerSymbol),
      ),
    );
    if (!parsed.success) {
      throw new EodhdError(
        "provider_invalid_response",
        "EODHD returned an invalid quote response.",
      );
    }

    const rows = Array.isArray(parsed.data) ? parsed.data : [parsed.data];
    const instrumentBySymbol = new Map(
      instruments.map((instrument) => [
        instrument.providerSymbol.toUpperCase(),
        instrument,
      ]),
    );
    const receivedAt = new Date();
    const quotes: NormalizedQuote[] = [];

    for (const row of rows) {
      const instrument = instrumentBySymbol.get(row.code.toUpperCase());
      if (!instrument) continue;
      quotes.push(mapEodhdQuote(row, instrument, receivedAt));
    }
    return quotes;
  }
}

export function createEodhdProvider(apiToken: string) {
  return new EodhdMarketDataProvider(new HttpEodhdClient(apiToken));
}
