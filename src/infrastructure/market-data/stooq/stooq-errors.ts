export class StooqError extends Error {
  constructor(
    public readonly code:
      | "provider_authentication_failed"
      | "provider_rate_limited"
      | "provider_unavailable"
      | "provider_invalid_response",
    message: string,
  ) {
    super(message);
    this.name = "StooqError";
  }
}
