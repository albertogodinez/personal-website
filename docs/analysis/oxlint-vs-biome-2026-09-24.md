# oxlint vs Biome: which linter should this repo adopt?

**Date:** 2026-09-24
**Question:** `CODING_STANDARDS.md` holds six judgement-call standards that a reviewer agent must remember at review time. Which of them can become deterministic lint rules, and which linter gets us the most of them?
**Versions tested:** oxlint `1.83.0`, `@biomejs/biome` `2.5.14` (both `latest` on npm as of 2026-09-24). Every "verified" claim below was reproduced against this repo or a fixture on this date.

---

## Recommendation

**Adopt Biome as the repo's linter and formatter. Keep Prettier for `.astro` formatting only.**

**The single strongest reason:** oxlint cannot lint CSS at all — not via built-in rules, not via plugins — and one of the six standards (rule 1, empty CSS rules) lives entirely in CSS. Biome lints and formats CSS as a first-class language ([Biome language support](https://biomejs.dev/internals/language-support/)), and its GritQL plugin engine runs against the CSS CST ([Biome linter plugins](https://biomejs.dev/linter/plugins/)), so rule 1 becomes a nine-line plugin. Under oxlint it stays prose forever.

Verified: `oxlint --debug=files t.css t.tsx t2.astro` lists only `t.tsx` and `t2.astro`. CSS files are silently skipped. oxlint's own plugin list contains no CSS/stylelint plugin ([oxlint built-in plugins](https://oxc.rs/docs/guide/usage/linter/plugins.html)).

**Under Biome, 2 of the 6 standards become fully mechanical and 1 more becomes partially mechanical.** Three are inherently judgement calls that no tool can check. That is a modest but real win — and it is strictly additive to the reviewer agent, which keeps the other three.

### The one thing that actually matters more than the tool choice

**This repo has no lint guardrail at all today, and its ESLint setup is dead code.**

- `package.json` defines no `lint` or `format` script. The only scripts are `dev`, `start`, `build`, `preview`, `astro`, `scaffold:raindrop`.
- There is no `.github/` directory, so no CI runs anything. `build` (`astro check && astro build`) only runs locally.
- `eslint@^10.0.0` is a devDependency, but the config is `.eslintrc.js` (eslintrc format). ESLint 10 removed eslintrc support; flat config (`eslint.config.js`) is the only supported format ([ESLint v9 flat config rollout](https://eslint.org/docs/latest/use/configure/migration-guide)). **Unverified:** I did not execute `eslint` to confirm it errors here, so treat "dead" as a strong inference from the config filename plus the missing script, not a tested result.
- `.stylelintrc` extends `stylelint-config-html/astro`, but `stylelint` itself is not in `package.json` — only `stylelint-config-html` is. A `stylelint` binary exists in `node_modules/.bin` (transitively hoisted), so it may run by accident, but it is not a declared dependency.

So the migration is not "ESLint + Prettier + Stylelint → Biome." Two of those three are already non-functional. The real change is **from zero enforcement to one working tool**, which makes the decision low-stakes and highly reversible.

---

## The six standards: feasibility

Legend: **Yes** = a rule catches the stated violation. **Partial** = a rule catches a proxy for it, with false negatives. **No** = not expressible; must stay prose.

| # | Standard (`CODING_STANDARDS.md`) | Biome 2.5.14 | oxlint 1.83.0 | Mechanism |
|---|---|---|---|---|
| 1 | No empty CSS rule containing only a placeholder comment | **Yes** (plugin) | **No** | GritQL CSS plugin. **No tool built-in does this** — see below. |
| 2 | Never import CSS inside a `client:only` React component | **Partial** | **Partial** | `noRestrictedImports` / `no-restricted-imports` scoped by path glob. The `client:only` linkage itself is not checkable. |
| 3 | No camera-derived or per-frame value passed as a React prop | **No** | **No** | Requires knowing a value mutates every frame. Not in the AST, not in the type system. |
| 4 | Keep React keys stable across chunk-boundary crossings | **Partial** | **Partial** | `noArrayIndexKey` / `react/no-array-index-key` catch the common unstable-key shape, not "stable across a crossing". |
| 5 | Never rebuild all chunk layouts on a boundary crossing — compute a delta | **No** | **No** | An algorithmic property of a function body. No lint rule can express it. |
| 6 | Decode textures off-thread via `createImageBitmap`; cap resolution at the proxy | **Partial** | **Partial** | A ban on the *wrong* API is expressible; "use the right one" is not. |

**Score, counted off the table above: Biome 1 fully + 3 partially + 2 not at all. oxlint 0 fully + 3 partially + 3 not at all.** Rule 1 is the only standard either tool catches outright, and only Biome catches it.

### Rule 1 — empty CSS rule with a placeholder comment

Biome ships `noEmptyBlock` for CSS, in the `suspicious` group and in the recommended set ([Biome CSS rules](https://biomejs.dev/linter/css/rules/)).

**Verified: `noEmptyBlock` does NOT catch the case this standard is about.** Against a fixture containing both `.truly-empty {}` and

```css
.comment-only {
  /* Inherits from .card-base */
}
```

`biome lint` reported exactly one diagnostic, at `t.css:1:14` (`.truly-empty`). The comment-only rule was not flagged. The built-in treats a comment as content.

**Verified working:** a GritQL plugin does catch both. This plugin, declared via `"plugins": ["./plugins/no-placeholder-css.grit"]`:

```grit
language css

`$sel { }` where { register_diagnostic(span=$sel, message="empty-or-placeholder-only CSS rule", severity="error") }
```

reported two diagnostics on the same fixture, at `t.css:1` (`.truly-empty`) and `t.css:2` (`.comment-only`) — and did not flag `.ok { color: red; }`. GritQL's empty-braces pattern ignores comments, which is precisely the desired semantics. Plugins can also carry an `includes` glob and a `=>` autofix with `fix_kind: "safe" | "unsafe"` ([Biome v2.5 release](https://biomejs.dev/blog/biome-v2-5/), 2026-06-05).

This is the decisive line item. It is achievable in Biome and unachievable in oxlint.

### Rule 2 — no CSS import inside a `client:only` component

Split this into two halves.

**The mechanizable half** — "no CSS import from files in `src/components/moodboard/`" — works in both tools, verified:

- Biome, via `style/noRestrictedImports` with `{"patterns": [{"group": ["**/*.css"], "message": "..."}]}`, reported `t.tsx:1:8 lint/style/noRestrictedImports` on `import './moodboard-canvas.css'`. ([rule docs](https://biomejs.dev/linter/rules/no-restricted-imports)). Note `group` must be a string array; passing an object errors with `group has an incorrect type, expected a string`.
- oxlint, via a JS plugin using the ESLint selector `ImportDeclaration[source.value=/\.css$/]`, reported `t.tsx:1:1 error moodboard(no-css-import)`. `no-restricted-imports` also exists as a built-in ([oxlint rule docs](https://oxc.rs/docs/guide/usage/linter/rules/eslint/no-restricted-imports)).

Either way you scope it by path glob and accept that the enforced rule is a proxy: *"no CSS imports anywhere under `src/components/moodboard/`"*, not *"no CSS imports in components rendered with `client:only`"*.

**The non-mechanizable half** is the `client:only` linkage. The directive lives in the `.astro` template (`<Canvas client:only="react" />`), while the offending `import './x.css'` lives in a different `.tsx` module. Resolving that requires following an Astro directive across a module boundary.

**Unverified — I found no documentation either way** on whether Biome's module graph can express this. Biome v2.5 added cross-file rules (`noUnusedClasses`, `noUndeclaredClasses`) that trace CSS classes through the imported file tree ([Biome v2.5](https://biomejs.dev/blog/biome-v2-5/)), which proves the module graph exists and is queryable by built-in rules — but nothing documents plugin access to it, and nothing documents Astro-directive awareness. Treat the cross-file version of rule 2 as out of reach today.

In practice the path-glob proxy is good enough here: every `client:only` component in this repo is under `src/components/moodboard/`, so the glob and the real rule coincide. That coincidence is itself a thing to re-check if the repo grows — worth a comment in the config.

### Rule 4 — stable React keys across chunk boundaries

Both tools have the standard proxy rule:

- Biome `noArrayIndexKey` ([Biome JS rules](https://biomejs.dev/linter/javascript/rules/)). **Verified:** firing 3 times in `src/` under `"domains": {"react": "recommended"}`.
- oxlint `react/no-array-index-key` and `react/jsx-key`, both present in the local `configuration_schema.json` for 1.83.0.

Neither can express "the key is stable across a chunk boundary crossing" — that is a claim about two renders at two different camera positions, which no static rule sees. The proxy is still worth turning on; the prose standard stays.

### Rules 3, 5, 6 — say it plainly: no tool can check these

- **Rule 3 (per-frame prop).** The violation is semantic: *this value changes every frame*. `useThree(s => s.camera)` and a static config object are indistinguishable at the AST level, and identical at the type level (both `Vector3`, say). oxlint's `react-perf` plugin (`jsx-no-new-object-as-prop`, `jsx-no-new-array-as-prop`, `jsx-no-new-function-as-prop`, `jsx-no-jsx-as-prop`) catches *allocation* in a prop position, which is a neighbouring but different defect — it would not flag `<Card cameraZ={cameraZ} />`. Biome has no react-perf equivalent I could find. **Not mechanizable in either tool.** Best available substitute: a hand-written plugin rule banning an explicit denylist of prop names on the Card component (`cameraZ`, `time`, `elapsed`) — cheap, brittle, catches only what you already thought of.
- **Rule 5 (delta, not rebuild).** This is a property of an algorithm, not of syntax. No linter, in any ecosystem, checks it. A test asserting object identity survives a crossing is the right guardrail, not a lint rule.
- **Rule 6 (`createImageBitmap`, cap at proxy).** The prohibition half is expressible — you can ban `new Image()` or `THREE.TextureLoader` in `src/components/moodboard/` via `noRestrictedImports` / `no-restricted-properties`. The prescription half ("use `createImageBitmap`", "cap resolution at the proxy") is not: a linter cannot tell that a URL you built has a width parameter with a sane ceiling. **Partial at best**, and the partial version is a ban you'd have to keep in sync with three.js's API surface.

**Net: the reviewer agent still owns rules 3 and 5 outright, and the un-mechanized half of rules 2, 4 and 6.** Only rule 1 leaves the prose list entirely. Adopting a linter shrinks `CODING_STANDARDS.md` by one entry and weakens three others; it does not eliminate the file. If the goal was to retire it, that goal is not achievable.

---

## Comparison detail

### Maturity, versioning, cadence

| | oxlint | Biome |
|---|---|---|
| Latest (2026-09-24) | 1.83.0 | 2.5.14 |
| First stable | 1.0 on 2025-06-10 ([announcement](https://oxc.rs/blog/2025-06-10-oxlint-stable)) | v1 2023; v2 2025 ([v2 announcement](https://biomejs.dev/blog/biome-v2/)) |
| Rule count | 870 (counted in local `configuration_schema.json`, 1.83.0; docs say 870 total / 111 on by default — [rules](https://oxc.rs/docs/guide/usage/linter/rules.html)) | 500+ ([v2.5](https://biomejs.dev/blog/biome-v2-5/)) |
| Scope | JS/TS linter only | Linter + formatter, JS/TS/JSON/CSS/GraphQL/HTML |

Both are mature enough to depend on. oxlint is used by Elastic, Sentry, Electron and Cloudflare ([oxlint guide](https://oxc.rs/docs/guide/usage/linter.html)).

**Cadence — flagged as inferred, not documented.** I read cadence off the npm version list, not a published policy: oxlint shipped 1.65.0 → 1.83.0 (18 minor releases) and Biome shipped 2.4.13 → 2.5.14 in the recent window. Both are releasing frequently. I could not find a stated release-cadence commitment for either.

**Version-sensitive signal:** Biome 2.5.14 emits `The use of the recommended field has been deprecated, and will removed in the next major version of Biome. Use preset instead.` A v3 with config breakage is visibly approaching; the [2026 roadmap](https://biomejs.dev/blog/roadmap-2026/) lists workspaces, SCSS, YAML and HTML stabilization but gives no dates. Any `biome.json` written today should expect one migration.

### Astro and `.astro` support — the thing I expected to be decisive, and wasn't

I expected this to break one of the two. **It doesn't. Both lint `.astro` frontmatter, verified empirically.** Against this fixture:

```astro
---
const unused = 1;
let x = "a" + "b";
---
<div>{x}</div>
```

- Biome (with `html.experimentalFullSupportEnabled: true`) reported `t.astro:2:7 lint/correctness/noUnusedVariables`.
- oxlint (`-D all`, no config) reported three diagnostics at `t.astro:3` — `prefer-const`, `id-length`, `no-useless-concat`.

And on the real repo, `oxlint --debug=files src` listed all 14 `.astro` files; `biome lint src` reported `Checked 61 files`.

Caveats, both documented and real:

- **oxlint** lints framework files "by linting only their `<script>` blocks" ([oxlint guide](https://oxc.rs/docs/guide/usage/linter.html)). For `.astro` that includes the frontmatter fence, as verified above. **Verified bonus:** a custom JS plugin also runs on `.astro` frontmatter — the `no-css-import` plugin fired on `t2.astro:2:1`. oxlint's plugin docs list "custom file formats/parsers (Svelte, Vue, Angular)" as unsupported ([JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html)); Astro is conspicuously absent from that exclusion list, and my test confirms it works.
- **Biome's** Astro support is explicitly experimental, gated behind `html.experimentalFullSupportEnabled: true`, added in v2.3 ([v2.3 release](https://biomejs.dev/blog/biome-v2-3/), [language support](https://biomejs.dev/internals/language-support/)). The release notes warn that "there are cases and framework-specific syntaxes that may not yet be fully supported (for example ... Astro JSX-like syntax)." There are open, specific frontmatter bugs: [#7912 `lint --write` is not idempotent on Astro frontmatter](https://github.com/biomejs/biome/issues/7912), [#6528 `fixAll.biome` only leaves frontmatter after format](https://github.com/biomejs/biome/issues/6528), [#7858 empty frontmatter not recognized](https://github.com/biomejs/biome/issues/7858). The 2026 roadmap still lists "extend lint rules to Vue, Svelte, and Astro" as future work.

**This is the reason for the split recommendation below.** Biome's Astro *linting* is good enough to rely on; its Astro *formatting* has open correctness bugs that corrupt files. Do not point Biome's formatter at `.astro` yet.

### TypeScript type-aware linting

- **oxlint** supports it via `--type-aware`, using tsgo (the Go port of the TypeScript compiler) ([oxlint guide](https://oxc.rs/docs/guide/usage/linter.html)), with the type-aware work announced in [Dec 2025](https://oxc.rs/blog/2025-12-08-type-aware-alpha.html). **Verified: it requires a separate package that is not bundled.** Running `oxlint --type-aware src` in this repo printed `Failed to find tsgolint executable. You may need to add the 'oxlint-tsgolint' package to your project?` I did not install it, so **I could not verify which type-aware rules fire here or what they cost in wall-clock time.**
- **Biome** does type-aware linting with its own inference, no `tsc` dependency, reading `.d.ts` from `node_modules` including transitive deps ([v2 announcement](https://biomejs.dev/blog/biome-v2/)). Rules include `noFloatingPromises`, `noMisusedPromises`, `useAwaitThenable`, `useExhaustiveSwitchCases`, `noUselessTypeConversion`. Biome's own docs concede `noFloatingPromises` detects "about 75%" of what `tsc`-backed typescript-eslint would.

Neither is fully equivalent to typescript-eslint's type-aware suite. **For this repo it barely matters** — `astro check` already runs `tsc` on every build, so genuine type errors are caught. Don't weight type-aware linting heavily in this decision.

### React and React-Hooks coverage — oxlint's clear advantage

This is where oxlint wins, and it is not close.

**Verified, running `oxlint --react-plugin --react-perf-plugin --import-plugin src` on this repo**, oxlint reported real findings the other tool didn't:

- `react(purity)` — `MoodboardCanvas.tsx:149` calling `Date.now` during render
- `react(refs)` — 11 diagnostics for accessing `ref.current` during render in `MoodboardCanvas.tsx`
- `react(immutability)` — `CameraRig.tsx:59` mutating a hook return value (`gl`)
- `react(set-state-in-effect)` — 4 diagnostics across `MoodboardCanvas.tsx`, `CardMesh.tsx`, `FavoritesCollectionHandler.tsx`
- `react-hooks(exhaustive-deps)` — `CardMesh.tsx:144`, missing `chunkCoords`, `layout`, `filterMatch`

Those `purity` / `refs` / `immutability` / `set-state-in-effect` rules are the React Compiler rule set (eslint-plugin-react-hooks v6 era). oxlint bundles eslint-plugin-react-hooks plus React Compiler support in its `react` plugin, off by default ([plugins](https://oxc.rs/docs/guide/usage/linter/plugins.html)). All are present in the 1.83.0 schema: `react/purity`, `react/refs`, `react/immutability`, `react/set-state-in-effect`, `react/exhaustive-deps`, `react/rules-of-hooks`.

**Verified, Biome with `"domains": {"react": "recommended"}`** reported 9 errors: `useExhaustiveDependencies` (5), `useHookAtTopLevel` (1), `noArrayIndexKey` (3) ([useExhaustiveDependencies](https://biomejs.dev/linter/rules/use-exhaustive-dependencies/), [useHookAtTopLevel](https://biomejs.dev/linter/rules/use-hook-at-top-level/); the React domain auto-enables when React >=16 is a dependency, per [domains](https://biomejs.dev/linter/domains/)). **I found no React Compiler equivalents in Biome** — no purity, refs, immutability or set-state-in-effect rule. **Unverified:** I searched the rules index rather than enumerating all 500+, so I cannot rule out a nursery rule I missed.

For a repo whose central artifact is a React Three Fiber canvas with documented frame-time regressions, oxlint's React Compiler rules are worth real money. This is the strongest argument *against* the recommendation, and it is why the "if you disagree" option below is genuinely viable.

Biome's recommended set does cover a11y (`useButtonType`, `noSvgWithoutTitle`, `noStaticElementInteractions`, `useKeyWithClickEvents` — 16 diagnostics on this repo) where oxlint's `jsx-a11y` is opt-in. Comparable value, different axis.

### Does adopting it replace Prettier and Stylelint?

**Biome: yes for CSS and TS/TSX, no for `.astro`.** Biome formats JS/TS/JSX/JSON/CSS/GraphQL as stable and HTML/SVG as experimental ([language support](https://biomejs.dev/internals/language-support/)).

What replacement costs here:

1. **`prettier-plugin-astro` has no Biome equivalent.** Biome's Astro formatting is experimental with the open idempotency bugs cited above. Keep Prettier for `.astro`.
2. **`@trivago/prettier-plugin-sort-imports` has no Biome equivalent either** — but Biome's `organizeImports` assist covers the same need natively, so this is a swap, not a loss.
3. **Config divergence.** `.prettierrc` sets `printWidth: 120`, `singleQuote: true`, `trailingComma: "none"`, `tabWidth: 2`. All four are expressible in `biome.json`. `trailingComma: "none"` maps to Biome's `trailingCommas: "none"`.
4. **Quote-style conflict inside one `.astro` file.** Biome's own v2.3 notes flag this: JS and CSS formatter settings can produce conflicting quote styles within a single `.astro` file, and the team called it out as unresolved.
5. **Stylelint replacement is free** — `stylelint` is not a declared dependency and `.stylelintrc` only extends `stylelint-config-html/astro`. There is no custom CSS rule set to port.

**oxlint: no.** It has no formatter and no CSS support, so Prettier *and* Stylelint both stay. Adopting oxlint means three tools where you had three tools.

### Migration effort, and whether partial adoption is sensible

**Partial adoption is not just sensible here, it's the only sane option** — because Biome's `.astro` formatter isn't ready.

Recommended smallest useful step, in order:

1. `pnpm add -D @biomejs/biome` and `pnpm biome init`.
2. In `biome.json`: enable the linter with `recommended`, add `"domains": {"react": "recommended"}`, and set `"html": {"experimentalFullSupportEnabled": true}`.
3. **Scope the formatter to exclude `.astro`** — `"formatter": {"includes": ["**", "!**/*.astro"]}` — and keep `.prettierrc` + `prettier-plugin-astro` for those 14 files.
4. Add `"lint": "biome lint ."` and `"format": "biome format --write . && prettier --write '**/*.astro'"` to `package.json`. **Right now neither script exists**, so this step alone is the biggest single improvement in this document.
5. Add the rule-1 GritQL plugin (the verified snippet above), scoped with `includes` to `src/styles/**` and `src/**/*.astro`.
6. Add `noRestrictedImports` with a `**/*.css` pattern, scoped by `overrides` to `src/components/moodboard/**`, with a comment noting it is a proxy for the `client:only` rule.
7. Delete `.eslintrc.js`, `.stylelintrc`, and the `eslint`, `@typescript-eslint/parser`, `eslint-plugin-astro`, `eslint-plugin-jsx-a11y`, `postcss-html`, `stylelint-config-html` devDependencies. They are not wired to anything.
8. **Add a `.github/workflows/` job** running `pnpm lint` and `pnpm build`. Without this, none of the above is a guardrail — it's a suggestion.

Expected first-run volume, measured: **54 diagnostics** from Biome's recommended set on `src/` (17 errors, 24 warnings, 13 infos), plus 9 from the React domain. That is an afternoon of cleanup on a 54-file source tree, not a migration project. Everything is reversible: delete `biome.json`, remove one devDependency.

Step 8 is the one that matters most and is independent of which linter you pick. Do it even if you pick neither tool.

### Custom-rule authoring, since rules 1-6 need it

**oxlint — ESLint-compatible JavaScript, alpha.** Announced [2026-03-11](https://oxc.rs/blog/2026-03-11-oxlint-js-plugins-alpha.html), documented at [JS plugins](https://oxc.rs/docs/guide/usage/linter/js-plugins.html). ESLint v9+ API compatible; docs claim "almost the entirety of ESLint's plugin API is now implemented." Supports visitor patterns, ESLint selector syntax, `node.parent`, `context.sourceCode`, scope analysis, autofixes, inline disables, LSP.

**Verified working:** a plugin using the esquery selector `ImportDeclaration[source.value=/\.css$/]` reported correctly on both `.tsx` and `.astro` frontmatter.

Documented limitations: **alpha stability**, no custom type-aware rules, no custom parsers. A known Windows OOM issue is reported (irrelevant on darwin).

**Critical gap for this repo: oxlint has no `no-restricted-syntax`.** I verified this by enumerating all 870 rule keys in `configuration_schema.json` for 1.83.0 — the only `restricted` rules are `no-restricted-exports`, `no-restricted-globals`, `no-restricted-imports`, `no-restricted-properties`, `no-shadow-restricted-names`, `typescript/no-restricted-types`, plus jest/vitest variants. The usual ESLint escape hatch for one-off AST-selector rules is absent. You must write a JS plugin — an alpha-stability dependency — for anything `no-restricted-syntax` would have covered inline.

**Biome — GritQL, stable since v2.0.** `.grit` files listed in `biome.json` under `plugins` ([linter plugins](https://biomejs.dev/linter/plugins/), [GritQL reference](https://biomejs.dev/reference/gritql/)). Targets JS (default), CSS, or JSON via a `language` declaration; supports `includes` path globs, `register_diagnostic()` with severity, and `=>` rewrites with `fix_kind`.

**Verified, honestly:** GritQL is stable but rough.

- Basic pattern matching works. `` `$sel { $props }` `` (CSS) matched all 3 rules in a fixture. `` `Object.assign($a, $b)` `` (JS) matched correctly. The empty-braces pattern for rule 1 works exactly as needed.
- **Anything beyond basic patterns failed to compile.** `CssDeclarationOrRuleList() as $b where {...}` produced `Failed to compile the Grit plugin`, as did a `contains bubble comment() as $c` clause. The error message is a bare `Failed to compile the Grit plugin` with no line number, no expected-token, no hint. Debugging is guess-and-check.
- No documentation of type information access, and none of plugin access to the module graph.

**Honest read of the authoring story: oxlint's is better designed, Biome's is more stable.** oxlint gives you the full ESLint AST in a language you know, with a debugger; Biome gives you a declarative DSL that is production-stable for simple patterns and opaque beyond that. For rule 1 specifically Biome's is sufficient and oxlint's is irrelevant (no CSS). For a hypothetical rule 3 denylist, oxlint's would be markedly nicer to write.

Neither tool's plugin system can reach the semantic properties in rules 3 and 5. Custom rules do not rescue those.

---

## If you disagree with the recommendation

Two defensible alternatives:

**(a) oxlint alone.** Pick this if the React Compiler diagnostics matter more than rule 1 — a fair position, since `react(purity)`, `react(refs)` and `react(immutability)` found 13 real findings in the moodboard code, all of which sit in exactly the area rules 3-6 are trying to protect. The cost: rule 1 stays prose permanently, Prettier and Stylelint both stay, and your custom-rule path depends on an alpha API. Note this is *not* a small cost given rule 1 is the single most obviously mechanical of the six.

**(b) Both — Biome for format + CSS + a11y, oxlint for JS/TS React rules.** This gets you 3 of 6 mechanized and the best React coverage available. It is also two linters, two configs and two sets of suppression comments on a personal website with 54 source files. I'd call this over-engineering at this size; revisit if the moodboard's frame-time regressions recur, since option (a)'s rules are the ones that would have caught them.

---

## Summary of what could not be verified

Stated plainly, rather than inferred:

1. **oxlint's type-aware rules** — blocked on the missing `oxlint-tsgolint` package, which I chose not to install. Rule list and performance cost unknown for this repo.
2. **Whether Biome's module graph can resolve an Astro `client:only` directive** to an imported component module — no documentation found either way. Assumed no.
3. **Whether Biome has any React Compiler-equivalent rule** — searched the rules index, did not enumerate all 500+ rules. Absence is probable, not certain.
4. **Whether `eslint@10` actually fails on this repo's `.eslintrc.js`** — inferred from ESLint's documented removal of eslintrc, not executed.
5. **Release cadence for either tool** — read off npm version history; no published cadence policy found for either.
6. **GritQL's full capability surface** — my two failed compilations may be my syntax errors rather than engine limits. The error messages gave no way to distinguish the two.

All version-sensitive claims are pinned to oxlint 1.83.0 and Biome 2.5.14 as of 2026-09-24. Biome's deprecation of `linter.rules.recommended` in favour of `preset` signals a v3 is near; re-check the Astro formatter bugs and the plugin surface before acting on this document if more than a couple of months have passed.
