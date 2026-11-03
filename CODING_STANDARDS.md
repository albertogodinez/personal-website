# Coding Standards

Judgement calls for the reviewer to enforce. Mechanical rules belong in a linter, not here.

## CSS

The empty-placeholder-rule standard that used to live here is now enforced
mechanically by `.biome/no-placeholder-css.grit`, so it has been removed.

- Never import CSS from inside a `client:only` React component. Astro's production build doesn't extract CSS from `client:only` components into the static bundle — Vite handles it in dev but not in SSG/SSR builds, so the styles silently vanish in production. Import from the Astro layout or page that renders the component instead. `pnpm verify:site parity` (pre-push) catches the symptom; this rule is the cause to look for.

## Astro (temporary)

**Delete this section when Biome's Astro linting reaches full support** (its
`Parsing`/`Formatting`/`Linting` row on
<https://biomejs.dev/internals/language-support/> is currently experimental, and
plugin support for Astro is listed as not in progress). At that point `.astro`
moves into the gating `lint` script and these two stop being prose.

Until then `pnpm lint:astro` reports them but does not gate CI, so they rely on
being read here:

- Every `<svg>` in an `.astro` file needs a `<title>`, or it is invisible to a
  screen reader.
- No `any` in `.astro` frontmatter.

Unused variables and imports in `.astro` files are already caught by
`astro check`, which runs as part of `pnpm build` — they don't need a rule here.

## React Three Fiber

These exist because violating them is what caused the moodboard's frame-time regressions. Full reasoning in `docs/solutions/architecture-patterns/r3f-performance-diagnostic-path-chunk-canvas-2026-04-23.md`.

- No camera-derived or otherwise per-frame value may be passed as a React prop. Anything changing every frame defeats `React.memo` across every Card at once. Read it non-reactively inside `useFrame` and mutate the Three.js object directly.
- Prefer one `useFrame` loop in a parent iterating the Card registry over one loop per Card.
- Never rebuild all Chunk layouts on a boundary crossing. Compute an add/remove delta against the existing map so surviving Chunks keep object identity.
- Keep React keys stable across Chunk boundary crossings, so reconciliation preserves mesh instances instead of remounting them.
- Decode textures off the main thread with `createImageBitmap`, and cap resolution at the image proxy rather than letting full-size upstream images reach the texture pipeline.
