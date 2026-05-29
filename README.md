# Text Visualizer

Paste text, pick a format, see it take over the screen.

🔗 **[Live demo](https://vzsoares.github.io/text-visualizer/)**

## Modes

| Mode | What it does |
|---|---|
| **QR Code** | Generates a scannable QR code that fills the viewport |
| **Large Text** | Binary-search scales the text to fill every pixel of the screen |
| **Marquee** | Scrolls the text across the full screen height (seamless loop) |
| **Blink** | Hard on/off blink, fullscreen |
| **Mirror** | Large text flipped horizontally (read it in a mirror / through glass) |
| **Morse** | Flashes the message in Morse code, with the dots/dashes shown below |

## Features

- **Fullscreen, chrome-free view** — picking a mode takes over the whole screen (real Fullscreen API + Screen Wake Lock so it never sleeps); only a close button remains.
- **Centralized speed** — one slider drives marquee, blink and morse timing.
- **Colors & contrast** — pick text/background colors (applied to the QR too) with a one-tap swap.
- **Orientation** — horizontal or vertical layout; vertical rotates the view to fill a portrait phone along its long axis (the default on mobile).
- **Shareable deep links** — the URL reflects your text, mode, speed, colors and orientation (`?text=…&mode=…`); open it and it auto-launches.
- **Remembers your settings** — text and preferences persist across reloads (`@alpinejs/persist`).

## Stack

- **Vite** + **Alpine.js** + **Tailwind CSS v4** + **daisyUI**
- **uqr** — synchronous SVG QR generation, no canvas
- TypeScript · Bun · Biome · Vitest · Playwright

## Usage

```bash
bun install
bun run dev        # http://localhost:5173
bun run build      # production build → dist/
```

## Scripts

| Command | Description |
|---|---|
| `bun run dev` | Dev server with HMR |
| `bun run build` | Build into `dist/` |
| `bun run check` | Lint + format (Biome) |
| `bun run typecheck` | Type-check with tsc |
| `bun run test` | Unit tests (Vitest) |
| `bun run test:e2e` | E2E tests (Playwright) |

## License

[MIT](LICENSE)
