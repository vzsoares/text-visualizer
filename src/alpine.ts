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
