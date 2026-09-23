import { createStatusSchema, updateStatusSchema } from "./schemas";
import type {
  CreateStatusInput,
  SaveStatusResult,
  StatusDefinitionWriter,
  UpdateStatusInput,
} from "./types";

export async function createStatusDefinition(
  writer: StatusDefinitionWriter,
  userId: string,
  input: CreateStatusInput,
): Promise<SaveStatusResult> {
  const parsed = createStatusSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const record = await writer.create(userId, {
    ...parsed.data,
    description: parsed.data.description,
  });
  return { status: "created", record };
}

export async function updateStatusDefinition(
  writer: StatusDefinitionWriter,
  userId: string,
  input: UpdateStatusInput & { id: string },
): Promise<SaveStatusResult> {
  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { status: "invalid" };

  const record = await writer.update(userId, parsed.data.id, {
    label: parsed.data.label,
    description: parsed.data.description,
    colorToken: parsed.data.colorToken,
    dashboardGroup: parsed.data.dashboardGroup,
    sortOrder: parsed.data.sortOrder,
    isActive: parsed.data.isActive,
  });

  if (!record) return { status: "not_found" };
  return { status: "updated", record };
}
