# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see `README.md`.

## What this is

**Text Visualizer** — a lightweight client-side SPA built on Vite + Alpine.js + Tailwind.
The user types text, picks a display mode (QR code, large text, marquee, blink), and the
result opens fullscreen. UI is authored as a plain HTML page, made reactive with Alpine,
and routed with **pinecone-router**. Nothing is prerendered — the server ships one `index.html` shell.

## Always verify before delivering

Run the full suite and fix anything red **before** presenting a change:

```bash
bun run check       # Biome lint + format (writes)
bun run typecheck   # tsc --noEmit
bun run test        # Vitest unit tests
bun run build       # Vite build (emits dist/ + 404.html)
bun run test:e2e    # Playwright: dev + production-build suites (first time: bunx playwright install chromium)
```

`test:e2e` runs two projects from one `playwright.config.ts`: `dev` (`e2e/` vs.
the dev server) and `preview` (`e2e-preview/` vs. the production build under the
Pages base path — this catches base-path and 404.html SPA-fallback regressions,
and is what CI gates on). Run a single suite with `playwright test --project=dev|preview`.

For UI changes, also **look at the result** (`bun run dev`, or a Playwright screenshot) —
several layout/timing bugs are only visible visually.

## How the repo works

- **One page (`home.html`).** The entire app is `src/pages/home.html` — an Alpine component
  (`x-data="textVisualizer"`) that manages `text`, `activeMode`, and `qrSvg` state.
- **The `page-templates` plugin** (`vite.config.ts`) serves `src/pages/*.html` at
  `/pages/*.html` in dev and emits them to `dist/pages/` on build.
- **Persistent chrome is inline** in `index.html` — minimal nav (wordmark + dark-mode toggle)
  and a version footer.
- **Reactive logic is in `src/alpine.ts`** — `textVisualizer()` factory: `open(mode)`,
  `close()`, `updateQr()`, `fitText(el)`. DOM-free methods are unit-tested in Vitest.
- **`fitText`** binary-searches the maximum font size that fits the viewport using an
  off-screen helper element (avoids `overflow:hidden` measurement skew).
- **`src/config.ts`** holds the deploy base path (`BASE = "/text-visualizer/"`), shared
  by the build and the router.

## Tools

Bun (pm + runner) · Biome (lint/format) · Vitest (unit) · Playwright (e2e) ·
release-it (releases). Vite 8 is Rolldown/**oxc**-based. Runtime libs: `alpinejs`,
`pinecone-router`, `tailwindcss`/`daisyui`, `uqr`.

## Gotchas (learned the hard way)

- **Pages are plain HTML served by the `page-templates` plugin** — not bundled.
  In dev its middleware must run BEFORE Vite's SPA fallback (added directly inside
  `configureServer`, not the returned post-hook), or `/pages/x.html` would resolve
  to `index.html`. On build it emits the files to `dist/pages/`.
- **Don't call `Alpine.initTree()` yourself.** Alpine's initial walk inits the
  inline chrome; its MutationObserver inits the HTML pinecone loads into `#app`. A
  manual init double-binds handlers.
- **`fitText` uses an off-screen helper**, not `getBoundingClientRect()` on the actual
  element — the overlay's `overflow:hidden` clips `getBoundingClientRect()` and returns
  the container width, not the text's intrinsic width.
- **Alpine magic props (`$watch`, `$nextTick`, `$refs`) aren't available in unit tests.**
  Inject noop stubs: `Object.assign(textVisualizer(), { $nextTick: () => {} })`.
- **Marquee loops via two side-by-side copies.** The animation moves `translateX(0)`
  → `translateX(-50%)` — exactly one copy's width — so the second copy seamlessly
  replaces the first with no visible gap or jump.
- **Tailwind auto-scans `src/`**, so classes used only in `src/pages/*.html` are
  generated — no `@source` needed.
- **Biome lints the page HTML.** Alpine-driven anchors (text via `x-text`) trip
  `a11y/useAnchorContent`; it's turned off for `src/pages/**/*.html` via a
  `biome.json` `overrides` entry.
- **pinecone v7: `settings()` is a function, called in `alpine:init`** — NOT
  options passed to `Alpine.plugin()`. We set `basePath`, `targetID`, `hash`.
- **basePath must NOT have a trailing slash** (`import.meta.env.BASE_URL` does) or
  routes double up. We strip it: `.replace(/\/$/, "")`.
- **The `notfound` route ships a default handler that `console.error`s.** We
  override it with `x-handler="[]"` so the console stays clean.
- **GitHub Pages needs a `404.html` SPA fallback.** The build copies
  `dist/index.html` → `dist/404.html` so deep links / refreshes boot the app.
- **`base` lives in `src/config.ts` (`BASE = "/text-visualizer/"`)**, applied for
  build + preview only (dev stays `/`). It drives both Vite's `base` and the router `basePath`.

## Conventions

- Avoid `as` / `any` — narrow with typed `this` params / type guards.
- Match existing style; Biome formats (4-space indent, double quotes).
- Commit directly to `main` (no feature branch).
- Keep `README.md` in sync when behavior/visuals change.
