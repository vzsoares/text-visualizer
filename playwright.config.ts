import { defineConfig, devices } from "@playwright/test";

// Two e2e suites, one config:
// - "dev"     → tests in ./e2e run against the Vite dev server (port 5273).
// - "preview" → tests in ./e2e-preview run against the PRODUCTION build served
//   by `vite preview` under the GitHub Pages base path (port 5274). This is what
//   catches base-prefixed assets and the 404.html SPA deep-link fallback.
// Dedicated ports (not Vite's default 5173) so they never collide with a dev
// server you may already have running. Run all with `bun run test:e2e`, or a
// single suite with `playwright test --project=dev|preview`.
const DEV_PORT = 5273;
const PREVIEW_PORT = 5274;
const BASE = "/vite-alpine-tailwind/";

const devURL = `http://localhost:${DEV_PORT}`;
const previewURL = `http://localhost:${PREVIEW_PORT}${BASE}`;

export default defineConfig({
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
    use: { trace: "on-first-retry" },
    projects: [
        {
            name: "dev",
            testDir: "./e2e",
            use: { ...devices["Desktop Chrome"], baseURL: devURL },
        },
        {
            name: "preview",
            testDir: "./e2e-preview",
            use: { ...devices["Desktop Chrome"], baseURL: previewURL },
        },
    ],
    webServer: [
        {
            command: `bun run dev --port ${DEV_PORT} --strictPort`,
            url: devURL,
            reuseExistingServer: !process.env.CI,
        },
        {
            command: `bun run build && bun run preview --port ${PREVIEW_PORT} --strictPort`,
            url: previewURL,
            reuseExistingServer: !process.env.CI,
            timeout: 180_000,
        },
    ],
});
