/**
 * Path the site is served under (its GitHub Pages project subpath). Shared by
 * the build (`vite.config.ts` sets Vite's `base`) and the router (`src/app.ts`
 * derives pinecone's `basePath` from `import.meta.env.BASE_URL`). Keep free of
 * browser/Node-only APIs so both can import it.
 */
export const BASE = "/vite-alpine-tailwind/";
