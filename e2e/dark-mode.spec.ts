import { expect, test } from "@playwright/test";

// Start from a known light baseline so the toggle is deterministic.
test.use({ colorScheme: "light" });

test("theme toggle switches dark mode on and off", async ({ page }) => {
    await page.goto("/");

    const body = page.locator("body");
    const card = page.getByTestId("demo-card");
    const toggle = page.getByRole("button", { name: "Toggle dark mode" });

    // Light baseline.
    await expect(body).not.toHaveClass(/\bdark\b/);
    const lightBg = await card.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
    );

    // Toggle on: body gets `.dark` and a `dark:` utility actually changes.
    await toggle.click();
    await expect(body).toHaveClass(/\bdark\b/);
    const darkBg = await card.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
    );
    expect(darkBg).not.toBe(lightBg);

    // Toggle back off.
    await toggle.click();
    await expect(body).not.toHaveClass(/\bdark\b/);
});

test("theme choice persists across reloads", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");

    // OS is light; turn dark mode on, then reload.
    await expect(body).not.toHaveClass(/\bdark\b/);
    await page.getByRole("button", { name: "Toggle dark mode" }).click();
    await expect(body).toHaveClass(/\bdark\b/);

    await page.reload();
    await expect(body).toHaveClass(/\bdark\b/); // remembered via localStorage
});
