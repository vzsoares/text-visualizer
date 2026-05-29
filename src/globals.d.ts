/**
 * Ambient declarations shared across the app:
 * - `__APP_VERSION__`: injected by Vite's `define` (see vite.config.ts).
 * - `window.Alpine` / `window.PineconeRouter`: exposed at bootstrap (src/app.ts)
 *   for devtools and for the router's `settings()` call.
 */

/** The pinecone-router v7 settings we configure (settings is a function). */
interface PineconeRouterSettings {
    basePath: string;
    targetID?: string;
    hash: boolean;
}

interface PineconeRouterApi {
    settings(values?: Partial<PineconeRouterSettings>): PineconeRouterSettings;
}

/** Augment Alpine with the `$persist` magic the persist plugin adds. */
declare module "alpinejs" {
    interface Alpine {
        $persist<T>(value: T): { as(key: string): T };
    }
}

declare global {
    const __APP_VERSION__: string;

    interface Window {
        Alpine: typeof import("alpinejs").default;
        PineconeRouter: PineconeRouterApi;
    }
}

export {};
