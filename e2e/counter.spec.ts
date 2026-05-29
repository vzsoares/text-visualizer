import { expect, test } from "@playwright/test";

test("typing text enables mode buttons and opens fullscreen overlay", async ({
    page,
}) => {
    await page.goto("/");

    const input = page.getByTestId("visualizer-input");
    const largeBtn = page.getByTestId("mode-large");
    const overlay = page.getByTestId("fullscreen-overlay");

    // Buttons are disabled before typing
    await expect(largeBtn).toBeDisabled();

    // Type text — buttons become enabled
    await input.fill("hello");
    await expect(largeBtn).toBeEnabled();

    // Click a mode — overlay appears
    await largeBtn.click();
    await expect(overlay).toBeVisible();
    await expect(page.getByTestId("view-large")).toBeVisible();

    // Close button dismisses overlay
    await page.getByTestId("close-btn").click();
    await expect(overlay).toBeHidden();
});

test("Escape key closes the fullscreen overlay", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("visualizer-input").fill("test");
    await page.getByTestId("mode-blink").click();
    await expect(page.getByTestId("fullscreen-overlay")).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("fullscreen-overlay")).toBeHidden();
});

test("QR mode shows an SVG for typed text", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("visualizer-input").fill("test text");
    await page.getByTestId("mode-qr").click();
    const qrView = page.getByTestId("view-qr");
    await expect(qrView).toBeVisible();
    const svg = qrView.locator("svg");
    await expect(svg).toBeVisible();
});
