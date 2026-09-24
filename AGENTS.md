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

## Pre-Push Validation

Before pushing changes to main, always:

1. Run `pnpm build` to produce a production build.
2. Compare the production build against the local dev server (check layout, styles, assets) using browser screenshots or DevTools.
3. Only push after confirming prod build matches local dev.
