import { expect, test } from "@playwright/test";

test("counter component increments, decrements, and resets", async ({
    page,
}) => {
    await page.goto("/");

    const value = page.getByTestId("counter-value");
    await expect(value).toHaveText("0");

    await page.getByTestId("counter-increment").click();
    await page.getByTestId("counter-increment").click();
    await expect(value).toHaveText("2");

    await page.getByTestId("counter-decrement").click();
    await expect(value).toHaveText("1");

    await page.getByTestId("counter-reset").click();
    await expect(value).toHaveText("0");
});
