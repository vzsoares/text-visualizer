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

test("all six registry modes have a selector button and open a view", async ({
    page,
}) => {
    await page.goto("/");
    await page.getByTestId("visualizer-input").fill("hello world");
    const modes = ["qr", "large", "marquee", "blink", "mirror", "morse"];
    await expect(page.locator('[data-testid^="mode-"]')).toHaveCount(
        modes.length,
    );
    for (const m of modes) {
        await page.getByTestId(`mode-${m}`).click();
        await expect(page.getByTestId(`view-${m}`)).toBeVisible();
        await page.getByTestId("close-btn").click();
        await expect(page.getByTestId("fullscreen-overlay")).toBeHidden();
    }
});

test("changing a control does not pop the overlay open", async ({ page }) => {
    // Regression: a string :style binding on the overlay used to clobber
    // x-show's display:none whenever color/bg re-rendered.
    await page.goto("/");
    await page.getByTestId("visualizer-input").fill("hello");
    const overlay = page.getByTestId("fullscreen-overlay");
    await expect(overlay).toBeHidden();

    await page.getByTestId("control-color").evaluate((el) => {
        const input = el as HTMLInputElement;
        input.value = "#1d4ed8";
        input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.getByTestId("control-speed").fill("8");
    await expect(overlay).toBeHidden();
});

test("swap button exchanges the foreground and background colors", async ({
    page,
}) => {
    await page.goto("/");
    const fg = page.getByTestId("control-color");
    const bg = page.getByTestId("control-bg");
    const before = {
        fg: await fg.inputValue(),
        bg: await bg.inputValue(),
    };
    await page.getByTestId("control-swap").click();
    expect(await fg.inputValue()).toBe(before.bg);
    expect(await bg.inputValue()).toBe(before.fg);
});

test("a deep link auto-opens the mode and the text persists on reload", async ({
    page,
}) => {
    await page.goto("/?text=Shared%20Message&mode=large");
    await expect(page.getByTestId("fullscreen-overlay")).toBeVisible();
    await expect(page.getByTestId("view-large")).toHaveText("Shared Message");

    await page.getByTestId("close-btn").click();
    await page.reload();
    await expect(page.getByTestId("visualizer-input")).toHaveValue(
        "Shared Message",
    );
});
