import persist from "@alpinejs/persist";
import Alpine from "alpinejs";
import PineconeRouter from "pinecone-router";
import { textVisualizer } from "./alpine";

// Register plugins + the typed Alpine.data component — all must run before
// Alpine.start(). NOTE: pinecone-router v7 takes NO options here; settings() is
// a separate function called in `alpine:init` below.
Alpine.plugin(persist);
Alpine.plugin(PineconeRouter);
Alpine.data("textVisualizer", textVisualizer);

document.addEventListener("alpine:init", () => {
    // Data the plain-HTML pages read at runtime (they can't import TS): the
    // build-time version (footer) and the deploy base path (asset URLs).
    Alpine.store("app", {
        version: __APP_VERSION__,
        base: import.meta.env.BASE_URL,
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

// Expose for devtools / debugging (and the persisted() helper in alpine.ts).
window.Alpine = Alpine;

// Start — walks the DOM, registers magics ($router/$params), attaches the
// MutationObserver (which inits the HTML pinecone loads), then the router
// performs its first navigation.
Alpine.start();
