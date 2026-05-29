import { expect, test } from "@playwright/test";

// baseURL already includes the Pages sub-path, so navigate with RELATIVE paths
// (a leading "/" would escape to the origin root).

test("home loads under the base path with all assets and boots Alpine", async ({
    page,
}) => {
    const failures: string[] = [];
    page.on("requestfailed", (r) =>
        failures.push(`${r.url()} (${r.failure()?.errorText})`),
    );
    page.on("response", (r) => {
        if (r.status() >= 400) failures.push(`${r.status()} ${r.url()}`);
    });

    await page.goto("./");
    await expect(page.getByTestId("visualizer-input")).toBeVisible();
    await expect.poll(() => page.evaluate(() => "Alpine" in window)).toBe(true);
    expect(failures, "no failed requests on the built home page").toEqual([]);
});

test("a deep link resolves and survives a reload (SPA fallback + basePath)", async ({
    page,
}) => {
    // Navigate to a non-index path to exercise the 404.html SPA fallback.
    await page.goto("notfound-path");
    await expect(
        page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();

    await page.reload();
    await expect(
        page.getByRole("heading", { name: "Page not found" }),
    ).toBeVisible();

    // The URL stays under a single base (guards the double-base regression).
    const path = new URL(page.url()).pathname;
    expect(path.startsWith("/text-visualizer/")).toBe(true);
    expect(path).not.toContain("text-visualizer/text-visualizer");
});

test("client navigation keeps the base prefix", async ({ page }) => {
    await page.goto("./");
    // Type text and open a mode to exercise client-side state.
    const input = page.getByTestId("visualizer-input");
    await input.fill("test");
    await page.getByTestId("mode-large").click();
    await expect(page.getByTestId("fullscreen-overlay")).toBeVisible();
    await page.getByTestId("close-btn").click();
    await expect(page.getByTestId("fullscreen-overlay")).toBeHidden();
    // URL stays at the base — no extra path segments.
    const path = new URL(page.url()).pathname;
    expect(path).toMatch(/\/text-visualizer\/?$/);
});
