# 14 — Production build parity check before merge

Status: ready-for-agent
Blocked by: 13

This repo's `AGENTS.md` requires that a production build be compared against
the local dev server before pushing to main. That check is still owed for the
moodboard branch, and it has caught real regressions here before — CSS imported
from inside a `client:only` component is extracted in dev but not in the static
build.

This is the merge gate for the whole feature, so it runs after the visible work
lands and after device verification.

## Do

1. Run `pnpm build`.
2. Serve the production output and open the moodboard page beside the dev
   server.
3. Compare layout, styles, fonts and assets — specifically check that
   `src/styles/moodboard-canvas.css` is present in the built output, since it
   is imported from the Astro page precisely to survive the static build.
4. Verify all three layout modes, the filter bar, the mode switch and the detail
   overlay render identically, and that proxied covers load in production.
5. Capture screenshots of both for the record.

## Done when

- Production output matches dev for all three modes and the overlay.
- No console errors in the production build.
- Screenshots and any differences found are recorded in the ticket comments.
