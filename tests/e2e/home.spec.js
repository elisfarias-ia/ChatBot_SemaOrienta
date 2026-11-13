// @ts-check
import { expect, test } from "@playwright/test";

test.describe("home (smoke)", () => {
  test("carrega em pt-BR com título e conteúdo principal", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);
    await expect(page).toHaveTitle(/SEMA-MT/);
    await expect(page.locator("html")).toHaveAttribute("lang", "pt-BR");
    await expect(page.getByRole("main")).toBeVisible();
  });
});
