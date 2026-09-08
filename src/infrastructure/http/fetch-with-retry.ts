import "server-only";

export const PROVIDER_RETRY_POLICY = {
  maxAttempts: 3,
  baseDelayMs: 250,
  maxDelayMs: 2_000,
  jitterMs: 100,
} as const;

type RetryOptions = {
  fetcher?: typeof fetch;
  timeoutMs?: number;
  deadlineAtMs?: number;
  sleep?: (delayMs: number) => Promise<void>;
  random?: () => number;
};

function retryAfterMs(response: Response, nowMs: number) {
  const value = response.headers.get("retry-after");
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return seconds * 1_000;

  const dateMs = Date.parse(value);
  return Number.isNaN(dateMs) ? null : Math.max(0, dateMs - nowMs);
}

function shouldRetryStatus(status: number) {
  return status === 429 || status >= 500;
}

export async function fetchWithRetry(
  input: URL | string,
  init: RequestInit,
  options: RetryOptions = {},
) {
  const fetcher = options.fetcher ?? fetch;
  const timeoutMs = options.timeoutMs ?? 8_000;
  const deadlineAtMs = options.deadlineAtMs ?? Number.POSITIVE_INFINITY;
  const sleep =
    options.sleep ??
    ((delayMs: number) =>
      new Promise<void>((resolve) => setTimeout(resolve, delayMs)));
  const random = options.random ?? Math.random;
  let lastNetworkError: unknown;

  for (
    let attempt = 1;
    attempt <= PROVIDER_RETRY_POLICY.maxAttempts;
    attempt += 1
  ) {
    if (Date.now() >= deadlineAtMs) {
      throw new Error("provider_deadline_exceeded");
    }

    try {
      const response = await fetcher(input, {
        ...init,
        signal: AbortSignal.timeout(
          Math.max(1, Math.min(timeoutMs, deadlineAtMs - Date.now())),
        ),
      });
      if (
        !shouldRetryStatus(response.status) ||
        attempt === PROVIDER_RETRY_POLICY.maxAttempts
      ) {
        return response;
      }

      const remainingMs = deadlineAtMs - Date.now();
      const providerDelay = retryAfterMs(response, Date.now());
      const exponentialDelay =
        PROVIDER_RETRY_POLICY.baseDelayMs * 2 ** (attempt - 1) +
        Math.floor(random() * PROVIDER_RETRY_POLICY.jitterMs);
      const delayMs = Math.min(
        providerDelay ?? exponentialDelay,
        PROVIDER_RETRY_POLICY.maxDelayMs,
        remainingMs,
      );
      if (delayMs <= 0) return response;
      await sleep(delayMs);
    } catch (error) {
      lastNetworkError = error;
      if (attempt === PROVIDER_RETRY_POLICY.maxAttempts) throw error;

      const remainingMs = deadlineAtMs - Date.now();
      const delayMs = Math.min(
        PROVIDER_RETRY_POLICY.baseDelayMs * 2 ** (attempt - 1) +
          Math.floor(random() * PROVIDER_RETRY_POLICY.jitterMs),
        PROVIDER_RETRY_POLICY.maxDelayMs,
        remainingMs,
      );
      if (delayMs <= 0) throw error;
      await sleep(delayMs);
    }
  }

  throw lastNetworkError ?? new Error("provider_request_failed");
}
