export type PortfolioActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const idlePortfolioActionState: PortfolioActionState = {
  status: "idle",
};
