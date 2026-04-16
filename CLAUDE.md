# CLAUDE.md

## Code Style

- Never leave empty CSS rules with placeholder comments (e.g. `/* Inherits from ... */`). If a class is only used as a JS hook and needs no styles, don't create a CSS rule for it.

## CSS in client:only Components

- Never import CSS from inside a `client:only` React component. Astro's production build does not extract CSS from `client:only` components into the static bundle (Vite handles it in dev but not in SSG/SSR builds). Instead, import the CSS from the Astro layout or page that renders the component.

## Pre-Push Validation

Before pushing changes to main, always:

1. Run `pnpm build` to produce a production build.
2. Compare the production build against the local dev server (check layout, styles, assets) using browser screenshots or DevTools.
3. Only push after confirming prod build matches local dev.
