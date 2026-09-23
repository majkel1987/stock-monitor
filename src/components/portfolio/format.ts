export function formatMoney(value: string | null, currency: "PLN" | "USD") {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatSignedMoney(
  value: string | null,
  currency: "PLN" | "USD",
) {
  if (value === null) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    signDisplay: "always",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value));
}

export function formatQuantity(value: string) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 8,
  }).format(Number(value));
}

export function formatPercent(value: string | null) {
  if (value === null) return "N/A";
  const numeric = Number(value);
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(2)}%`;
}

export function resultTone(value: string | null) {
  if (value === null || Number(value) === 0) return "text-muted-foreground";
  return Number(value) > 0 ? "text-positive" : "text-negative";
}

export function resultMetricTone(
  value: string | null,
): "default" | "positive" | "negative" {
  if (value === null || Number(value) === 0) return "default";
  return Number(value) > 0 ? "positive" : "negative";
}

export const portfolioDateFormatter = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Warsaw",
});
