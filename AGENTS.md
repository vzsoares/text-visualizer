# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see `README.md`.

## What this is

**Text Visualizer** — a lightweight client-side SPA built on Vite + Alpine.js + Tailwind.
The user types text, picks a display mode (QR, large text, marquee, blink, mirror, morse),
tunes a few controls, and the result opens fullscreen. UI is authored as a plain HTML page,
made reactive with Alpine, and routed with **pinecone-router**. Nothing is prerendered — the
server ships one `index.html` shell.

All controls (text, mode, speed, colors, orientation) live on the home page; the fullscreen
view is deliberately chrome-free — just the visualization and a close button.

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
  (`x-data="textVisualizer"`) that manages persisted settings + transient view state.
- **The `page-templates` plugin** (`vite.config.ts`) serves `src/pages/*.html` at
  `/pages/*.html` in dev and emits them to `dist/pages/` on build.
- **Persistent chrome is inline** in `index.html` — minimal nav (wordmark + dark-mode toggle)
  and a version+credit footer.
- **Pure logic is in `src/modes.ts`** (DOM/Alpine-free, unit-tested in `modes.test.ts`):
  the **mode registry** (`MODES` — add a mode here + a matching `x-show` view; the home
  buttons render from it via `x-for`), Morse conversion (`textToMorse`/`morseTimeline`),
  the centralized `speed` → per-mode timing mappers, and deep-link `encodeQuery`/`decodeQuery`.
- **Reactive glue is in `src/alpine.ts`** — the `textVisualizer()` factory: `open(mode)`,
  `close()`, `updateQr()`, `fitText`, `fitMarqueeFont`, the morse player, fullscreen +
  wake-lock, and URL sync. Browser APIs are feature-guarded so the factory stays
  unit-testable under Node.
- **`fitText`** binary-searches the max font size that fits using an off-screen helper
  (avoids `overflow:hidden` skew); it's **orientation-aware** (swaps the available
  width/height when the stage is rotated for vertical layout).
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
  Inject noop stubs: `Object.assign(textVisualizer(), { $nextTick: () => {} })`. Keep all
  DOM/browser work inside `$nextTick`/`requestAnimationFrame` callbacks or behind
  `typeof window/document/navigator` guards so the factory runs under Node (`test.environment: "node"`).
- **`persisted(value, key)` is a node-safe `$persist` wrapper.** It calls
  `window.Alpine.$persist(v).as("tv-"+key)` in the browser but returns the plain value when
  `window`/`$persist` is absent (unit tests). The persist plugin is registered in `app.ts`.
- **`@alpinejs/persist` ships no types.** Its ambient `declare module` lives in
  `src/alpinejs-persist.d.ts` (a file with **no** top-level import/export, so it *provides*
  types); the `$persist` magic is added to Alpine via a module augmentation in `globals.d.ts`.
- **NEVER put `x-show` and a *string* `:style` on the same element.** `x-show` toggles the
  element's inline `display`; a string `:style` binding rewrites the whole `style` attribute
  on every re-render and **wipes `display:none`**, so the element pops visible. Use the
  **object** form (`:style="{ background: bg }"`) — Alpine sets only those properties and
  leaves `x-show`'s `display` alone. (Bit the overlay and the blink `<p>`.)
- **Marquee loops via two side-by-side copies**, translating `translateX(0)` →
  `translateX(calc(-1 * var(--marquee-dist)))`. `--marquee-dist` is the measured width of one
  copy, stored in **reactive state** (`marqueeDist`) and emitted inside the element's `:style`
  string — NOT set imperatively with `style.setProperty`, which the `:style` re-render (on
  speed change) would wipe, breaking the loop. Measure only after a `requestAnimationFrame`
  so layout has committed.
- **Marquee font is canvas-measured** (`fitMarqueeFont`): `ctx.measureText` gives the glyph
  ink height (`actualBoundingBoxAscent + actualBoundingBoxDescent`), sized to ~90% of the
  cross-axis so descenders (g/p/q) aren't clipped — a fixed `font-size: 100vh` clips them.
- **All text modes (large, mirror, blink) must call `fitText`.** They share `TEXT_REFS`
  (mode → `x-ref`); forgetting one leaves that mode at the default tiny font.
- **Vertical layout rotates the stage**, not each element: the overlay's inner stage gets
  `rotate-90` + swapped `100vh`/`100vw` dims. Tailwind 4's `rotate-90` uses the standalone
  `rotate` CSS property (computed `transform` stays `none` — test the right property).
- **The rotated stage MUST be `shrink-0`.** It's a flex child of the centered overlay; in
  vertical its `width:100vh` exceeds the (portrait) viewport width, so default flex-shrink
  collapses it to a square — text then fills only a centered square, not the full long axis.
  Only reproduces on mobile (on desktop `100vh` < viewport width, so it never shrinks).
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
