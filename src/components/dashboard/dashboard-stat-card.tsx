import type { ReactNode } from "react";

import { MetricCard } from "@/components/ui/terminal";

export function DashboardStatCard({
  title,
  value,
  secondary,
  tone = "default",
}: {
  title: string;
  value: number;
  icon?: ReactNode;
  secondary?: string;
  tone?: "default" | "positive" | "negative" | "warning";
}) {
  return (
    <MetricCard hint={secondary} label={title} tone={tone} value={value} />
  );
}
