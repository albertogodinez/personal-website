# Moodboard media is served through a same-origin image proxy

Third-party media (Raindrop `rdl.ink` URLs, which redirect to Instagram and S3) cannot be used as WebGL textures, because those CDNs send no `Access-Control-Allow-Origin` header and WebGL always requires CORS for cross-origin pixel access. We serve every Card texture through a same-origin `/api/proxy-image` endpoint that refetches server-side and adds the CORS header, rather than loading upstream URLs directly.

## Considered Options

`crossOrigin="anonymous"` on the texture loader was tried first; it only *requests* CORS and cannot make a third-party CDN comply. Client-side fetch wrappers can't help either — the browser enforces this at the WebGL API level, not the fetch level.

## Consequences

The proxy became the natural place to also cap texture resolution, which is what eliminated the p99 decode tail (see `docs/solutions/architecture-patterns/r3f-performance-diagnostic-path-chunk-canvas-2026-04-23.md`). Moving media to same-origin storage would make this endpoint redundant — see `.scratch/content-pipeline/spec.md`.
