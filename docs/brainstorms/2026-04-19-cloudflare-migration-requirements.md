---
date: 2026-04-19
topic: cloudflare-migration
---

# Cloudflare Pages Migration

## Problem Frame

The site currently deploys to Netlify via `@astrojs/netlify`. The other two workstreams (content pipeline, moodboard canvas) invest heavily in the Cloudflare ecosystem (Workers, R2). Running the site on Netlify while the data layer lives on Cloudflare adds unnecessary cross-platform complexity. Migrating to Cloudflare Pages aligns hosting with the rest of the infrastructure.

## Requirements

**Adapter Swap**

- R1. Replace `@astrojs/netlify` with `@astrojs/cloudflare` in the Astro config.
- R2. The production build (`pnpm build`) produces a valid Cloudflare Pages output.
- R3. All existing pages and functionality work identically after migration (landing page, memorabilia/favorites, moodboard, experience section).

**Deployment**

- R4. Wrangler CLI is used for deployment and local preview (`wrangler pages dev`).
- R5. Git-based deploys are configured (push to main triggers a Cloudflare Pages build).
- R6. Environment variables (Cloudinary keys, any future R2 bindings) are configured in Cloudflare Pages settings.

**DNS & Domain**

- R7. `albertogodinez.me` (or current domain) points to Cloudflare Pages.
- R8. SSL/TLS is configured and working.
- R9. Netlify deployment is decommissioned after verification.

**Validation**

- R10. Production build on Cloudflare Pages is visually compared against the current Netlify deployment to confirm parity (per CLAUDE.md pre-push validation rules).
- R11. Gradient background, fonts, dark mode, and all interactive React components function correctly in the Cloudflare Pages build.

## Success Criteria

- The site is live on Cloudflare Pages with no visual or functional regressions from the Netlify deployment.
- `pnpm build` succeeds with the Cloudflare adapter.
- Wrangler CLI can deploy and preview locally.
- Domain and SSL are working.

## Scope Boundaries

- No feature changes to the site — this is a platform migration only.
- Cloudinary integration stays as-is during this migration. Replacing Cloudinary with R2 is part of the content pipeline workstream.
- No changes to the build pipeline beyond the adapter swap and environment variable configuration.

## Key Decisions

- **Migrate now rather than later:** Aligns hosting with the Cloudflare ecosystem before the other two workstreams add R2 bindings and Worker dependencies.
- **Wrangler CLI as the primary deployment tool:** Consistent tooling across Pages, Workers, and R2 management.

## Dependencies / Assumptions

- Cloudflare account with Pages access.
- Domain DNS is manageable (either already on Cloudflare DNS or transferable).
- `@astrojs/cloudflare` adapter supports the site's current output mode (`static` with `cacheOnDemandPages`). Verify compatibility during planning.
- No Netlify-specific features (edge functions, forms, identity) are in use — the current integration is adapter-only.

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Needs research] Does `@astrojs/cloudflare` support the same `cacheOnDemandPages` option, or does the caching strategy need adjustment?
- [Affects R5][Technical] Cloudflare Pages build configuration — does it support `pnpm` natively or does it need a build command override?
- [Affects R7][User decision] Is the domain already on Cloudflare DNS, or does DNS need to be migrated as part of this?

## Next Steps

-> `/ce:plan` for structured implementation planning
