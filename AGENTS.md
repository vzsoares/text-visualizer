# AGENTS.md

Guidance for AI coding agents working in this repo. Humans: see `README.md`.

## What this is

A **lightweight client-side SPA** built on Vite + Alpine.js + Tailwind. The UI is
authored as **plain HTML pages** (Light DOM), made reactive with Alpine, and
routed in the browser with **pinecone-router**, which loads each route's HTML file
into the shell. Nothing is prerendered — the server ships one `index.html` shell.
See `DESIGN.md` for the visual system and `docs/pages-and-routing.md` for the page
+ routing pattern.

> The prerendered/SSG sibling is **vite-alpine-tailwind-x** (JSX + static HTML +
> blog/search/SEO). Don't bring that architecture here — this repo is deliberately
> pure client-side.

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
and is what CI gates on). Run a single suite with `playwright test
--project=dev|preview`.

For UI changes, also **look at the result** (`bun run dev`, or a Playwright
screenshot) — several layout/timing bugs are only visible visually.

## How the repo works

- **Pages are plain HTML.** Each route's UI is a plain HTML file in
  `src/pages/*.html` (Alpine directives, no TypeScript). pinecone-router loads it
  into `<main id="app">` via `x-template.target.app="/pages/<name>.html"`.
- **The `page-templates` plugin** (`vite.config.ts`) bridges `src/` and the URL
  pinecone fetches: it serves `src/pages/*.html` at `/pages/*.html` in dev and
  emits them to `dist/pages/` on build.
- **Persistent chrome is inline** in `index.html` — the nav (with the dark-mode
  toggle) and the footer are plain HTML + Alpine, present in the shell.
- **Routes are a table** in `index.html`. **Add a route = add `src/pages/<name>.html`
  + a `<template x-route>` row.**
- **Reactive logic is data factories.** `Alpine.data()` factories live in
  `src/alpine.ts` (`counter`, `blogPost`) — plain, DOM-free, unit-tested; pages
  reference them by `x-data`.
- **Runtime data for pages goes through `Alpine.store("app", …)`** (`src/app.ts`):
  `version`, `base` (asset URLs), `posts`. Plain HTML can't import TS, so pages
  read these via `$store.app`.
- **`src/config.ts`** holds the deploy base path (`BASE`), shared by the build
  (`vite.config.ts`) and the router (`src/app.ts`).

## Tools

Bun (pm + runner) · Biome (lint/format) · Vitest (unit) · Playwright (e2e) ·
release-it (releases). Vite 8 is Rolldown/**oxc**-based. Runtime libs: `alpinejs`,
`pinecone-router`, `tailwindcss`/`daisyui`.

## Gotchas (learned the hard way)

- **Pages are plain HTML served by the `page-templates` plugin** — not bundled.
  In dev its middleware must run BEFORE Vite's SPA fallback (added directly inside
  `configureServer`, not the returned post-hook), or `/pages/x.html` would resolve
  to `index.html`. On build it emits the files to `dist/pages/`.
- **Don't call `Alpine.initTree()` yourself.** Alpine's initial walk inits the
  inline chrome; its MutationObserver inits the HTML pinecone loads into `#app`. A
  manual init double-binds handlers (e.g. a counter that increments twice/click).
- **Pages can't import TS** — runtime values come from `$store.app` (`version`,
  `base`, `posts`), set in `alpine:init` before `Alpine.start()`.
- **Tailwind auto-scans `src/`**, so classes used only in `src/pages/*.html` are
  generated — no `@source` needed (they live under `src`).
- **Biome lints the page HTML.** Alpine-driven anchors (text via `x-text`) trip
  `a11y/useAnchorContent`; it's turned off for `src/pages/**/*.html` via a
  `biome.json` `overrides` entry.
- **Use Alpine's natural shorthands** in the page HTML — `@click`, `:class`,
  `x-text`, `x-show`, `x-html`.
- **pinecone v7: `settings()` is a function, called in `alpine:init`** — NOT
  options passed to `Alpine.plugin()`. We set `basePath`, `targetID` (capital ID),
  `hash`. `basePath` is also auto-prepended to the `x-template` file URLs, so the
  pages resolve under the Pages subpath. See `src/app.ts`.
- **basePath must NOT have a trailing slash** (`import.meta.env.BASE_URL` does) or
  routes double up. We strip it: `.replace(/\/$/, "")`.
- **Same-route param changes don't re-render the template.** For `/blog/:slug`
  prev/next navigation, read the param with `x-effect="load($params.slug)"`, not
  once in `init()` (it would go stale). See `src/pages/post.html` + `blogPost()`.
- **The `notfound` route ships a default handler that `console.error`s.** We
  override it with `x-handler="[]"` on the notfound template so the console stays
  clean (the 404 UI still renders).
- **GitHub Pages needs a `404.html` SPA fallback.** The build copies
  `dist/index.html` → `dist/404.html` (see the `gh-pages-spa-fallback` plugin in
  `vite.config.ts`) so deep links / refreshes boot the app. Hash mode
  (`hash: true`) is the escape hatch if you can't emit the 404 copy.
- **`base` lives in `src/config.ts` (`BASE`)**, applied for build + preview only
  (dev stays `/`). It drives both Vite's `base` and the router `basePath`.
- **`vite.config.ts` isn't type-checked** by `tsc` (outside `include: ["src"]`),
  but Biome **does** lint it.

## Conventions

- Avoid `as` / `any` — narrow with typed `this` params / type guards.
- Match existing style; Biome formats (4-space indent, double quotes).
- Commit directly to `main` (no feature branch). Release with
  `GITHUB_TOKEN="$(gh auth token)" bunx release-it <minor|patch> --ci`.
- Keep `README.md` and `DESIGN.md` in sync when behavior/visuals change.
