import { expect, test } from "@playwright/test";

const email = process.env.E2E_USER_EMAIL;
const password = process.env.E2E_USER_PASSWORD;
const ticker = process.env.E2E_TICKER;

test("critical MVP journey with provider-unavailable manual fallback", async ({
  page,
}, testInfo) => {
  test.skip(
    !email || !password || !ticker,
    "Local E2E credentials are required.",
  );
  const runTicker = `${ticker}${testInfo.retry || ""}`;

  await page.goto("/login");
  await page.getByLabel("Email").fill(email!);
  await page.getByLabel("Password").fill(password!);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  await page.goto("/watchlist");
  await page.getByRole("button", { name: "+ Add stock" }).first().click();
  const addDialog = page.getByRole("dialog", { name: "Add stock" });
  await expect(addDialog.getByText("EODHD is not configured.")).toBeVisible();
  await addDialog.getByLabel("Ticker").fill(runTicker);
  await addDialog.getByLabel("Company name").fill("M7 E2E Company");
  await addDialog.getByRole("button", { name: "Add manually" }).click();
  await expect(addDialog).not.toBeVisible();

  await page.goto("/settings/data");
  await page.getByRole("button", { name: "Import GPW CSV" }).click();
  const importDialog = page.getByRole("dialog", {
    name: "Import GPW prices",
  });
  await importDialog
    .getByLabel("GPW stock")
    .selectOption({ label: `${runTicker} · M7 E2E Company` });
  await importDialog.getByLabel("Stooq CSV file").setInputFiles({
    name: `${runTicker}.csv`,
    mimeType: "text/csv",
    buffer: Buffer.from(
      "Date,Open,High,Low,Close,Volume\n2019-12-31,119,121,118,120,1000\n2020-01-01,121,125,120,124,1200",
    ),
  });
  await importDialog.getByRole("button", { name: "Import CSV" }).click();
  await expect(
    importDialog.getByText(
      "2 historical rows imported; the 2020-01-01 quote is now current.",
    ),
  ).toBeVisible();

  await page.goto("/watchlist");
  await page.getByRole("link", { name: runTicker, exact: true }).click();
  await page.getByRole("button", { name: "Set price" }).click();
  const quoteDialog = page.getByRole("dialog", {
    name: `Manual quote · ${runTicker}`,
  });
  await quoteDialog.getByLabel("Price · PLN").fill("123.45");
  await quoteDialog.getByLabel("As of").fill("2020-01-02T12:00");
  await quoteDialog.getByRole("button", { name: "Save quote" }).click();
  await expect(quoteDialog).not.toBeVisible();
  await expect(page.getByText("STALE", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Edit levels" }).click();
  const levelDialog = page.getByRole("dialog", { name: "Edit price levels" });
  await levelDialog.getByRole("button", { name: "Add level" }).click();
  await levelDialog.getByLabel("Label").fill("E2E buy level");
  await levelDialog.getByLabel("Value · PLN").fill("110");
  await levelDialog.getByRole("button", { name: "Add level" }).click();
  await expect(levelDialog.getByText("E2E buy level")).toBeVisible();
  await levelDialog.getByRole("button", { name: "Close" }).click();

  await page.getByRole("link", { name: "New monitoring" }).click();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("M7 monitoring A");
  await page.getByRole("button", { name: "Save monitoring" }).click();
  await expect(page).toHaveURL(new RegExp(`/stocks/gpw/${runTicker}$`, "i"));
  await expect(
    page.getByRole("article").filter({ hasText: "M7 monitoring A" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "New monitoring" }).click();
  await page
    .getByRole("textbox", { name: "Summary", exact: true })
    .fill("M7 monitoring B");
  await page.getByRole("button", { name: "Save monitoring" }).click();
  await expect(page).toHaveURL(new RegExp(`/stocks/gpw/${runTicker}$`, "i"));
  await expect(
    page.getByRole("article").filter({ hasText: "M7 monitoring A" }),
  ).toBeVisible();
  await expect(
    page.getByRole("article").filter({ hasText: "M7 monitoring B" }),
  ).toBeVisible();

  await page.goto("/dashboard");
  await expect(
    page.getByText(runTicker, { exact: true }).first(),
  ).toBeVisible();
  await page.goto("/watchlist");
  await page.getByRole("button", { name: `Archive ${runTicker}` }).click();
  await page
    .getByLabel("Show active or archived stocks")
    .selectOption("archived");
  await expect(
    page.getByRole("button", { name: `Restore ${runTicker}` }),
  ).toBeVisible();
  await page.getByRole("button", { name: `Restore ${runTicker}` }).click();
  await page
    .getByLabel("Show active or archived stocks")
    .selectOption("active");
  await expect(
    page.getByRole("link", { name: runTicker, exact: true }),
  ).toBeVisible();
});
