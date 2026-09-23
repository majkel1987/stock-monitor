import { expect, test } from "@playwright/test";

test("anonymous user is redirected from the dashboard", async ({ page }) => {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText("Stock Monitor")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("anonymous user is redirected from a protected deep link", async ({
  page,
}) => {
  await page.goto("/stocks/gpw/PZU");
  await expect(page).toHaveURL(/\/login$/);
});

test("login remains public and has no signup flow", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.getByRole("link", { name: /sign up/i })).toHaveCount(0);
  await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
});

test("private HTTP entry point rejects anonymous requests", async ({
  request,
}) => {
  const response = await request.post("/api/internal/market-sync");
  expect(response.status()).toBe(401);
  await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
});

test("public health endpoint exposes no internal details", async ({
  request,
}) => {
  const response = await request.get("/api/health");
  expect(response.status()).toBe(200);
  await expect(response.json()).resolves.toEqual({ status: "ok" });
  expect(response.headers()["cache-control"]).toContain("no-store");
});
