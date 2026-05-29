import { describe, expect, it } from "vitest";
import { blogPost, counter } from "./alpine";

describe("counter", () => {
    it("increments, decrements, and resets from its start value", () => {
        const c = counter(2);
        expect(c.count).toBe(2);
        c.increment();
        expect(c.count).toBe(3);
        c.decrement();
        c.decrement();
        expect(c.count).toBe(1);
        c.reset();
        expect(c.count).toBe(2);
    });

    it("defaults to 0", () => {
        expect(counter().count).toBe(0);
    });
});

describe("blogPost", () => {
    it("resolves a post and its prev/next neighbours by slug", () => {
        const b = blogPost();
        b.load("sed-do-eiusmod"); // the middle post
        expect(b.post?.slug).toBe("sed-do-eiusmod");
        expect(b.prev?.slug).toBe("lorem-ipsum-dolor");
        expect(b.next?.slug).toBe("ut-enim-ad-minim");
    });

    it("has no prev on the first post", () => {
        const b = blogPost();
        b.load("lorem-ipsum-dolor");
        expect(b.prev).toBeUndefined();
        expect(b.next?.slug).toBe("sed-do-eiusmod");
    });

    it("leaves post undefined for an unknown slug", () => {
        const b = blogPost();
        b.load("nope");
        expect(b.post).toBeUndefined();
        expect(b.prev).toBeUndefined();
        expect(b.next).toBeUndefined();
    });
});
