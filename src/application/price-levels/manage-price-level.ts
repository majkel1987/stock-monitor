import type { PriceLevelWriter, SavePriceLevelInput } from "./types";

export function createPriceLevel(
  writer: PriceLevelWriter,
  userId: string,
  input: SavePriceLevelInput,
) {
  return writer.create(userId, input);
}

export function updatePriceLevel(
  writer: PriceLevelWriter,
  userId: string,
  levelId: string,
  input: SavePriceLevelInput,
) {
  return writer.update(userId, levelId, input);
}

export function deactivatePriceLevel(
  writer: PriceLevelWriter,
  userId: string,
  levelId: string,
  stockId: string,
) {
  return writer.deactivate(userId, levelId, stockId);
}
