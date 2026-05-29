---
colors:
  brand-1: "#9333ea" # purple-600 — gradient start / daisyUI primary
  brand-2: "#2563eb" # blue-600 — gradient middle
  brand-3: "#0d9488" # teal-600 — gradient end
  bg-light: "#ffffff"
  bg-dark: "#111827" # gray-900
  text-light: "#111827"
  text-dark: "#ffffff"
  muted: "#6b7280" # gray-500 (used via opacity-60/70/80)
typography:
  fontFamily: "ui-sans-serif, system-ui, sans-serif"
  h1:
    fontSize: 3rem # text-5xl (hero); text-4xl on inner pages
    fontWeight: 700
  h2:
    fontSize: 1.875rem # text-3xl
    fontWeight: 700
  body:
    fontSize: 1rem
    lineHeight: 1.5
  code:
    fontFamily: ui-monospace, monospace
spacing:
  page-x: 2rem # px-8
  section-y: 4rem # py-16
  container: 72rem # max-w-6xl
  prose: 42rem # max-w-2xl (text/article width)
rounded:
  md: 0.375rem
  xl: 0.75rem
components:
  heading-gradient:
    background: "linear-gradient(to right, {colors.brand-1}, {colors.brand-2}, {colors.brand-3})"
    textColor: transparent # bg-clip-text
  button-primary: # daisyUI .btn.btn-primary
    backgroundColor: "{colors.brand-1}"
    textColor: "#ffffff"
  card: # daisyUI .card
    backgroundColor: base-100
    border: base-300
---

# Design

## Overview

A clean, modern, slightly playful developer-tool aesthetic: a neutral light/dark
surface with a single **purple → blue → teal gradient** used sparingly as the
brand accent (headings, primary buttons). Lots of whitespace, restrained
typography, subtle borders over heavy shadows.

The brand is centralized: change the three `brand-*` tokens (in `src/styles.css`
`@theme`) to re-skin the entire site.

## Colors

- **Brand gradient** — `brand-1` (`#9333ea`) → `brand-2` (`#2563eb`) →
  `brand-3` (`#0d9488`). Used as `bg-clip-text` on headings and as 2-stop
  (`brand-1`→`brand-2`) on primary surfaces. daisyUI `primary` maps to `brand-1`.
- **Surfaces** — light: white background, near-black text; dark: `#111827`
  background, white text. Dark mode is class/`data-theme`-driven (the toggle),
  not OS-only.
- **Muted text** via `opacity-60/70/80` on the base text color rather than a
  separate gray token.
- **Accents** (links, active nav, inline code) use `brand-1` (`text-brand-1`).

## Typography

System sans-serif stack (`font-sans`); no web font is shipped. Headings are bold
and tight; the hero `h1` is `text-5xl`, page titles `text-4xl`, section titles
`text-3xl`. Body copy is `text-base` at `opacity-80`. Blog post bodies use
`@tailwindcss/typography` (`prose` / `dark:prose-invert`).

## Layout

Single-column, centered. Page sections are `py-16 px-8`; content is capped at
`max-w-6xl` (grids) or `max-w-2xl` (prose/articles), centered with `mx-auto`. The
persistent inline `<nav>` + `<main id="app">` + `<footer>` wrap each route; the
body is a `min-h-screen` flex column so the footer sits at the bottom and the
hero fills the first viewport.

## Elevation & Shapes

Flat by default — depth comes from **1px borders** (`border-base-300` /
`border-gray-200 dark:border-gray-700`) and only light `shadow` on hover. Corners
are rounded: `rounded-md` for buttons/inputs, `rounded-xl` (daisyUI `card`) for
cards.

## Components

- **Buttons** — daisyUI `btn`: `btn-primary` (brand) for the main action,
  `btn-outline` / `btn-ghost` for secondary.
- **Cards** — daisyUI `card` (`bg-base-100`, `border-base-300`); feature cards,
  blog post cards, the counter demo.
- **Gradient headings** — `bg-gradient-to-r from-brand-1 … bg-clip-text
  text-transparent`.
- **Nav** — brand wordmark (gradient "VAT" + muted "Template"), text links with
  the active route in `text-brand-1 font-semibold`, dark-mode toggle as
  `btn btn-ghost btn-circle`.

## Do's and Don'ts

- ✅ Use the `brand-*` tokens / daisyUI `primary` for accents — never hard-code
  `purple-600` etc.
- ✅ Prefer daisyUI components (`btn`, `card`) for new UI; hand-rolled Tailwind
  is fine when daisyUI has no fit.
- ✅ Keep one accent gradient; let whitespace and borders do the work.
- ❌ Don't add heavy drop shadows or multiple competing accent colors.
- ❌ Don't hot-link third-party logos/assets — bundle them in `public/`.
- ❌ Don't introduce a second font family for on-page text (system stack only).
