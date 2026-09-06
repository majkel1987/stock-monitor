import { beforeEach, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  signOut: vi.fn(),
  getUser: vi.fn(),
  setCookie: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`redirect:${url}`);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }));
vi.mock("next/headers", () => ({
  cookies: async () => ({
    getAll: () => [
      { name: "sb-project-auth-token.0", value: "sensitive" },
      { name: "unrelated", value: "keep" },
    ],
    set: mocks.setCookie,
  }),
}));
vi.mock("@/infrastructure/supabase/server/create-client", () => ({
  createClient: async () => ({ auth: mocks }),
}));

import { login, logout } from "@/app/(auth)/login/actions";

function credentials(email = "owner@example.com", password = "secret") {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  form.set("next", "https://attacker.test");
  return form;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("ALLOWED_USER_EMAIL", "owner@example.com");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "public-test-key");
  mocks.signInWithPassword.mockResolvedValue({ error: null });
  mocks.getUser.mockResolvedValue({
    data: { user: { id: "owner", email: "owner@example.com" } },
    error: null,
  });
  mocks.signOut.mockResolvedValue({ error: null });
});

it("validates before calling Auth", async () => {
  await expect(login(credentials("bad-email"))).rejects.toThrow(
    "redirect:/login?error=invalid_credentials",
  );
  expect(mocks.signInWithPassword).not.toHaveBeenCalled();
});

it("returns a neutral error without provider details", async () => {
  mocks.signInWithPassword.mockResolvedValue({
    error: { message: "account details" },
  });
  await expect(login(credentials())).rejects.toThrow(
    "redirect:/login?error=invalid_credentials",
  );
  expect(mocks.getUser).not.toHaveBeenCalled();
});

it("verifies the current user and ignores arbitrary redirect URLs", async () => {
  await expect(login(credentials())).rejects.toThrow("redirect:/dashboard");
  expect(mocks.getUser).toHaveBeenCalledOnce();
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
});

it("evicts a valid but forbidden session", async () => {
  mocks.getUser.mockResolvedValue({
    data: { user: { email: "other@example.com" } },
    error: null,
  });
  await expect(login(credentials())).rejects.toThrow(
    "redirect:/login?error=access_denied",
  );
  expect(mocks.signOut).toHaveBeenCalledWith({ scope: "local" });
  expect(mocks.setCookie).toHaveBeenCalledWith("sb-project-auth-token.0", "", {
    path: "/",
    maxAge: 0,
  });
});

it("logout clears only project cookies even when remote revocation fails", async () => {
  mocks.signOut.mockRejectedValue(new Error("offline"));
  await expect(logout()).rejects.toThrow("redirect:/login");
  expect(mocks.setCookie).toHaveBeenCalledTimes(1);
  expect(mocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
});
