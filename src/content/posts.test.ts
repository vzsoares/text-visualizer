import { describe, expect, it } from "vitest";
import { getPost, posts } from "./posts";

describe("getPost", () => {
    it("finds a post by slug", () => {
        expect(getPost(posts[0].slug)).toBe(posts[0]);
    });

    it("returns undefined for an unknown slug", () => {
        expect(getPost("does-not-exist")).toBeUndefined();
    });

    it("gives every post a unique slug", () => {
        const slugs = posts.map((p) => p.slug);
        expect(new Set(slugs).size).toBe(slugs.length);
    });
});
