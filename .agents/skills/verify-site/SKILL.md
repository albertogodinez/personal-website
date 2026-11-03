---
name: verify-site
description: See this site the way a visitor does, in dev and in the production build. Use before claiming any visual or layout change works, to reproduce a UI bug, or when output may differ between dev and production.
---

# Verify the site

Proof for a visual change is a screenshot of the real page, never a passing build. The lever is `pnpm verify:site` (`src/scripts/verify-site.ts`); run `pnpm verify:site --help` for every flag.

## Steps

1. **Find the feature.** Look it up in [`references/features/README.md`](references/features/README.md) to get its route and how a visitor reaches it. Done when you know the route(s) your change touches.
2. **Look at it.** `pnpm verify:site shot <route>` (add `--mode prod`, `--viewport mobile`, `--theme dark` as needed) and read the PNG it prints. Done when the screenshot shows the change you intended, in each viewport and theme the change can affect.
3. **Prove parity.** `pnpm verify:site parity` builds, screenshots every route × viewport × theme on dev and on `dist/`, and pixel-diffs each pair. Pass `--no-build` only when `dist/` was built from the current tree. Done when it exits 0. On a FAIL, open the `.diff.png` beside it (red = mismatch) and fix the cause rather than raising `--max-diff`.
4. **Show the evidence.** Attach or name the screenshots from `.verify/<run-id>/` in your reply or PR.

## Gotchas

- `<canvas>` and `<video>` are masked in parity: they differ between two loads of the same build. `shot` leaves them unmasked, so verify the moodboard canvas by eye with `shot`, and assert on numbers from its Shift+D debug overlay (cards, chunks, camera) rather than on pixels.
- `--mode prod` serves `dist/` statically, the way Netlify does. `src/pages/api/*` runs in a Netlify Function and is not served there.
- `astro preview` is unsupported by the Netlify adapter; `pnpm preview` runs `verify:site serve` instead.

## Keep the Feature Map current

When you add, remove, or move a page or a visitor-facing feature, update `references/features/README.md` in the same change. Routes themselves are derived from `src/pages` (`pnpm verify:site routes`), so the map records only what the filesystem can't: what each page is for and how to reach its features.
