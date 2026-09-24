---
title: "refactor: Migrate from Netlify to Cloudflare Pages"
type: refactor
status: active
date: 2026-04-19
origin: docs/brainstorms/2026-04-19-cloudflare-migration-requirements.md
---

# Migrate from Netlify to Cloudflare Pages

## Overview

Swap the hosting platform from Netlify to Cloudflare Pages. The site is a static Astro build with no Netlify-specific features (no forms, edge functions, or identity). This is an adapter swap, environment variable migration, and DNS cutover.

## Problem Frame

The content pipeline and moodboard canvas workstreams invest in the Cloudflare ecosystem (Workers, R2). Running the site on Netlify while the data layer lives on Cloudflare adds unnecessary cross-platform complexity. (see origin: `docs/brainstorms/2026-04-19-cloudflare-migration-requirements.md`)

## Requirements Trace

- R1. Replace `@astrojs/netlify` with `@astrojs/cloudflare`
- R2. Production build produces valid Cloudflare Pages output
- R3. All existing pages work identically after migration
- R4. Wrangler CLI for deployment and local preview
- R5. Git-based deploys (push to main triggers build)
- R6. Environment variables configured in Cloudflare Pages
- R7. Domain points to Cloudflare Pages
- R8. SSL/TLS working
- R9. Netlify decommissioned after verification
- R10. Visual comparison against Netlify deployment
- R11. All interactive components function correctly

## Scope Boundaries

- No feature changes — platform migration only
- Cloudinary stays as-is (replaced in content pipeline workstream)

## Context & Research

### Relevant Code and Patterns

- `astro.config.mjs` — current Netlify adapter config with `output: 'static'` and `cacheOnDemandPages: true`
- `package.json` — `@astrojs/netlify` v7.0.6 dependency
- `src/components/Footer.astro` — references unused `NETLIFY_BUILD_TIME` env var
- `.netlify/` — build artifacts directory to remove from gitignore swap
- `.env` — `CLOUDINARY_URL`, `PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_SECRET`
- No `netlify.toml`, `_redirects`, or `_headers` files — no Netlify platform features in use

### External References

- Astro Cloudflare adapter: `docs.astro.build/en/guides/integrations-guide/cloudflare/`
- Cloudflare Pages build config: `developers.cloudflare.com/pages/`

## Key Technical Decisions

- **Static output mode**: `@astrojs/cloudflare` supports static mode. Drop `cacheOnDemandPages` (Netlify-specific option) — Cloudflare Pages handles asset caching natively with `Cache-Control: public, max-age=31536000, immutable` for `/_astro/*` assets by default.
- **Wrangler for local preview**: `wrangler pages dev` replaces `netlify dev` for local production-like preview.

## Open Questions

### Resolved During Planning

- **Does `@astrojs/cloudflare` support static output?** Yes — Astro's Cloudflare adapter supports `output: 'static'`.
- **Are there Netlify-specific features to migrate?** No — no forms, edge functions, identity, redirects, or headers files. Clean migration.
- **Does Cloudflare Pages support pnpm?** Yes — set build command to `pnpm build` and install command to `pnpm install` in Pages dashboard.

### Deferred to Implementation

- DNS configuration specifics depend on whether the domain is already on Cloudflare DNS or needs CNAME setup.

## Implementation Units

- [ ] **Unit 1: Swap Astro adapter**

  **Goal:** Replace Netlify adapter with Cloudflare adapter and verify build succeeds.

  **Requirements:** R1, R2

  **Dependencies:** None

  **Files:**
  - Modify: `package.json`
  - Modify: `astro.config.mjs`
  - Modify: `src/components/Footer.astro`

  **Approach:**
  - `pnpm remove @astrojs/netlify && pnpm add @astrojs/cloudflare`
  - Update `astro.config.mjs`: import `cloudflare` from `@astrojs/cloudflare`, replace adapter, remove `cacheOnDemandPages`
  - Remove `NETLIFY_BUILD_TIME` reference from Footer
  - Run `pnpm build` to verify output

  **Patterns to follow:**
  - Existing `astro.config.mjs` structure

  **Test scenarios:**
  - Happy path: `pnpm build` completes without errors and produces output in `dist/`
  - Happy path: All static pages (index, moodboard, memorabilia) are present in build output
  - Edge case: `astro check` passes with no type errors after adapter swap

  **Verification:**
  - `pnpm build` succeeds
  - Build output directory contains all expected pages

- [ ] **Unit 2: Configure Cloudflare Pages project and deploy**

  **Goal:** Create Cloudflare Pages project, configure environment variables, and deploy.

  **Requirements:** R4, R5, R6

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `.gitignore` (add `.wrangler/`)

  **Approach:**
  - Create Pages project via Wrangler CLI or Cloudflare dashboard
  - Configure build settings: build command `pnpm build`, output directory `dist/`, Node.js version
  - Add environment variables: `PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_URL`, `CLOUDINARY_API_SECRET`
  - Connect git repo for automatic deploys on push to main
  - Test with `wrangler pages dev dist/` locally first

  **Patterns to follow:**
  - Cloudflare Pages documentation for Astro projects

  **Test scenarios:**
  - Happy path: `wrangler pages dev dist/` serves the site locally with all pages loading
  - Happy path: Push to connected repo triggers a Cloudflare Pages build that succeeds
  - Error path: Build fails if environment variables are missing — verify error message is clear

  **Verification:**
  - Site is accessible on the `*.pages.dev` preview URL
  - All environment-dependent features work (Cloudinary images load)

- [ ] **Unit 3: Visual verification and DNS cutover**

  **Goal:** Confirm visual parity with Netlify, then point domain to Cloudflare Pages.

  **Requirements:** R3, R7, R8, R9, R10, R11

  **Dependencies:** Unit 2

  **Files:**
  - None (DNS and dashboard configuration)

  **Approach:**
  - Open Cloudflare Pages preview URL alongside current Netlify deployment
  - Verify: gradient background, dark mode toggle, font loading (Butler, Departure Mono), all React components (favorites filter, accordion, dialog), content collections
  - Configure custom domain in Cloudflare Pages dashboard
  - Verify SSL certificate provisioning
  - After verification period, remove Netlify site

  **Test scenarios:**
  - Happy path: Landing page gradient background renders correctly (known past issue — see commit c0aa580)
  - Happy path: Dark mode toggle works and persists across page loads (localStorage)
  - Happy path: Favorites/memorabilia page filters work (Radix Select, nanostores)
  - Happy path: All Cloudinary images load correctly
  - Happy path: Custom fonts render (check both Butler serif and Departure Mono)
  - Edge case: SSL certificate is active on custom domain (no mixed content warnings)

  **Verification:**
  - Site at custom domain matches Netlify deployment with no visual regressions
  - SSL/TLS active, no mixed content
  - Netlify site can be safely decommissioned

## System-Wide Impact

- **Interaction graph:** No application-level changes — only hosting platform changes
- **Error propagation:** N/A
- **State lifecycle risks:** None — static site, no server state
- **Unchanged invariants:** All page routes, component behavior, and content collections remain identical

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| DNS propagation delay during cutover | Keep Netlify live during propagation window; use low TTL |
| Asset caching headers differ between platforms | Verify Cloudflare Pages default cache behavior matches Netlify's immutable asset headers |
| Build environment differences (Node version, pnpm) | Pin Node version in Cloudflare Pages build settings to match local dev |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-19-cloudflare-migration-requirements.md](docs/brainstorms/2026-04-19-cloudflare-migration-requirements.md)
- Related code: `astro.config.mjs`, `package.json`
- Related commit: c0aa580 (gradient background production build fix — regression to watch for)
