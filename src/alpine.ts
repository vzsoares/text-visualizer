import { renderSVG } from "uqr";
import { type Post, posts } from "./content/posts";

/** Reactive state for the `counter` demo component. */
export interface CounterState {
    count: number;
    increment(): void;
    decrement(): void;
    reset(): void;
}

/**
 * The typed `counter` Alpine.data component used by the home page's demo. Kept as
 * a plain factory (no DOM/Alpine deps) so it is trivially unit-testable.
 */
export function counter(start = 0): CounterState {
    return {
        count: start,
        increment(this: CounterState) {
            this.count++;
        },
        decrement(this: CounterState) {
            this.count--;
        },
        reset(this: CounterState) {
            this.count = start;
        },
    };
}

/** Reactive state for the `/blog/:slug` post page. */
export interface BlogPostState {
    post?: Post;
    prev?: Post;
    next?: Post;
    load(slug: string): void;
}

/**
 * `blogPost` Alpine.data for the post page (`src/pages/post.html`). Driven by
 * `x-effect="load($params.slug)"`
 * so it (re)resolves the post whenever the `:slug` route param changes — pinecone
 * does NOT re-render the template when navigating between two posts on the same
 * route (e.g. prev/next), so reading the slug once in `init()` would go stale.
 */
export function blogPost(): BlogPostState {
    return {
        post: undefined,
        prev: undefined,
        next: undefined,
        load(this: BlogPostState, slug: string) {
            const index = posts.findIndex((p) => p.slug === slug);
            this.post = index >= 0 ? posts[index] : undefined;
            this.prev = index > 0 ? posts[index - 1] : undefined;
            this.next = index >= 0 ? posts[index + 1] : undefined;
        },
    };
}

export type VisualizerMode = "qr" | "large" | "marquee" | "blink";

export interface TextVisualizerState {
    text: string;
    activeMode: VisualizerMode | null;
    qrSvg: string;
    open(m: VisualizerMode): void;
    close(): void;
    updateQr(): void;
    fitText(el: HTMLElement): void;
    init(): void;
}

type AlpineThis = TextVisualizerState & {
    $watch: (k: string, cb: () => void) => void;
    $nextTick: (cb: () => void) => void;
    $refs: Record<string, HTMLElement>;
};

export function textVisualizer(): TextVisualizerState {
    return {
        text: "",
        activeMode: null,
        qrSvg: "",

        init(this: AlpineThis) {
            this.$watch("text", () => {
                if (this.activeMode === "qr") this.updateQr();
            });
        },

        open(this: AlpineThis, m: VisualizerMode) {
            this.activeMode = m;
            if (m === "qr") this.updateQr();
            if (m === "large" || m === "blink") {
                this.$nextTick(() => {
                    const el =
                        this.$refs[m === "large" ? "largeText" : "blinkText"];
                    if (el) this.fitText(el);
                });
            }
        },

        close(this: TextVisualizerState) {
            this.activeMode = null;
        },

        updateQr(this: TextVisualizerState) {
            this.qrSvg = this.text.trim() ? renderSVG(this.text) : "";
        },

        // Binary-search the largest font-size (px) where the text fits within
        // the viewport. Uses an off-screen clone so overflow:hidden on the
        // overlay doesn't skew measurements.
        fitText(this: TextVisualizerState, el: HTMLElement) {
            const computed = getComputedStyle(el);
            const helper = document.createElement("span");
            helper.style.cssText = [
                "position:fixed",
                "left:-9999px",
                "top:-9999px",
                `max-width:${window.innerWidth}px`,
                `font-family:${computed.fontFamily}`,
                `font-weight:${computed.fontWeight}`,
                `word-break:${computed.wordBreak}`,
                `overflow-wrap:${computed.overflowWrap}`,
                "display:block",
            ].join(";");
            helper.textContent = el.textContent ?? "";
            document.body.appendChild(helper);

            let lo = 8;
            let hi = 3000;
            while (hi - lo > 2) {
                const mid = Math.round((lo + hi) / 2);
                helper.style.fontSize = `${mid}px`;
                if (
                    helper.scrollWidth <= window.innerWidth &&
                    helper.scrollHeight <= window.innerHeight
                ) {
                    lo = mid;
                } else {
                    hi = mid;
                }
            }
            document.body.removeChild(helper);
            el.style.fontSize = `${lo}px`;
        },
    };
}
