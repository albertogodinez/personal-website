# AGENTS.md

## Navigation

- `CONTEXT.md` — the domain glossary. Use its vocabulary in code, tests and issues.
- `CODING_STANDARDS.md` — judgement-call standards, read during review rather than implementation.
- `docs/adr/` — recorded decisions. Read the ones touching the area you're working in; flag it explicitly if your change contradicts one.
- `docs/agents/` — where issues live, how domain docs are laid out, and the triage label vocabulary.
- `docs/solutions/` — writeups of past problems, with YAML frontmatter (`module`, `tags`, `problem_type`). Relevant when working in an area one of them covers.
- `docs/analysis/`, `docs/features/`, `docs/testing/`, `docs/troubleshooting/` — reference material from the moodboard build.

## Agent skills

### Issue tracker

Issues and specs live as local markdown under `.scratch/<feature-slug>/`. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles, recorded as a `Status:` line in each issue file. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

## Verifying visual changes

Use the `verify-site` skill (`.agents/skills/verify-site/`) before claiming a
UI change works: `pnpm verify:site shot <route>` to look, `pnpm verify:site
parity` to prove dev and the production build match.

## Rules and what enforces them

When a review correction repeats, move its rule up this table: architecture,
then types, then lint/CI, then a hook, and prose only for judgement calls.

| Rule                                                                                        | Enforced by                                                      |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Lint clean (React Compiler rules, a11y, TS)                                                 | `pnpm lint` in `.husky/pre-push` and CI                          |
| Types check                                                                                 | `astro check` in `pnpm build` (pre-push) and CI                  |
| Production build succeeds                                                                   | `pnpm build` in pre-push; Netlify on `main`                      |
| Node matches `.nvmrc`                                                                       | pre-push, `engine-strict` in `.npmrc`                            |
| Dev and production render identically (e.g. no CSS imported from a `client:only` component) | `pnpm verify:site parity` in pre-push                            |
| No placeholder CSS rules                                                                    | `.biome/no-placeholder-css.grit` via `pnpm lint`                 |
| `<svg>` has `<title>`, no `any` in `.astro`                                                 | `pnpm lint:astro`, advisory only; prose in `CODING_STANDARDS.md` |
| R3F per-frame rules                                                                         | prose in `CODING_STANDARDS.md`                                   |

Don't bypass `.husky/pre-push` with `--no-verify`.
