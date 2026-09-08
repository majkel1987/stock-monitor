import { describe, expect, it, vi } from "vitest";

import {
  fetchWithRetry,
  PROVIDER_RETRY_POLICY,
} from "@/infrastructure/http/fetch-with-retry";

describe("provider retry policy", () => {
  it("does not retry ordinary 4xx responses", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 400 }));

    const response = await fetchWithRetry(
      "https://example.test",
      {},
      {
        fetcher,
        sleep: vi.fn(),
      },
    );

    expect(response.status).toBe(400);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("bounds 429 retries and respects Retry-After within the delay cap", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(
        new Response(null, { status: 429, headers: { "Retry-After": "30" } }),
      );
    const sleep = vi.fn().mockResolvedValue(undefined);

    const response = await fetchWithRetry(
      "https://example.test",
      {},
      {
        fetcher,
        sleep,
        random: () => 0,
      },
    );

    expect(response.status).toBe(429);
    expect(fetcher).toHaveBeenCalledTimes(PROVIDER_RETRY_POLICY.maxAttempts);
    expect(sleep).toHaveBeenCalledTimes(PROVIDER_RETRY_POLICY.maxAttempts - 1);
    expect(sleep).toHaveBeenCalledWith(PROVIDER_RETRY_POLICY.maxDelayMs);
  });

  it("uses the same bounded budget for network failures", async () => {
    const fetcher = vi.fn().mockRejectedValue(new TypeError("network"));

    await expect(
      fetchWithRetry(
        "https://example.test",
        {},
        {
          fetcher,
          sleep: vi.fn(),
          random: () => 0,
        },
      ),
    ).rejects.toThrow("network");
    expect(fetcher).toHaveBeenCalledTimes(PROVIDER_RETRY_POLICY.maxAttempts);
  });
});
