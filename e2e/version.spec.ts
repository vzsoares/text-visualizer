import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { expect, test } from "@playwright/test";

const { version } = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf-8"),
);

test("footer displays the project version", async ({ page }) => {
    await page.goto("/");

    const footerVersion = page.getByTestId("app-version");

    await expect(footerVersion).toBeVisible();
    await expect(footerVersion).toHaveText(`v${version}`);
});
