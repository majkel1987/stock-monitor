export type MonitoringImportKind = "GPW" | "USA";

export function detectMonitoringImportKind(
  payload: string,
): MonitoringImportKind | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(payload);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return null;
  const report = parsed as Record<string, unknown>;
  if (report.exportType === "usa_opportunity_monitoring") return "USA";
  if (report.exportType === "gpw_opportunity_monitoring") return "GPW";
  return null;
}
