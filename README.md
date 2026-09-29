# 🌎 [albertogodinez.me](https://albertogodinez.me)

[![Netlify Status](https://api.netlify.com/api/v1/badges/05cf5ad1-b168-4582-bddf-6fa0b4f12ca6/deploy-status)](https://app.netlify.com/sites/albertogodinez/deploys)

Personal website built with the following

- 🧑‍🚀 Built with [Astro](https://astro.build/), [React](https://reactjs.org), [Radix UI](https://www.radix-ui.com/) and [TypeScript](https://www.typescriptlang.org)
- 🛜 Hosted on [Netlify](https://www.netlify.com/)

## 🔌 Commands to run

Clone repository and all of the following commands can run from the root of the project

| Command                    | Action                                           |
| :------------------------- | :----------------------------------------------- |
| `pnpm install`             | Installs dependencies                            |
| `pnpm dev`                 | Starts local dev server at `localhost:4321`      |
| `pnpm build`               | Type-checks, then builds production site to `./dist/` |
| `pnpm lint`                | oxlint on `.ts`/`.tsx`, Biome on `.css`          |
| `pnpm lint:fix`            | Same, applying every autofix                     |
| `pnpm astro ...`           | Run CLI commands like `astro add`, `astro check` |
| `pnpm astro -- --help`     | Get help using the Astro CLI                     |

`pnpm preview` does not work — the Netlify adapter has no preview command. To
check a production build locally, use `netlify dev`, or serve `./dist/` with a
static server and proxy `/api/*` to a running `pnpm dev`.

## Prerequisites

Node and pnpm are pinned. `.nvmrc` is the source of truth and Netlify reads it
for production builds.

| Tool | Version |
| --- | --- |
| Node | 24.21.0 (Krypton LTS) |
| pnpm | 10.19.0 |

```sh
nvm use          # picks up .nvmrc
pnpm install
pnpm dev
```

Astro 6 requires Node >= 22.12, so Node 20 fails the build outright. If `pnpm`
resolves to a different Node's install, run `npm i -g pnpm@10.19.0` under the
pinned version.

## Troubleshooting

### Browser Console Errors

If you see errors like `content.js:17 Uncaught (in promise) ReferenceError` in your browser console, these are from browser extensions, not your website code.

**Quick verification:**
- Open your site in incognito mode (extensions disabled by default)
- If the error disappears, it's from an extension

**Learn more:**
- [Browser Extension Errors Guide](./docs/troubleshooting/browser-extension-errors.md) - Identify which extension is causing issues
- [Console Filtering Guide](./docs/troubleshooting/console-filtering.md) - Filter out extension noise in DevTools

### Common Development Issues

For project-specific guidelines and issues, see:

- [AGENTS.md](./AGENTS.md) — repo navigation, agent skills, and the pre-push checklist
- [CODING_STANDARDS.md](./CODING_STANDARDS.md) — the judgement-call standards `pnpm lint` can't mechanise
- [CONTEXT.md](./CONTEXT.md) — the domain glossary
