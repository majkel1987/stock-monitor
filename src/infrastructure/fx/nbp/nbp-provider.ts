import "server-only";

import type {
  FxRate,
  FxRateProvider,
} from "@/application/sync/fx-rate-provider";
import { HttpNbpClient, NbpError, type NbpClient } from "./nbp-client";
import { nbpRateResponseSchema } from "./nbp-schemas";

export class NbpFxRateProvider implements FxRateProvider {
  constructor(private readonly client: NbpClient) {}

  async getUsdPln(date?: Date): Promise<FxRate> {
    const parsed = nbpRateResponseSchema.safeParse(
      await this.client.getUsdRate(date),
    );
    if (!parsed.success) {
      throw new NbpError(
        "provider_invalid_response",
        "NBP returned an invalid USD/PLN response.",
      );
    }

    const latest = parsed.data.rates.at(-1)!;
    return {
      baseCurrency: "USD",
      quoteCurrency: "PLN",
      rate: String(latest.mid),
      effectiveDate: latest.effectiveDate,
      asOf: `${latest.effectiveDate}T00:00:00.000Z`,
      provider: "NBP",
    };
  }
}

export function createNbpProvider() {
  return new NbpFxRateProvider(new HttpNbpClient());
}
