import Alpine from "alpinejs";
import PineconeRouter from "pinecone-router";
import { blogPost, counter } from "./alpine";
import { posts } from "./content/posts";

// Register the router plugin + typed Alpine.data components — all must run
// before Alpine.start(). NOTE: pinecone-router v7 takes NO options here;
// settings() is a separate function called in `alpine:init` below.
Alpine.plugin(PineconeRouter);
Alpine.data("counter", counter);
Alpine.data("blogPost", blogPost);

document.addEventListener("alpine:init", () => {
    // Data the plain-HTML pages read at runtime (they can't import TS): the
    // build-time version (footer), the deploy base path (asset URLs), and the
    // blog posts (blog index `x-for`). See src/pages/*.html.
    Alpine.store("app", {
        version: __APP_VERSION__,
        base: import.meta.env.BASE_URL,
        posts,
    });

    window.PineconeRouter.settings({
        // Vite injects the deploy subpath as BASE_URL ("/" in dev). pinecone's
        // basePath must NOT keep the trailing slash, or routes double up. It is
        // also auto-prepended to the `x-template` file URLs.
        basePath: import.meta.env.BASE_URL.replace(/\/$/, ""),
        // Load matched routes into <main id="app"> (matches `.target.app`).
        targetID: "app",
        // History mode (clean URLs); the build emits a 404.html SPA fallback.
        hash: false,
    });
});

// Expose for devtools / debugging.
window.Alpine = Alpine;

// Start — walks the DOM, registers magics ($router/$params), attaches the
// MutationObserver (which inits the HTML pinecone loads), then the router
// performs its first navigation.
Alpine.start();
