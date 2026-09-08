import { describe, expect, it, vi } from "vitest";

import { handleScheduledMarketSync } from "@/app/api/internal/market-sync/handler";

const secret = "a-secure-cron-secret-with-32-chars";

function request(authorization?: string) {
  return new Request("https://example.test/api/internal/market-sync", {
    method: "POST",
    headers: authorization ? { authorization } : undefined,
  });
}

describe("scheduled sync HTTP handler", () => {
  it.each([undefined, "Bearer wrong-secret"])(
    "rejects a missing or wrong secret without invoking sync",
    async (authorization) => {
      const run = vi.fn();
      const response = await handleScheduledMarketSync(request(authorization), {
        cronSecret: secret,
        run,
      });

      expect(response.status).toBe(401);
      expect(run).not.toHaveBeenCalled();
    },
  );

  it("fails closed when the server secret is not configured", async () => {
    const run = vi.fn();
    const response = await handleScheduledMarketSync(request(), {
      cronSecret: null,
      run,
    });

    expect(response.status).toBe(503);
    expect(run).not.toHaveBeenCalled();
  });

  it("returns only the safe operational result for a valid request", async () => {
    const run = vi.fn().mockResolvedValue({
      status: "success",
      runId: "run-id",
      requestedCount: 2,
      successCount: 2,
      failureCount: 0,
    });
    const response = await handleScheduledMarketSync(
      request(`Bearer ${secret}`),
      { cronSecret: secret, run },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "success",
      runId: "run-id",
      requested: 2,
      success: 2,
      failed: 0,
    });
    expect(run).toHaveBeenCalledOnce();
  });

  it("returns an ordinary response when another run holds the lease", async () => {
    const response = await handleScheduledMarketSync(
      request(`Bearer ${secret}`),
      {
        cronSecret: secret,
        run: vi.fn().mockResolvedValue({
          status: "skipped_locked",
          runId: "locked-run-id",
          requestedCount: 0,
          successCount: 0,
          failureCount: 0,
        }),
      },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "skipped_locked",
      runId: "locked-run-id",
    });
  });

  it("returns 500 for a completed failed synchronization", async () => {
    const response = await handleScheduledMarketSync(
      request(`Bearer ${secret}`),
      {
        cronSecret: secret,
        run: vi.fn().mockResolvedValue({
          status: "failed",
          runId: "failed-run-id",
          requestedCount: 1,
          successCount: 0,
          failureCount: 1,
        }),
      },
    );

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toMatchObject({
      status: "failed",
      runId: "failed-run-id",
      failed: 1,
    });
  });
});
