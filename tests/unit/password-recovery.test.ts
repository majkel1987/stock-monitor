import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  exchangeCodeForSession: vi.fn(),
  getUser: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  revalidatePath: vi.fn(),
  signOut: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ origin: "https://app.example.com" }),
  cookies: async () => ({ getAll: () => [], set: vi.fn() }),
}));
vi.mock("@/infrastructure/supabase/server/create-client", () => ({
  createClient: async () => ({ auth: mocks }),
}));

import { requestPasswordReset } from "@/app/(auth)/forgot-password/actions";
import { updatePassword } from "@/app/(auth)/update-password/actions";
import { GET as recoveryCallback } from "@/app/auth/callback/route";
import { passwordUpdateSchema } from "@/lib/validation/auth";

function resetRequest(email: string) {
  const form = new FormData();
  form.set("email", email);
  return form;
}

function passwordUpdate(password: string, passwordConfirmation = password) {
  const form = new FormData();
  form.set("password", password);
  form.set("passwordConfirmation", passwordConfirmation);
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_USER_EMAIL", "owner@example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  vi.stubEnv("APP_URL", "");
  mocks.exchangeCodeForSession.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner", email: "owner@example.com" } },
    error: null,
  });
  mocks.resetPasswordForEmail.mockResolvedValue({ error: null });
  mocks.signOut.mockResolvedValue({ error: null });
  mocks.updateUser.mockResolvedValue({ error: null });
});

describe("password recovery request", () => {
  it("sends an allowlisted user to the fixed callback URL", async () => {
    await expect(
      requestPasswordReset(resetRequest(" Owner@example.com ")),
    ).rejects.toThrow("redirect:/forgot-password?status=sent");

    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith(
      "Owner@example.com",
      { redirectTo: "https://app.example.com/auth/callback" },
    );
  });

  it("returns the neutral result without contacting Auth for other emails", async () => {
    await expect(
      requestPasswordReset(resetRequest("other@example.com")),
    ).rejects.toThrow("redirect:/forgot-password?status=sent");
    expect(mocks.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it("reports a delivery failure without exposing provider details", async () => {
    mocks.resetPasswordForEmail.mockResolvedValue({
      error: { message: "sensitive provider details" },
    });
    await expect(
      requestPasswordReset(resetRequest("owner@example.com")),
    ).rejects.toThrow("redirect:/forgot-password?error=delivery_failed");
  });
});

describe("recovery callback", () => {
  it("exchanges the PKCE code and opens the password form", async () => {
    const response = await recoveryCallback(
      new Request(
        "https://app.example.com/auth/callback?code=one-time&sb_flow_id=flow-1",
      ),
    );

    expect(mocks.exchangeCodeForSession).toHaveBeenCalledWith("one-time", {
      flowId: "flow-1",
    });
    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(
      "https://app.example.com/update-password",
    );
  });

  it("rejects missing or invalid one-time codes", async () => {
    const missing = await recoveryCallback(
      new Request("https://app.example.com/auth/callback"),
    );
    expect(missing.headers.get("location")).toBe(
      "https://app.example.com/login?error=recovery_failed",
    );

    mocks.exchangeCodeForSession.mockResolvedValue({
      error: { message: "expired" },
    });
    const expired = await recoveryCallback(
      new Request("https://app.example.com/auth/callback?code=expired"),
    );
    expect(expired.headers.get("location")).toBe(
      "https://app.example.com/login?error=recovery_failed",
    );
  });
});

describe("password update", () => {
  it("requires a matching password with at least 12 characters", () => {
    expect(
      passwordUpdateSchema.safeParse({
        password: "short",
        passwordConfirmation: "short",
      }).success,
    ).toBe(false);
    expect(
      passwordUpdateSchema.safeParse({
        password: "long-enough-password",
        passwordConfirmation: "different-password",
      }).success,
    ).toBe(false);
  });

  it("updates the authenticated allowlisted user", async () => {
    await expect(
      updatePassword(passwordUpdate("long-enough-password")),
    ).rejects.toThrow("redirect:/dashboard");

    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.updateUser).toHaveBeenCalledWith({
      password: "long-enough-password",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("does not update a password without an authenticated session", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    await expect(
      updatePassword(passwordUpdate("long-enough-password")),
    ).rejects.toThrow("redirect:/login?error=recovery_failed");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });
});
