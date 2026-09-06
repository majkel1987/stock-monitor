export type PriceLevelTriggerDirection = "lte" | "gte";

function finitePositive(value: string | number | null) {
  if (value === null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function calculatePriceLevelDistance(
  currentPrice: string | number | null,
  levelValue: string | number,
) {
  const current = finitePositive(currentPrice);
  const level = finitePositive(levelValue);
  if (current === null || level === null) return null;
  return ((level - current) / current) * 100;
}

export function isPriceLevelReached(
  currentPrice: string | number | null,
  levelValue: string | number,
  direction: PriceLevelTriggerDirection,
) {
  const current = finitePositive(currentPrice);
  const level = finitePositive(levelValue);
  if (current === null || level === null) return null;
  return direction === "lte" ? current <= level : current >= level;
}
