import { expect, test } from "@playwright/test";

test("navigates between home and about without a full reload", async ({
    page,
}) => {
    await page.goto("/");
    await expect(
        page.getByRole("heading", { name: "Vite + Alpine + Tailwind" }),
    ).toBeVisible();

    // Client-side navigation (pinecone-router intercepts the link).
    await page.getByRole("link", { name: "About", exact: true }).click();
    await expect(page).toHaveURL(/\/about$/);
    await expect(
        page.getByRole("heading", { name: "About this template" }),
    ).toBeVisible();

    // Alpine initializes the swapped-in Web Component (accordion works).
    const answer = page.getByTestId("faq-answer");
    await expect(answer).toBeHidden();
    await page.getByTestId("faq-toggle").click();
    await expect(answer).toBeVisible();

    // ...and back home.
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await expect(page).toHaveURL(/\/$/);
    await expect(
        page.getByRole("heading", { name: "Vite + Alpine + Tailwind" }),
    ).toBeVisible();
});

test("highlights the active nav link", async ({ page }) => {
    await page.goto("/blog");
    const blogLink = page.getByRole("link", { name: "Blog", exact: true });
    await expect(blogLink).toHaveClass(/text-brand-1/);
});
