import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { uniqueSlug, slugFromLabel } from "@/application/settings/slug";
import type {
  CreateStatusInput,
  DashboardGroup,
  StatusDefinitionReader,
  StatusDefinitionWriter,
  UpdateStatusInput,
  WorkflowStatus,
} from "@/application/settings/types";
import { DASHBOARD_GROUPS } from "@/application/settings/types";
import type { Database } from "@/infrastructure/supabase/generated/database.types";

type StatusRow = Database["public"]["Tables"]["status_definitions"]["Row"];

export class StatusDefinitionInfrastructureError extends Error {
  constructor() {
    super("Status definitions could not be loaded.");
    this.name = "StatusDefinitionInfrastructureError";
  }
}

function dashboardGroup(value: string): DashboardGroup {
  return (DASHBOARD_GROUPS as readonly string[]).includes(value)
    ? (value as DashboardGroup)
    : "other";
}

type StatusFields = Pick<
  StatusRow,
  | "id"
  | "slug"
  | "label"
  | "description"
  | "color_token"
  | "dashboard_group"
  | "sort_order"
  | "is_active"
>;

function toWorkflowStatus(row: StatusFields): WorkflowStatus {
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    colorToken: row.color_token,
    dashboardGroup: dashboardGroup(row.dashboard_group),
    sortOrder: row.sort_order,
    isActive: row.is_active,
  };
}

function fail(): never {
  throw new StatusDefinitionInfrastructureError();
}

export function createSupabaseStatusDefinitionStore(
  client: SupabaseClient<Database>,
): StatusDefinitionReader & StatusDefinitionWriter {
  const list = async (userId: string): Promise<WorkflowStatus[]> => {
    const { data, error } = await client
      .from("status_definitions")
      .select(
        "id,slug,label,description,color_token,dashboard_group,sort_order,is_active,user_id",
      )
      .eq("user_id", userId)
      .order("sort_order", { ascending: true })
      .order("label", { ascending: true });

    if (error || !data) fail();
    return data.map(toWorkflowStatus);
  };

  return {
    list,
    async create(userId, input: CreateStatusInput) {
      const existing = await list(userId);
      const slug = uniqueSlug(
        slugFromLabel(input.label),
        existing.map((status) => status.slug),
      );

      const { data, error } = await client
        .from("status_definitions")
        .insert({
          user_id: userId,
          slug,
          label: input.label,
          description: input.description.trim() ? input.description : null,
          color_token: input.colorToken,
          dashboard_group: input.dashboardGroup,
          sort_order: input.sortOrder,
          is_active: input.isActive,
        })
        .select(
          "id,slug,label,description,color_token,dashboard_group,sort_order,is_active,user_id",
        )
        .single();

      if (error || !data) fail();
      return toWorkflowStatus(data);
    },
    async update(userId, id, input: UpdateStatusInput) {
      const { data, error } = await client
        .from("status_definitions")
        .update({
          label: input.label,
          description: input.description.trim() ? input.description : null,
          color_token: input.colorToken,
          dashboard_group: input.dashboardGroup,
          sort_order: input.sortOrder,
          is_active: input.isActive,
        })
        .eq("id", id)
        .eq("user_id", userId)
        .select(
          "id,slug,label,description,color_token,dashboard_group,sort_order,is_active,user_id",
        )
        .maybeSingle();

      if (error) fail();
      return data ? toWorkflowStatus(data) : null;
    },
    async reorder(userId, items) {
      const results = await Promise.all(
        items.map((item) =>
          client
            .from("status_definitions")
            .update({ sort_order: item.sortOrder })
            .eq("id", item.id)
            .eq("user_id", userId),
        ),
      );

      if (results.some((result) => result.error)) fail();
    },
  };
}
