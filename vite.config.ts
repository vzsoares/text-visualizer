/// <reference types="vitest/config" />
import { copyFileSync, existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { BASE } from "./src/config";

const { version } = JSON.parse(
    readFileSync(resolve(process.cwd(), "package.json"), "utf-8"),
);

/**
 * GitHub Pages serves `404.html` for any path it can't resolve to a file. For a
 * client-routed SPA, that means deep links and refreshes on routes like
 * `/blog/<slug>/` would 404 without a fallback. Copying the built `index.html`
 * to `404.html` makes every unknown path boot the same app shell; pinecone-router
 * then resolves the real route from `location.pathname`. Simpler and flash-free
 * compared to the redirect-script hack.
 */
function ghPagesSpaFallback(): Plugin {
    let outDir = "dist";
    return {
        name: "gh-pages-spa-fallback",
        apply: "build",
        configResolved(config) {
            outDir = config.build.outDir;
        },
        closeBundle() {
            const dir = resolve(process.cwd(), outDir);
            copyFileSync(resolve(dir, "index.html"), resolve(dir, "404.html"));
        },
    };
}

/**
 * Page templates live in `src/pages/*.html` — plain HTML loaded at runtime by
 * pinecone-router (`x-template="/pages/<name>.html"`). Vite doesn't serve `src/`
 * at a stable URL, so this plugin bridges both modes:
 *  - DEV: serve `src/pages/<name>.html` at `/pages/<name>.html`. Added inside
 *    `configureServer` (not the returned post-hook) so it runs BEFORE Vite's SPA
 *    fallback, which would otherwise answer with index.html.
 *  - BUILD: emit each file verbatim to `dist/pages/<name>.html`.
 */
function pageTemplates(): Plugin {
    const dir = resolve(process.cwd(), "src/pages");
    return {
        name: "page-templates",
        configureServer(server) {
            server.middlewares.use((req, res, next) => {
                const match = req.url?.match(
                    /^\/pages\/([\w-]+\.html)(?:\?.*)?$/,
                );
                const file = match && resolve(dir, match[1]);
                if (!file || !existsSync(file)) return next();
                res.setHeader("Content-Type", "text/html");
                res.end(readFileSync(file, "utf-8"));
            });
        },
        generateBundle() {
            for (const name of readdirSync(dir)) {
                if (!name.endsWith(".html")) continue;
                this.emitFile({
                    type: "asset",
                    fileName: `pages/${name}`,
                    source: readFileSync(resolve(dir, name), "utf-8"),
                });
            }
        },
    };
}

export default defineConfig(({ command, isPreview }) => ({
    // Build + preview run under the GitHub Pages project subpath; dev stays at
    // root for convenience. `import.meta.env.BASE_URL` follows this value, and
    // the router derives its basePath from it (see src/app.ts).
    base: command === "build" || isPreview ? BASE : "/",
    // SPA history-API fallback: serve index.html for unknown paths so client
    // routes (e.g. /about) resolve on a hard load / refresh in dev too.
    appType: "spa",
    plugins: [tailwindcss(), pageTemplates(), ghPagesSpaFallback()],
    define: {
        // App version, surfaced in the footer (see <app-footer>).
        __APP_VERSION__: JSON.stringify(version),
    },
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
    },
}));
