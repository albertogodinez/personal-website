# Add a working lint guardrail: oxlint for TS/TSX, Biome for CSS

Status: ready-for-human

Partially implemented. Configuration, CI, dependency cleanup and every finding
outside `src/components/moodboard/` are done or deliberately excluded. The remaining 46 findings are all
in the uncommitted moodboard source, which is being reviewed file by file, so
they land with that review rather than ahead of it.

## Problem Statement

The repo had **no working linter**, and had not had one for some time:

- `package.json` defined no `lint` script, and there was no `.github/`, so
  nothing ran on push or in CI.
- `eslint@^10` was configured solely by `.eslintrc.js`. ESLint 10 dropped
  eslintrc support, so ESLint could not run at all. Its two `astro/*` rules had
  therefore never executed.
- `.stylelintrc` extended `stylelint-config-html/astro`, but `stylelint` itself
  was never a declared dependency, so it could not run either.

Two dead configs and six unused dependencies gave the appearance of linting
while enforcing nothing. The cost was not hypothetical: a **conditional React
hook call** sat in `src/components/selection/SelectWrapper.tsx` on `main`, where
`useStore` was called after an early return. Hook order breaks the moment
`options` goes from undefined to defined on a mounted instance.

## Solution

Two linters, split by file domain so they cannot overlap or double-report:

| Domain | Tool | Gates CI |
| --- | --- | --- |
| `**/*.{ts,tsx}` | oxlint 1.86.0 | yes |
| `**/*.css` | Biome 2.5.14 | yes |
| `**/*.astro` | Biome, via `biome.astro.jsonc` | **no** — advisory |
| all formatting | Prettier (unchanged) | no |

Prettier is untouched and keeps formatting everything, including `.astro`.
ESLint and stylelint are removed entirely.

## User Stories

1. As the maintainer, I want `pnpm lint` to exist and pass, so the project has a single command that proves the code is clean.
2. As the maintainer, I want CI to fail on a lint error, so a regression cannot reach `main` unnoticed.
3. As the maintainer, I want the Rules of React enforced, so mistakes like a conditional hook call are caught mechanically rather than by chance.
4. As the maintainer, I want rules that misfire on React Three Fiber disabled deliberately and with a recorded reason, so nobody re-enables them and drowns in false positives.
5. As the maintainer, I want the documented card-registry pattern to remain legal, so the linter does not fight the moodboard's performance architecture.
6. As the maintainer, I want the CSS placeholder-rule standard enforced by a tool, so it leaves `CODING_STANDARDS.md`.
7. As the maintainer, I want `.astro` findings visible but non-gating, so I benefit from experimental support without depending on it.
8. As the maintainer, I want dead lint dependencies gone, so the toolchain reflects what actually runs.
9. As the maintainer, I want Dependabot to nudge me monthly, so I learn when Astro support matures instead of having to remember to check.
10. As a future maintainer, I want each disabled rule to carry its justification, so the config is auditable rather than cargo-culted.

## Implementation Decisions

**Two linters, not one, because the file domains are disjoint.** Biome cannot
run the React Compiler rules; oxlint cannot lint CSS at all (verified:
`oxlint --debug=files` omits `.css` entirely). Splitting by extension means no
double-reporting and no need for a dedup package — which is the only reason
running both is sane. `eslint-plugin-oxlint` exists for the ESLint case but has
no Biome equivalent, so an overlapping JS/TS split was rejected.

**oxlint owns TS/TSX because of the React Compiler port.** oxlint runs a native
Rust port of the React Compiler (`oxc_react_compiler`) as 22 per-category rules.
On this repo it found the conditional hook call plus five other real defects.
Biome has no equivalent, which settled the choice.

**Three rules are disabled because they are false-positive generators here, each verified rather than assumed:**

- `react/react-in-jsx-scope` — fires on every JSX element under React 19's automatic runtime.
- `react/no-unknown-property` — R3F intrinsics `group`, `line` and `points` collide with SVG element names, so the rule treats them as DOM. Measured 6 false positives in 7 lines. TypeScript already enforces R3F prop names via `ThreeElements`.
- `react-perf/jsx-no-new-array-as-prop` — R3F compares arrays **shallowly** and `args` **element-wise** (`fiber/src/core/utils.tsx`, `core/reconciler.tsx:654`), so `position={[0,0,0]}` is a genuine no-op. Its sibling `jsx-no-new-object-as-prop` stays on, because objects are compared by reference and so do re-apply every render.

**`react-perf/jsx-no-new-function-as-prop` is off because it had zero true
positives.** All 18 findings were checked against their receivers: only one
component in the repo is memoized (`MemoizedCard`), and its `handleCardClick`
prop is already `useCallback`-stable. Every other site targets plain DOM, an R3F
intrinsic, a Radix primitive, or a non-memoized function component — including
`CardMesh`, which is a bare `Suspense` wrapper. There is no `memo` to defeat.

**The dependency rules are `warn`, not `error`.** `react/exhaustive-effect-dependencies`
and `react/memo-dependencies` are the only rules where the tool and the
architecture disagree without either being wrong: two of their four findings are
unactionable complaints about stable ref identity. A warning keeps them visible
without making CI hostage to them.

**The `react/refs` violations get inline suppressions, not a file-level
override.** The 11 findings at `MoodboardCanvas.tsx:212-241` are the documented
chunk-delta pattern. Suppressing them inline leaves the rule live in the one
file where a genuine ref bug is most likely to recur — which is not
hypothetical, since the twelfth finding at line 111 is a real bug that a
file-level `off` would have hidden.

**`.astro` linting is deliberately excluded from the gate.** Biome's Astro
support is experimental and its plugin support for Astro is documented as not in
progress; oxlint sees only `<script>` blocks and the frontmatter fence, and
force-disables `no-unused-vars` there regardless of config. Neither tool can
reach the two `astro/*` rules the dead ESLint config named, because both inspect
template markup. Since those rules never ran, nothing is lost. `pnpm lint:astro`
surfaces the findings; CI runs it with `continue-on-error`.

**Prettier stays as the sole formatter.** Biome's formatter *ignores* `.astro`
outright — verified: a deliberately mangled file came back byte-identical while
Prettier formatted it correctly. Letting Biome format the rest would mean two
formatters instead of one and a ~324-line reformat, of which 250 lines are an
unconfigurable behavioural difference (Prettier preserves an author's choice to
expand an object literal; Biome collapses it under the line limit).

**Biome's config is `.jsonc`, not `.json`.** Comments are load-bearing here —
they carry the deletion notes for the excluded page. Verified the hard way:
adding a comment to `biome.json` makes Biome silently fail to parse it and fall
back to defaults, which linted everything and produced 368 diagnostics rather
than an error. oxlint, by contrast, accepts comments in `.oxlintrc.json`.

**Both linters are pinned exactly.** oxlint ships weekly and its React Compiler
rules are under active hardening, so a caret range would let CI severity change
without a commit. Dependabot is the upgrade mechanism.

**The `/memorabilia` page and its components are excluded, not fixed.** That
page is being replaced by the moodboard canvas and will be deleted along with
`src/components/selection/**`, `src/components/card/**` and
`FavoritesCollectionHandler.tsx`. Fixes had been applied there and were reverted;
the files are excluded via `ignorePatterns` in `.oxlintrc.json` and an `includes`
negation in `biome.jsonc`, each carrying a comment saying to delete the entry
with the page. This does mean a real conditional-hook-call bug in
`SelectWrapper.tsx:29` is knowingly left in place — it is acceptable only
because the file is scheduled for deletion.

**Two scoped overrides exist because they were config gaps, not code defects:**
`src/env.d.ts` needs its triple-slash references for Astro's generated types,
and `src/scripts/**` is a Node context rather than a browser one.

## Testing Decisions

**The linter is its own test.** `pnpm lint` exiting zero is the assertion; there
is no application logic here to unit test.

**`astro check` is retained and not replaced.** It runs `tsc` over 45 files as
part of `pnpm build` and independently catches the unused-variable class in
`.astro` files — which is why deferring `.astro` linting costs less than it
appears. oxlint's type-aware mode would partly overlap it. It needs only the
`oxlint-tsgolint` package, which bundles its own typescript-go; the project's
TypeScript stays on 5.x (see `docs/adr/0004`). A 2026-09-29 trial found
it adds 0.26s (0.30s → 0.56s) and 10 findings: 6 `no-unsafe-type-assertion`
(`content.config.ts:6`, three in the scaffold script, two in moodboard) and 4
`consistent-return` (all moodboard). `no-floating-promises` and
`no-misused-promises` found nothing. It stays out of scope for now.

**The GritQL plugin has a regression check.** Reintroducing
`.probe { /* placeholder */ }` was confirmed to produce exactly one diagnostic,
and removing it returned the run to clean. This matters because Biome's built-in
`noEmptyBlock` was verified to **miss** the comment-only case, which is the case
the standard is actually about.

**No visual verification is outstanding.** The only change that needed it was
the `SelectionHandler` `<span>` → `<button>` swap, which has since been
reverted. It was measured against the baseline in a real browser first
(keyboard `Enter` opened the dialog with all 9 options, where the original
spans had `tabIndex: -1` and were unreachable; the rendered text measured 9.2px
narrower because `inline-block` trims whitespace a `span` renders). Those
findings are recorded here because the same work will be needed if the
replacement page keeps this interaction.

## Out of Scope

- The 46 remaining findings in `src/components/moodboard/`. They land with that code's file-by-file review.
- Type-aware linting. Not blocked: enabling it means adding `oxlint-tsgolint` and `--type-aware`, then clearing the 10 findings listed above. No TypeScript upgrade is involved (`docs/adr/0004`).
- Replacing Prettier with any formatter, and adopting oxfmt.
- `anti-slop` (`dmmulroy/anti-slop`), a 20-rule oxlint JS-plugin ruleset. Additive and reversible, but explicitly the author's taste, its `require-readable-spacing` rule would fight Prettier, and oxlint's JS plugins are alpha with a known failure mode (oxc #26139) where one throwing rule silently disables all of them. Revisit once the baseline is green.
- Vendoring `@react-three/eslint-plugin`'s two frame-loop rules. Both are lexical selectors on `useFrame(...)` and miss a hoisted tick function, which is the shape this codebase's single-parent-loop standard produces.
- A `WebGLRenderer.info` leak assertion across one chunk add/remove delta. Nothing in any ecosystem lints `dispose()`, so this is the highest-value guardrail identified — but it needs a test harness this repo does not have. Tracked separately.
