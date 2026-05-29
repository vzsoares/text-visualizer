import { expect, test } from "@playwright/test";

test("home loads the input view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("visualizer-input")).toBeVisible();
    await expect.poll(() => page.evaluate(() => "Alpine" in window)).toBe(true);
});

test("unknown routes show the 404 page", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(
        page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();
});
