export type FxRate = {
  baseCurrency: "USD";
  quoteCurrency: "PLN";
  rate: string;
  asOf: string;
  provider: string;
};

export interface FxRateProvider {
  getUsdPln(date?: Date): Promise<FxRate>;
}
