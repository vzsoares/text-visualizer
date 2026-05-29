# Text Visualizer

Paste text, pick a format, see it take over the screen.

🔗 **[Live demo](https://vzsoares.github.io/text-visualizer/)**

## Modes

| Mode | What it does |
|---|---|
| **QR Code** | Generates a scannable QR code that fills the viewport |
| **Large Text** | Binary-search scales the text to fill every pixel of the screen |
| **Marquee** | Scrolls the text across the full screen height |
| **Blink** | Hard on/off blink, fullscreen |

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
