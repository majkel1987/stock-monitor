export type FxRate = {
  baseCurrency: "USD";
  quoteCurrency: "PLN";
  rate: string;
  effectiveDate: string;
  asOf: string;
  provider: "NBP";
};

export interface FxRateProvider {
  getUsdPln(date?: Date): Promise<FxRate>;
}
