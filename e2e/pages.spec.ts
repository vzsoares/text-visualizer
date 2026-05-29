import { expect, test } from "@playwright/test";

// One smoke test per route: client-side routing renders its content, assets
// load, and Alpine boots. (Single shell, routed in the browser by pinecone.)
const PAGES = [
    { url: "/", heading: "Vite + Alpine + Tailwind" },
    { url: "/about", heading: "About this template" },
    { url: "/blog", heading: "Blog" },
    { url: "/this-route-does-not-exist", heading: "Page not found" },
];

for (const { url, heading } of PAGES) {
    test(`${url} renders, loads its assets, and boots Alpine`, async ({
        page,
    }) => {
        const failures: string[] = [];
        page.on("requestfailed", (req) =>
            failures.push(`${req.url()} (${req.failure()?.errorText})`),
        );
        page.on("response", (res) => {
            if (res.status() >= 400)
                failures.push(`${res.status()} ${res.url()}`);
        });

        await page.goto(url);

        await expect(
            page.getByRole("heading", { name: heading }),
        ).toBeVisible();
        // app.ts ran (assigns window.Alpine) — the module loaded and started.
        await expect
            .poll(() => page.evaluate(() => "Alpine" in window))
            .toBe(true);
        expect(failures, `no failed requests on ${url}`).toEqual([]);
    });
}
