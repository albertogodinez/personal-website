# Selective SSR runs in Netlify's Node function, not at the edge

The site is `output: 'static'` with `prerender = false` on the one route that needs a server (`/api/proxy-image`). That route is bundled into Netlify's Node SSR function, and it must stay there: it uses `sharp` to downscale images, which needs Node-native bindings that Netlify's Deno-based edge runtime cannot load.

No adapter flag is involved. `@astrojs/netlify` v7 has no `edgeFunctions` option — a stale note in this repo once claimed otherwise and the config carried a no-op `edgeFunctions: true` for months. If you are reaching for an edge setting to make an API route work, you don't need one.

## Consequences

Proxy responses pay a cold start and are served from one region rather than the edge, which is acceptable because responses are immutable and cached for a year.

The same constraint blocks the planned move to Cloudflare: the Workers runtime can't load native bindings either, so while this route exists as written, changing hosts is not an adapter swap. That decision is open — see `.scratch/cloudflare-migration/spec.md`, which scopes it to porting the resize onto Cloudflare's image transforms, dropping the resize and accepting the frame-time regression it prevents, or moving media into owned storage first so the proxy is no longer needed at all.
