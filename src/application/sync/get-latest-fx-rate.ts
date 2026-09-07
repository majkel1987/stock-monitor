export type LatestUsdPlnRate = {
  rate: string;
  effectiveDate: string;
  asOf: string;
  provider: "NBP";
};

export interface FxRateReader {
  latestUsdPln(): Promise<LatestUsdPlnRate | null>;
}

export function getLatestUsdPlnRate(reader: FxRateReader) {
  return reader.latestUsdPln();
}
