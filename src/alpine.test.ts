import { describe, expect, it } from "vitest";
import { blogPost, counter, textVisualizer } from "./alpine";

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

describe("textVisualizer", () => {
    it("initializes with empty text and no active mode", () => {
        const v = textVisualizer();
        expect(v.text).toBe("");
        expect(v.activeMode).toBeNull();
        expect(v.qrSvg).toBe("");
    });

    it("open() sets the active mode", () => {
        // Inject a noop $nextTick — Alpine provides this at runtime; not available in unit tests.
        const v = Object.assign(textVisualizer(), {
            $nextTick: (_cb: () => void) => {},
        });
        v.open("large");
        expect(v.activeMode).toBe("large");
        v.open("blink");
        expect(v.activeMode).toBe("blink");
    });

    it("close() clears the active mode", () => {
        const v = Object.assign(textVisualizer(), {
            $nextTick: (_cb: () => void) => {},
        });
        v.open("marquee");
        v.close();
        expect(v.activeMode).toBeNull();
    });

    it("open('qr') with text generates an SVG", () => {
        const v = Object.assign(textVisualizer(), {
            $nextTick: (_cb: () => void) => {},
        });
        v.text = "hello";
        v.open("qr");
        expect(v.qrSvg).toContain("<svg");
    });

    it("updateQr leaves qrSvg empty for blank text", () => {
        const v = textVisualizer();
        v.text = "   ";
        v.updateQr();
        expect(v.qrSvg).toBe("");
    });
});
