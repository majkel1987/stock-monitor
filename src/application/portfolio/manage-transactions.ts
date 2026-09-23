import type { PortfolioWriter, SavePortfolioTransactionInput } from "./types";

export function createPortfolioTransaction(
  writer: PortfolioWriter,
  userId: string,
  input: SavePortfolioTransactionInput,
) {
  return writer.create(userId, input);
}

export function updatePortfolioTransaction(
  writer: PortfolioWriter,
  userId: string,
  transactionId: string,
  input: Omit<SavePortfolioTransactionInput, "stockId">,
) {
  return writer.update(userId, transactionId, input);
}

export function deletePortfolioTransaction(
  writer: PortfolioWriter,
  userId: string,
  transactionId: string,
) {
  return writer.delete(userId, transactionId);
}
