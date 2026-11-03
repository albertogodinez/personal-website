# Give agents a way to see the site: dev/prod visual parity

Status: ready-for-human

Implemented on `feat/visual-verification`. Open follow-ups are listed at the end.

## Problem Statement

The mistake this repo repeats most is visual, and nothing could catch it:

- Around 8 commits fix navbar or layout positioning, plus one revert (`git log --oneline | grep -i nav`).
- `c0aa580` fixed a gradient that was missing **only in production**. The cause was CSS imported from a `client:only` component, which pushed the page down about 150px.
- The guard was prose: AGENTS.md "Pre-Push Validation" asked for a manual browser comparison, and `CODING_STANDARDS.md` held the `client:only` rule. Nothing failed when either was skipped.
- `pnpm preview` was broken: `@astrojs/netlify` doesn't support `astro preview`.

## Solution

Following the "Build the Lever" and "Encode Lessons in Structure" principles from [pstack](https://github.com/cursor/plugins/tree/main/pstack), the solution is a CLI agents can run, wrapped in a skill with a Feature Map:

- `src/scripts/verify-site.ts` (`pnpm verify:site`) has four subcommands: `parity`, `shot`, `routes` and `serve`. Errors tell the agent what to do next, and `--json` gives machine-readable output.
- Routes are derived from `src/pages`, so no route list has to be kept in sync by hand.
- `.agents/skills/verify-site/` contains the skill and `references/features/README.md` (the Feature Map).
- `.husky/pre-push` runs `parity --no-build` after the build.
- `pnpm preview` now runs `verify:site serve`.
- AGENTS.md has a rule → enforcer table.

## Evidence

- On `main` at `db89dc1`, `parity` passes all 16 pairs (4 routes × 2 viewports × 2 themes) on three consecutive runs, in about 19s with 4 pairs at a time.
- With `c0aa580`'s fix reverted, `parity --route / --route /404` fails 8 of 8 pairs. The prod page is 150px taller (1004 → 1154), matching the commit message.
- Two false positives were measured and fixed, not tolerated: `/moodboard` page height changed with image-load timing (it now waits for every `<img>`).
- The first run also flagged `/404` at 2–4% because the autoplaying video lands on a different frame each load, so `<video>` is masked alongside `<canvas>`.

## Rejected alternatives

| Option                                        | Why not                                                                                                                          | Revisit when                                                          |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `@playwright/test` baseline snapshots         | Baselines rot on every intentional design change. Dev-vs-prod comparison needs no baseline and targets the actual failure class. | We want regression checks against `main`, not only dev-vs-prod parity |
| `netlify dev` / `netlify serve` for prod mode | Adds a heavy CLI dependency to serve static files                                                                                | `/api` routes need verifying in prod mode                             |
| Run parity in CI                              | The build needs Raindrop credentials (see `ci.yml`)                                                                              | The Raindrop prerender falls back to a fixture without credentials    |
| Keep parity as prose                          | A reminder you can't fail is noise                                                                                               | —                                                                     |

## Follow-ups

1. ~~Raindrop fixture so CI can build~~: resolved. The moodboard canvas renders from the committed JSON, so CI now runs `pnpm build` and `parity`.
2. ~~Feature Map for the moodboard canvas~~: done. `src/components/RaindropWrapper.astro` is now unused, so delete it.
3. Interaction scripts (`shot --click <selector>`) for states behind a click, such as an open accordion or the dark-mode toggle.
4. Canvas verification for the moodboard canvas (it's masked in parity today). In order of preference:
   - A dev-only, read-only `window.__MOODBOARD__` that reports each card's position, visibility and chunk, the camera, and a frame counter, with Playwright asserting on it.
   - A trial of [threejs-devtools-mcp](https://github.com/DmitriyGolub/threejs-devtools-mcp) for interactive scene-graph inspection (0.x and solo-maintained, so not a gate).
   - [r3f-perf](https://github.com/utsuboco/r3f-perf) `PerfHeadless` for draw-call and triangle counts.
