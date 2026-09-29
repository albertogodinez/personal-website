# TypeScript stays on 5.x because `astro check` needs the JS compiler API

The project's `typescript` dependency stays on 5.x even though 7.0 is `latest` on npm. TypeScript 7 is the Go port, and its npm package no longer ships the JS compiler API (`createProgram`, `createLanguageService` and `ts.sys` are all undefined). `@astrojs/language-server` is built on that API, so `astro check`, the first half of `pnpm build`, dies on startup. Verified on 2026-09-29 against `typescript@7.0.2` with `@astrojs/check@0.9.8`: `Cannot read properties of undefined (reading 'fileExists')` in `language-server/dist/check.js`. The newest `@astrojs/check` (0.9.10) still declares `typescript: ^5.0.0 || ^6.0.0`.

Type-aware linting is not a reason to upgrade. oxlint's type-aware mode runs on the `typescript-go` bundled inside the `oxlint-tsgolint` package and never loads the project's `typescript`. Its "TypeScript 7" requirement is about tsconfig compatibility (no options that 6.0 deprecated or 7.0 removed, such as `baseUrl`), and this repo's tsconfig already meets it.

## Consequences

Revisit when `@astrojs/check` widens its `typescript` peer range to include 7. Until then, close any Dependabot PR that bumps `typescript` to 7 or later rather than merging it.
