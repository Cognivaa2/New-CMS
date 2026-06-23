# Cloudflare Workers deploy (frontend)

Deploys the Next.js frontend to Cloudflare's edge via the **OpenNext** adapter.
Live: https://newcms-frontend.cognivaa.workers.dev

## Why it's set up this way
- **OpenNext (Workers), not Pages.** A Next.js 16 SSR app uses `@opennextjs/cloudflare`
  (Workers). `@cloudflare/next-on-pages` (which gives `*.pages.dev`) is deprecated and
  needs per-route `runtime = 'edge'`.
- **Must build with webpack** (`next build --webpack`). Turbopack's server chunks throw
  `ChunkLoadError` in the Workers runtime.
- **Mixed content** is solved by `proxy.js` (deployed as the app's middleware/proxy): the
  browser only calls same-origin HTTPS `/api/*`, and the Worker forwards to the HTTP
  backend server-side. So `NEXT_PUBLIC_API_BASE_URL=/api/v1` at build time.
- **First-time setup needs a workers.dev subdomain** on the account (one-time). Either open
  Workers & Pages in the dashboard once, or `PUT /accounts/{id}/workers/subdomain`.

## Steps (from a copy of `Frontend/` with these files added)
1. Copy `wrangler.jsonc`, `open-next.config.ts` to the Frontend root; copy `proxy.js` to `Frontend/src/proxy.js`.
2. Ensure `export const dynamic = "force-dynamic"` is in `src/app/layout.jsx` (already in repo).
3. Set `.env.production` -> `NEXT_PUBLIC_API_BASE_URL=/api/v1`.
4. Set the build script to `next build --webpack`.
5. Install adapter: `npm i -D @opennextjs/cloudflare wrangler --legacy-peer-deps`
6. Authenticate: `wrangler login`  (or set `CLOUDFLARE_API_TOKEN`).
7. Build:  `npx opennextjs-cloudflare build`
8. Deploy: `npx wrangler deploy`

Update `BACKEND` in `proxy.js` when the backend host changes.
