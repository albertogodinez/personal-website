# Coding Standards

Judgement calls for the reviewer to enforce. Mechanical rules belong in a linter, not here.

## CSS

- Never leave an empty CSS rule with a placeholder comment (e.g. `/* Inherits from ... */`). If a class is only a JS hook and needs no styles, don't write a rule for it.
- Never import CSS from inside a `client:only` React component. Astro's production build doesn't extract CSS from `client:only` components into the static bundle — Vite handles it in dev but not in SSG/SSR builds, so the styles silently vanish in production. Import from the Astro layout or page that renders the component instead.

## React Three Fiber

These exist because violating them is what caused the moodboard's frame-time regressions. Full reasoning in `docs/solutions/architecture-patterns/r3f-performance-diagnostic-path-chunk-canvas-2026-04-23.md`.

- No camera-derived or otherwise per-frame value may be passed as a React prop. Anything changing every frame defeats `React.memo` across every Card at once. Read it non-reactively inside `useFrame` and mutate the Three.js object directly.
- Prefer one `useFrame` loop in a parent iterating the Card registry over one loop per Card.
- Never rebuild all Chunk layouts on a boundary crossing. Compute an add/remove delta against the existing map so surviving Chunks keep object identity.
- Keep React keys stable across Chunk boundary crossings, so reconciliation preserves mesh instances instead of remounting them.
- Decode textures off the main thread with `createImageBitmap`, and cap resolution at the image proxy rather than letting full-size upstream images reach the texture pipeline.
