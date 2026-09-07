export type EodhdErrorCode =
  | "provider_unavailable"
  | "provider_rate_limited"
  | "provider_invalid_response";

export class EodhdError extends Error {
  constructor(
    public readonly code: EodhdErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EodhdError";
  }
}
