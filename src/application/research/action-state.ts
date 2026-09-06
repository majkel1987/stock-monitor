export type ResearchActionState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const idleResearchActionState: ResearchActionState = { status: "idle" };
