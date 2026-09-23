import { applyStatusOrder } from "./slug";
import { reorderStatusesSchema } from "./schemas";
import type { StatusDefinitionReader, StatusDefinitionWriter } from "./types";

export async function reorderStatusDefinitions(
  reader: StatusDefinitionReader,
  writer: StatusDefinitionWriter,
  userId: string,
  orderedIds: readonly string[],
): Promise<{ status: "ok" | "invalid" }> {
  const parsed = reorderStatusesSchema.safeParse(orderedIds);
  if (!parsed.success) return { status: "invalid" };

  const current = await reader.list(userId);
  if (!current.length) return { status: "invalid" };

  const knownIds = new Set(current.map((status) => status.id));
  if (parsed.data.some((id) => !knownIds.has(id))) return { status: "invalid" };

  const next = applyStatusOrder(current, parsed.data);
  await writer.reorder(
    userId,
    next.map((status) => ({ id: status.id, sortOrder: status.sortOrder })),
  );
  return { status: "ok" };
}
