import type { DashboardGroup } from "@/application/settings/types";
import { DASHBOARD_GROUPS } from "@/application/settings/types";

export const DASHBOARD_GROUP_LABELS: Record<DashboardGroup, string> = {
  opportunity: "BUY",
  watch: "WATCH",
  research: "DEEP DIVE",
  portfolio: "PORTFOLIO",
  negative: "AVOID",
  other: "OTHER",
};

export const COLOR_TOKEN_LABELS: Record<string, string> = {
  accent: "Accent",
  info: "Info",
  warning: "Warning",
  positive: "Positive",
  negative: "Negative",
  danger: "Danger",
  portfolio: "Portfolio",
  neutral: "Neutral",
};

export const colorSwatchClass = (colorToken: string) => {
  const classes: Record<string, string> = {
    accent: "bg-primary",
    info: "bg-info",
    warning: "bg-warning",
    positive: "bg-positive",
    negative: "bg-negative",
    danger: "bg-negative",
    portfolio: "bg-positive",
    neutral: "bg-muted-foreground",
  };
  return classes[colorToken] ?? "bg-primary";
};

export const dashboardGroupLabel = (group: string) =>
  (DASHBOARD_GROUPS as readonly string[]).includes(group)
    ? DASHBOARD_GROUP_LABELS[group as DashboardGroup]
    : group.toUpperCase();
