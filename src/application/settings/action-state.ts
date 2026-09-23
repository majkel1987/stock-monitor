export type SaveStatusActionState = {
  status: "idle" | "success" | "error";
  kind?: "created" | "updated";
  message?: string;
  statusId?: string;
  label?: string;
};

export const initialSaveStatusState: SaveStatusActionState = { status: "idle" };
