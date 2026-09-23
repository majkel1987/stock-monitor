import type { StatusDefinitionReader, WorkflowStatus } from "./types";

export async function getStatusDefinitions(
  reader: StatusDefinitionReader,
  userId: string,
): Promise<WorkflowStatus[]> {
  const statuses = await reader.list(userId);
  return [...statuses].sort(
    (left, right) =>
      left.sortOrder - right.sortOrder || left.label.localeCompare(right.label),
  );
}
