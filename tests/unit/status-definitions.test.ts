import { describe, expect, it, vi } from "vitest";

import { getStatusDefinitions } from "@/application/settings/get-status-definitions";
import { reorderStatusDefinitions } from "@/application/settings/reorder-status-definitions";
import {
  createStatusDefinition,
  updateStatusDefinition,
} from "@/application/settings/save-status-definition";
import { createStatusSchema, updateStatusSchema } from "@/application/settings/schemas";
import {
  applyStatusOrder,
  slugFromLabel,
  uniqueSlug,
} from "@/application/settings/slug";
import type {
  StatusDefinitionReader,
  StatusDefinitionWriter,
  WorkflowStatus,
} from "@/application/settings/types";

const status = (
  overrides: Partial<WorkflowStatus> = {},
): WorkflowStatus => ({
  id: "11111111-1111-4111-8111-111111111111",
  slug: "WATCH",
  label: "Watch",
  description: "Research list",
  colorToken: "info",
  dashboardGroup: "watch",
  sortOrder: 20,
  isActive: true,
  ...overrides,
});

describe("status slug helpers", () => {
  it("builds a stable slug from a label", () => {
    expect(slugFromLabel("Buy Candidate")).toBe("BUY_CANDIDATE");
    expect(slugFromLabel("  Wait for Correction  ")).toBe(
      "WAIT_FOR_CORRECTION",
    );
  });

  it("falls back when the label has no usable characters", () => {
    expect(slugFromLabel("***")).toBe("STATUS");
  });

  it("allocates a unique slug suffix", () => {
    expect(uniqueSlug("WATCH", ["WATCH", "WATCH_2"])).toBe("WATCH_3");
    expect(uniqueSlug("WATCH", [])).toBe("WATCH");
  });
});

describe("status order", () => {
  it("reindexes sort_order in tens while preserving unknown ids at the end", () => {
    const current = [
      status({ id: "a", sortOrder: 10, label: "A" }),
      status({ id: "b", sortOrder: 20, label: "B" }),
      status({ id: "c", sortOrder: 30, label: "C" }),
    ];

    expect(applyStatusOrder(current, ["c", "a"]).map((item) => item.id)).toEqual(
      ["c", "a", "b"],
    );
    expect(
      applyStatusOrder(current, ["c", "a"]).map((item) => item.sortOrder),
    ).toEqual([10, 20, 30]);
  });
});

describe("status draft schemas", () => {
  it("accepts a valid create payload", () => {
    expect(
      createStatusSchema.parse({
        label: " Buy Candidate ",
        description: "High priority",
        colorToken: "positive",
        dashboardGroup: "opportunity",
        sortOrder: "10",
        isActive: true,
      }),
    ).toMatchObject({
      label: "Buy Candidate",
      sortOrder: 10,
      dashboardGroup: "opportunity",
    });
  });

  it("rejects a blank label and an unknown dashboard group", () => {
    expect(
      createStatusSchema.safeParse({
        label: " ",
        colorToken: "info",
        dashboardGroup: "watch",
        sortOrder: 10,
        isActive: true,
      }).success,
    ).toBe(false);
    expect(
      updateStatusSchema.safeParse({
        id: "not-a-uuid",
        label: "Watch",
        colorToken: "info",
        dashboardGroup: "buy",
        sortOrder: 20,
        isActive: true,
      }).success,
    ).toBe(false);
  });
});

describe("status definition use cases", () => {
  it("lists statuses ordered by sort_order then label", async () => {
    const reader: StatusDefinitionReader = {
      list: vi.fn().mockResolvedValue([
        status({ id: "2", label: "Zeta", sortOrder: 10 }),
        status({ id: "1", label: "Alpha", sortOrder: 10 }),
        status({ id: "3", label: "Hold", sortOrder: 5 }),
      ]),
    };

    const result = await getStatusDefinitions(reader, "user-1");
    expect(result.map((item) => item.label)).toEqual(["Hold", "Alpha", "Zeta"]);
  });

  it("creates a status through the writer after validation", async () => {
    const created = status({ id: "new", label: "Custom" });
    const writer: StatusDefinitionWriter = {
      create: vi.fn().mockResolvedValue(created),
      update: vi.fn(),
      reorder: vi.fn(),
    };

    await expect(
      createStatusDefinition(writer, "user-1", {
        label: "Custom",
        description: "",
        colorToken: "accent",
        dashboardGroup: "other",
        sortOrder: 90,
        isActive: true,
      }),
    ).resolves.toEqual({ status: "created", record: created });
  });

  it("returns invalid when required fields are missing", async () => {
    const writer: StatusDefinitionWriter = {
      create: vi.fn(),
      update: vi.fn(),
      reorder: vi.fn(),
    };

    await expect(
      createStatusDefinition(writer, "user-1", {
        label: " ",
        description: "",
        colorToken: "accent",
        dashboardGroup: "watch",
        sortOrder: 10,
        isActive: true,
      }),
    ).resolves.toEqual({ status: "invalid" });
    expect(writer.create).not.toHaveBeenCalled();
  });

  it("returns not_found when the status cannot be updated", async () => {
    const writer: StatusDefinitionWriter = {
      create: vi.fn(),
      update: vi.fn().mockResolvedValue(null),
      reorder: vi.fn(),
    };

    await expect(
      updateStatusDefinition(writer, "user-1", {
        id: "11111111-1111-4111-8111-111111111111",
        label: "Watch",
        description: "Research list",
        colorToken: "info",
        dashboardGroup: "watch",
        sortOrder: 20,
        isActive: false,
      }),
    ).resolves.toEqual({ status: "not_found" });
  });

  it("persists a reordered sort_order sequence", async () => {
    const current = [
      status({ id: "11111111-1111-4111-8111-111111111111", sortOrder: 10 }),
      status({ id: "22222222-2222-4222-8222-222222222222", sortOrder: 20 }),
    ];
    const reader: StatusDefinitionReader = {
      list: vi.fn().mockResolvedValue(current),
    };
    const writer: StatusDefinitionWriter = {
      create: vi.fn(),
      update: vi.fn(),
      reorder: vi.fn().mockResolvedValue(undefined),
    };

    await expect(
      reorderStatusDefinitions(reader, writer, "user-1", [
        "22222222-2222-4222-8222-222222222222",
        "11111111-1111-4111-8111-111111111111",
      ]),
    ).resolves.toEqual({ status: "ok" });
    expect(writer.reorder).toHaveBeenCalledWith("user-1", [
      { id: "22222222-2222-4222-8222-222222222222", sortOrder: 10 },
      { id: "11111111-1111-4111-8111-111111111111", sortOrder: 20 },
    ]);
  });
});
