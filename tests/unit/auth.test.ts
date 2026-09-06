import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
const { getUser } = vi.hoisted(() => ({ getUser: vi.fn() }));
vi.mock("@/infrastructure/supabase/server/create-client", () => ({
  createClient: async () => ({ auth: { getUser } }),
}));

import {
  getAccess,
  requireAllowedUser,
} from "@/infrastructure/supabase/server/auth";
import { isAllowedEmail, loginSchema } from "@/lib/validation/auth";
import { authEnvSchema } from "@/lib/env/schemas";

beforeEach(() => {
  vi.stubEnv("ALLOWED_USER_EMAIL", "owner@example.com");
  getUser.mockReset();
});

describe("allowed user", () => {
  it.each(["owner@example.com", "Owner@Example.com", " owner@example.com "])(
    "accepts %s",
    async (email) => {
      const user = { id: "owner-id", email };
      getUser.mockResolvedValue({ data: { user }, error: null });
      expect(await requireAllowedUser()).toEqual(user);
      expect(getUser).toHaveBeenCalledOnce();
    },
  );

  it.each([
    undefined,
    "other@example.com",
    "",
    "owner@example.com.attacker.test",
  ])("rejects %s", async (email) => {
    getUser.mockResolvedValue({
      data: { user: { id: "other", email } },
      error: null,
    });
    expect(await getAccess()).toEqual({ status: "forbidden", user: null });
    await expect(requireAllowedUser()).rejects.toThrow(
      "redirect:/login?error=access_denied",
    );
  });

  it("requires authentication", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(requireAllowedUser()).rejects.toThrow("redirect:/login");
  });

  it("does not trust a user returned with an Auth error", async () => {
    getUser.mockResolvedValue({
      data: { user: { email: "owner@example.com" } },
      error: { message: "invalid" },
    });
    expect((await getAccess()).status).toBe("unauthenticated");
  });

  it("fails closed when the allowlist is missing", async () => {
    vi.stubEnv("ALLOWED_USER_EMAIL", "");
    await expect(getAccess()).rejects.toThrow();
    expect(getUser).not.toHaveBeenCalled();
  });

  it("normalizes the configured address", () => {
    expect(isAllowedEmail("owner@example.com", " Owner@Example.COM ")).toBe(
      true,
    );
    expect(
      authEnvSchema.safeParse({ ALLOWED_USER_EMAIL: "not-email" }).success,
    ).toBe(false);
  });
});

describe("login validation", () => {
  it("preserves password whitespace", () => {
    expect(
      loginSchema.parse({ email: " owner@example.com ", password: " secret " }),
    ).toEqual({ email: "owner@example.com", password: " secret " });
  });
  it.each([
    { email: "invalid", password: "secret" },
    { email: "owner@example.com", password: "" },
    { email: null, password: null },
  ])("rejects invalid input", (input) => {
    expect(loginSchema.safeParse(input).success).toBe(false);
  });
});
