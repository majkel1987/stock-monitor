import type { MonitoringImportRepository } from "./types";

export async function commitSelectedImportItems({
  repository,
  userId,
  batchId,
  priceLevelActionsByItem = {},
}: {
  repository: MonitoringImportRepository;
  userId: string;
  batchId: string;
  priceLevelActionsByItem?: Record<
    string,
    Array<{
      trancheNumber: number;
      action: "KEEP" | "ADD" | "SUPERSEDE";
    }>
  >;
}) {
  const batch = await repository.readBatch(userId, batchId);
  if (!batch) return { status: "not_found" as const, results: [] };

  const results = [];
  for (const item of batch.items) {
    if (!item.includeInCommit || !["READY", "WARNING"].includes(item.state))
      continue;
    const reviewedActions = priceLevelActionsByItem[item.id];
    const priceLevelActions =
      reviewedActions ??
      item.company?.positionPlan.tranches.map((tranche) => ({
        trancheNumber: tranche.number,
        action: "KEEP" as const,
      })) ??
      [];
    results.push({
      itemId: item.id,
      ...(await repository.commitItem(userId, item.id, priceLevelActions)),
    });
  }
  return { status: "completed" as const, results };
}
