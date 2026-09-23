import type { DashboardStatus } from "@/application/dashboard/types";

export const statusBarClass = (status: DashboardStatus) => {
  const classes: Record<string, string> = {
    accent: "bg-primary",
    danger: "bg-negative",
    info: "bg-info",
    negative: "bg-negative",
    neutral: "bg-muted-foreground",
    portfolio: "bg-positive",
    positive: "bg-positive",
    warning: "bg-warning",
  };
  return classes[status.colorToken] ?? "bg-secondary-foreground";
};

export const statusBadgeTone = (
  colorToken: string,
): "accent" | "info" | "warning" | "positive" | "negative" | "neutral" => {
  const map: Record<
    string,
    "accent" | "info" | "warning" | "positive" | "negative" | "neutral"
  > = {
    accent: "accent",
    danger: "negative",
    info: "info",
    negative: "negative",
    neutral: "neutral",
    portfolio: "positive",
    positive: "positive",
    warning: "warning",
  };
  return map[colorToken] ?? "neutral";
};
