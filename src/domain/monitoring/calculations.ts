export type MonitoringScores = {
  investment: number | null;
  quality: number | null;
  valuation: number | null;
  momentum: number | null;
  riskSafety: number | null;
};

export type MonitoringScoreDeltas = {
  [Key in keyof MonitoringScores]: number | null;
};

export function isValidMonitoringScore(value: number | null) {
  return (
    value === null || (Number.isInteger(value) && value >= 0 && value <= 100)
  );
}

export function calculatePricePln(priceUsd: number, fxUsdPln: number | null) {
  if (!Number.isFinite(priceUsd) || priceUsd <= 0) return null;
  if (fxUsdPln === null) return null;
  if (!Number.isFinite(fxUsdPln) || fxUsdPln <= 0) return null;
  return priceUsd * fxUsdPln;
}

export function compareMonitoringScores(
  current: MonitoringScores,
  previous: MonitoringScores | null,
): MonitoringScoreDeltas {
  return Object.fromEntries(
    Object.keys(current).map((key) => {
      const score = key as keyof MonitoringScores;
      const before = previous?.[score] ?? null;
      const after = current[score];
      return [score, before === null || after === null ? null : after - before];
    }),
  ) as MonitoringScoreDeltas;
}
