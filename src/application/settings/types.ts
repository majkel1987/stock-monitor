export const DASHBOARD_GROUPS = [
  "opportunity",
  "watch",
  "research",
  "portfolio",
  "negative",
  "other",
] as const;

export type DashboardGroup = (typeof DASHBOARD_GROUPS)[number];

export const COLOR_TOKENS = [
  "accent",
  "info",
  "warning",
  "positive",
  "negative",
  "danger",
  "portfolio",
  "neutral",
] as const;

export type ColorToken = (typeof COLOR_TOKENS)[number];

export type WorkflowStatus = {
  id: string;
  slug: string;
  label: string;
  description: string | null;
  colorToken: string;
  dashboardGroup: DashboardGroup;
  sortOrder: number;
  isActive: boolean;
};

export type StatusDraftInput = {
  label: string;
  description: string;
  colorToken: string;
  dashboardGroup: DashboardGroup;
  sortOrder: number;
  isActive: boolean;
};

export type CreateStatusInput = StatusDraftInput;
export type UpdateStatusInput = StatusDraftInput;

export type SaveStatusResult =
  | { status: "created"; record: WorkflowStatus }
  | { status: "updated"; record: WorkflowStatus }
  | { status: "not_found" }
  | { status: "invalid" };

export interface StatusDefinitionReader {
  list(userId: string): Promise<WorkflowStatus[]>;
}

export interface StatusDefinitionWriter {
  create(userId: string, input: CreateStatusInput): Promise<WorkflowStatus>;
  update(
    userId: string,
    id: string,
    input: UpdateStatusInput,
  ): Promise<WorkflowStatus | null>;
  reorder(
    userId: string,
    items: ReadonlyArray<{ id: string; sortOrder: number }>,
  ): Promise<void>;
}
