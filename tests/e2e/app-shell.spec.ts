import { expect, test } from "@playwright/test";

test("loads the application shell", async ({ page }) => {
  await page.goto("/dashboard");

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
});

const screens = [
  ["/dashboard", "Dashboard"],
  ["/watchlist", "Watchlist"],
  ["/stocks/usa/eme", "EMCOR Group"],
  ["/monitoring/new", "New monitoring · EMCOR Group"],
  ["/monitoring", "Monitoring history"],
  ["/settings/statuses", "Settings"],
  ["/settings/data", "Settings"],
  ["/login", "Stock Monitor"],
] as const;

for (const [route, heading] of screens) {
  test(`${route} renders without a framework error`, async ({ page }) => {
    const pageErrors: string[] = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.goto(route);

    await expect(
      page.getByRole("heading", { name: heading }).first(),
    ).toBeVisible();
    await expect(page.locator("[data-nextjs-dialog]")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}

test("primary navigation and settings tabs change routes", async ({ page }) => {
  await page.goto("/dashboard");
  await page.getByRole("link", { name: "Watchlist" }).click();
  await expect(page).toHaveURL(/\/watchlist$/);

  await page.goto("/settings/statuses");
  await page.getByRole("link", { name: "Data" }).click();
  await expect(page).toHaveURL(/\/settings\/data$/);
});
