# Pages + Alpine + pinecone-router

How the UI is built here, why it's built this way, and how to extend it.

## The model

The UI is **plain HTML files** (Light DOM). Alpine provides reactivity;
pinecone-router loads a route's HTML file into `<main id="app">` per navigation.
There is no virtual DOM, no custom-element layer, and no framework runtime beyond
Alpine.

```
index.html (shell)
 └─ <body x-data="{ darkMode }">      ← dark-mode state, shared scope
     ├─ <nav>     (persistent chrome, inline: links + theme toggle)
     ├─ <main id="app">   ← router loads the matched page's HTML here
     ├─ <footer>  (persistent chrome, inline)
     └─ <template x-route="…" x-template.target.app="/pages/…html">  ← route table

src/pages/
 ├─ home.html · about.html · blog.html · post.html · not-found.html
```

## Why Light DOM (not Shadow DOM)

There are no shadow roots anywhere, by design. Two hard reasons:

1. **Tailwind/daisyUI is a global stylesheet.** Its selectors do not cross shadow
   boundaries, so `btn`, `card`, `prose`, etc. would not apply inside one.
2. **Alpine doesn't walk shadow roots.** Alpine's DOM walk and MutationObserver
   stop at shadow boundaries, so `x-*` directives inside one are invisible.

Everything renders into ordinary Light DOM, so both keep working.

## How pages are served

Page files live in `src/pages/*.html`, but pinecone fetches them by URL
(`/pages/<name>.html`). Vite doesn't serve `src/` at a stable URL, so the
`page-templates` plugin in `vite.config.ts` bridges the gap:

- **DEV** — a middleware serves `src/pages/<name>.html` at `/pages/<name>.html`.
  It is added *directly inside* `configureServer` (not the returned post-hook) so
  it runs **before** Vite's SPA fallback — otherwise `/pages/x.html` would resolve
  to `index.html`.
- **BUILD** — `generateBundle` emits each file verbatim to `dist/pages/<name>.html`.

`pinecone.settings({ basePath })` is auto-prepended to the `x-template` URLs, so
the pages resolve under the GitHub Pages subpath in production.

## How Alpine initializes the loaded markup

You do **not** call `Alpine.initTree()` yourself. Alpine initializes directives
via one of two paths:

- **Present before `Alpine.start()`** (the inline nav/footer in the shell):
  Alpine's initial DOM walk sees them.
- **Loaded later** (pinecone drops a page's HTML into `#app`): Alpine's
  **MutationObserver** picks up the inserted subtree and initializes it.

A manual `initTree` on router-loaded markup would double-bind handlers (e.g. a
counter that increments twice per click).

## Reactive logic lives in Alpine.data factories

Keep behavior in a typed `Alpine.data()` factory (`src/alpine.ts`) so it's plain,
DOM-free, and unit-testable:

```ts
export function counter(start = 0): CounterState {
    return { count: start, increment() { this.count++ }, /* … */ };
}
```

The page HTML just references it:

```html
<div x-data="counter(0)"><p x-text="count"></p>…</div>
```

## Runtime data the HTML can't import

Plain HTML can't `import` TypeScript, so values the pages need at runtime are put
on a global Alpine store in `src/app.ts` and read with `$store.app`:

```ts
Alpine.store("app", {
    version: __APP_VERSION__,        // footer "v1.2.0"
    base: import.meta.env.BASE_URL,  // asset URLs under the deploy base path
    posts,                           // blog index x-for
});
```

```html
<img :src="$store.app.base + 'logos/vite.svg'" />
<template x-for="post in $store.app.posts" :key="post.slug">…</template>
<span x-text="'v' + $store.app.version"></span>
```

## Reading route params

`/blog/:slug` exposes the param via the `$params` magic. **Important:** pinecone
does *not* re-load a route's template when only the param changes (e.g. prev →
next post on the same `/blog/:slug` route). So don't read the slug once in
`init()` — drive it with `x-effect`, which re-runs when `$params` changes:

```html
<article x-data="blogPost" x-effect="load($params.slug)">…</article>
```

```ts
export function blogPost() {
    return { post: undefined, load(slug) { this.post = /* lookup */; /* … */ } };
}
```

## Recipes

### Add a route / page

1. `src/pages/contact.html` — plain HTML with Alpine directives.
2. Add a row to the route table in `index.html`:
   ```html
   <template x-route="/contact" x-template.target.app="/pages/contact.html"></template>
   ```
3. Link to it with `<a href="/contact">` (pinecone intercepts + prepends basePath).

### Add reusable behavior

Register a typed factory in `src/app.ts` (`Alpine.data("thing", thing)` with
`thing` defined in `src/alpine.ts`) and reference it from any page via
`x-data="thing()"`. Shared *data* (not behavior) goes on `Alpine.store`.

### Opt a link out of the router

External / download links get a `native` attribute so the browser handles them:

```html
<a href="https://example.com" target="_blank" rel="noopener" native>External</a>
```

## Gotchas recap

- Light DOM only — no `attachShadow`.
- Don't `Alpine.initTree()` router-loaded markup (double-binds handlers).
- The `page-templates` dev middleware must run before Vite's SPA fallback.
- Pages can't import TS — runtime data comes from `$store.app`.
- Biome's `a11y/useAnchorContent` is off for `src/pages/**/*.html` (anchors get
  their text from `x-text`); see the `overrides` in `biome.json`.
- `settings()` is a function called in `alpine:init` (pinecone v7), not options to
  `Alpine.plugin()`. `basePath` must have no trailing slash and is prepended to
  the `x-template` URLs.
- Same-route param changes need `x-effect`, not a one-shot `init()`.
- The `notfound` route's default handler `console.error`s — overridden with
  `x-handler="[]"` in `index.html`.
