import { expect, test } from "@playwright/test";
import { posts } from "../src/content/posts";

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
    await expect(
        page.getByRole("heading", { name: "Vite + Alpine + Tailwind" }),
    ).toBeVisible();
    await expect.poll(() => page.evaluate(() => "Alpine" in window)).toBe(true);
    expect(failures, "no failed requests on the built home page").toEqual([]);
});

test("a deep link resolves and survives a reload (SPA fallback + basePath)", async ({
    page,
}) => {
    const slug = posts[0].slug;
    await page.goto(`blog/${slug}`);
    await expect(
        page.getByRole("heading", { name: posts[0].title, level: 1 }),
    ).toBeVisible();

    // Reloading a non-index path is the GitHub Pages 404.html / SPA-fallback case.
    await page.reload();
    await expect(
        page.getByRole("heading", { name: posts[0].title, level: 1 }),
    ).toBeVisible();

    // The URL stays under a single base (guards the double-base regression).
    const path = new URL(page.url()).pathname;
    expect(path.startsWith("/vite-alpine-tailwind/")).toBe(true);
    expect(path).not.toContain("vite-alpine-tailwind/vite-alpine-tailwind");
});

test("client navigation keeps the base prefix", async ({ page }) => {
    await page.goto("./");
    await page.getByRole("link", { name: "Blog", exact: true }).click();
    await expect(page).toHaveURL(/\/vite-alpine-tailwind\/blog$/);
    await expect(
        page.getByRole("heading", { name: "Blog", level: 1 }),
    ).toBeVisible();
});
