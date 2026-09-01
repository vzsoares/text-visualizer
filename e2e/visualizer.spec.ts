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

test("marquee text size scales the marquee font", async ({ page }) => {
    await page.goto("/");
    await page.getByTestId("visualizer-input").fill("Casa Comigo");
    await page.getByTestId("mode-marquee").click();
    const marquee = page.getByTestId("view-marquee").locator("> div");
    await expect(marquee).toBeVisible();
    const fontAt = async () =>
        Number.parseFloat(
            await marquee.evaluate((el) => getComputedStyle(el).fontSize),
        );

    await expect.poll(fontAt).toBeGreaterThan(0);
    const big = await fontAt();
    await page.getByTestId("close-btn").click();
    await page.getByTestId("control-marquee-size").fill("30");
    await page.getByTestId("mode-marquee").click();
    // Poll: the refit lands in Alpine's $nextTick, after the click resolves.
    await expect.poll(fontAt).toBeLessThan(big);
});

test("marquee never clips descenders against the screen edge", async ({
    page,
}) => {
    // Regression: the wrapper's overflow-hidden was only as tall as the em
    // box, and the stage centres that box rather than the glyph ink — so a
    // "g"/"p" tail was cut off. Checked on real pixels, not on the geometry
    // the app itself computed.
    await page.goto("/");
    await page.getByTestId("visualizer-input").fill("gjpqy Casa");
    await page.getByTestId("control-marquee-size").fill("90");
    await page.getByTestId("mode-marquee").click();
    await expect(page.getByTestId("view-marquee")).toBeVisible();
    await page.waitForTimeout(300);

    const shot = (await page.screenshot()).toString("base64");
    const rows = await page.evaluate(async (data) => {
        const res = await fetch(`data:image/png;base64,${data}`);
        const bmp = await createImageBitmap(await res.blob());
        const c = document.createElement("canvas");
        c.width = bmp.width;
        c.height = bmp.height;
        const ctx = c.getContext("2d");
        if (!ctx) throw new Error("no 2d context");
        ctx.drawImage(bmp, 0, 0);
        const { data: px } = ctx.getImageData(0, 0, c.width, c.height);
        let first = -1;
        let last = -1;
        for (let y = 0; y < c.height; y++) {
            let dark = 0;
            for (let x = 0; x < c.width; x++) {
                // ignore the close button in the top-right corner
                if (y < 80 && x > c.width - 120) continue;
                const i = (y * c.width + x) * 4;
                if (px[i] < 100 && px[i + 1] < 100 && px[i + 2] < 100) dark++;
            }
            if (dark > 2) {
                if (first < 0) first = y;
                last = y;
            }
        }
        return { first, last, height: c.height };
    }, shot);

    // At 90% the ink must clear both edges, and sit centred between them.
    expect(rows.first).toBeGreaterThan(4);
    expect(rows.last).toBeLessThan(rows.height - 5);
    expect(Math.abs(rows.first - (rows.height - rows.last))).toBeLessThan(20);
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

test("vertical layout fills the full viewport on a phone (not a centered square)", async ({
    browser,
}) => {
    // Regression: the rotated stage is a flex child; without shrink-0 it
    // collapsed to the narrow viewport width, becoming a square.
    const ctx = await browser.newContext({
        viewport: { width: 390, height: 844 },
    });
    const page = await ctx.newPage();
    await page.goto("/");
    await page.getByTestId("visualizer-input").fill("Casa Comigo Marry Me");
    await page.getByTestId("orient-vertical").click();
    await page.getByTestId("mode-large").click();
    await expect(page.getByTestId("view-large")).toBeVisible();

    const stage = page.locator('[data-testid="fullscreen-overlay"] .relative');
    const box = await stage.boundingBox();
    expect(box?.width).toBeGreaterThan(380);
    expect(box?.height).toBeGreaterThan(800);
    await ctx.close();
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
