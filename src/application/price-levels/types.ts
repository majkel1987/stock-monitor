import type { PriceLevelTriggerDirection } from "@/domain/price-levels/calculations";

export type PriceLevelKind = "buy" | "fair_value" | "sell" | "custom";

export type SavePriceLevelInput = {
  stockId: string;
  label: string;
  kind: PriceLevelKind;
  value: number;
  currency: "PLN" | "USD";
  triggerDirection: PriceLevelTriggerDirection;
  priority: number | null;
  sortOrder: number;
  note: string | null;
};

export interface PriceLevelWriter {
  create(userId: string, input: SavePriceLevelInput): Promise<boolean>;
  update(
    userId: string,
    levelId: string,
    input: SavePriceLevelInput,
  ): Promise<boolean>;
  deactivate(userId: string, levelId: string, stockId: string): Promise<boolean>;
}
