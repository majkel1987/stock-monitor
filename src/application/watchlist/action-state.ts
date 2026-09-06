export type AddStockField =
  "marketCode" | "ticker" | "name" | "initialStatusId";

export type AddStockActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<Record<AddStockField, string[]>>;
};
