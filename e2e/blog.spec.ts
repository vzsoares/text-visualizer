import { expect, test } from "@playwright/test";
import { posts } from "../src/content/posts";

test("blog index lists every post", async ({ page }) => {
    await page.goto("/blog");
    await expect(
        page.getByRole("heading", { name: "Blog", level: 1 }),
    ).toBeVisible();
    for (const post of posts) {
        await expect(
            page.getByRole("link", { name: post.title }),
        ).toBeVisible();
    }
});

test("each post renders its title and body", async ({ page }) => {
    for (const post of posts) {
        await page.goto(`/blog/${post.slug}`);
        await expect(
            page.getByRole("heading", { name: post.title, level: 1 }),
        ).toBeVisible();
        // The HTML body rendered (it contains an <h2>), proving x-html injected it.
        await expect(
            page.getByRole("heading", { level: 2 }).first(),
        ).toBeVisible();
    }
});

test("navigates from the blog index into a post", async ({ page }) => {
    await page.goto("/blog");
    const first = posts[0];
    await page.getByRole("link", { name: first.title }).click();
    await expect(page).toHaveURL(new RegExp(`/blog/${first.slug}$`));
    await expect(
        page.getByRole("heading", { name: first.title, level: 1 }),
    ).toBeVisible();
});

test("prev/next updates content on a same-route param change", async ({
    page,
}) => {
    // This is the x-effect case: pinecone does NOT re-render the template when
    // navigating between two posts on the same /blog/:slug route.
    await page.goto(`/blog/${posts[0].slug}`);
    await expect(
        page.getByRole("heading", { name: posts[0].title, level: 1 }),
    ).toBeVisible();

    await page.getByRole("link", { name: new RegExp(posts[1].title) }).click();
    await expect(page).toHaveURL(new RegExp(`/blog/${posts[1].slug}$`));
    await expect(
        page.getByRole("heading", { name: posts[1].title, level: 1 }),
    ).toBeVisible();
});
