# Migrate hosting from Netlify to Cloudflare Pages

Status: needs-info

Blocked on one decision only a human can make: how the image proxy survives the
runtime change (see Implementation Decisions → "The image proxy is the migration's
only real blocker"). Everything else in this spec is settled and ready to build.

Related prior research:
`docs/analysis/research-framework-migration-tanstack-cloudflare-local-first.md`
evaluates a much larger move — Astro to TanStack Start on Cloudflare — and
deliberately declines to commit to it until someone answers what the site's
real-time feature would actually be. This spec is the narrow version of the same
instinct: same Astro site, different host.

## Problem Statement

The site is hosted on Netlify while the work queued up behind it — the content
pipeline and the moodboard canvas — both invest in the Cloudflare ecosystem
(Workers, R2). As soon as either of those lands, the data layer lives on
Cloudflare and the site that reads it lives somewhere else. That split means two
dashboards, two CLIs, two sets of environment variables, and two mental models
for anyone debugging a deploy. It also blocks the cheapest version of the content
pipeline, where an R2 binding is simply available to the site at runtime rather
than reached across the public internet.

Migrating now, while the site is still small and the Cloudflare dependencies are
still hypothetical, is much cheaper than migrating later with R2 bindings and
Worker dependencies already wired through the codebase.

## Solution

Move hosting to Cloudflare Pages: swap the Astro adapter, recreate the build and
environment configuration on Pages, verify visual and functional parity against
the live Netlify deployment, then cut the domain over and decommission Netlify.

Nothing about the site's behaviour changes. Every route, component, and content
collection stays identical; a visitor should be unable to tell the migration
happened. This is a platform move, not a feature change.

The one genuine exception is the image proxy endpoint, which is the only
server-rendered route in the project and depends on a Node-native image library
that the Cloudflare Workers runtime cannot load. That route needs a decision
before this work can start.

## User Stories

1. As a site visitor, I want every page to load exactly as it did before, so that the migration is invisible to me.
2. As a site visitor, I want the landing page gradient background to render, so that the page doesn't look broken on first impression.
3. As a site visitor, I want the dark mode toggle to work and remember my choice across page loads, so that my preference persists.
4. As a site visitor, I want the custom fonts to render, so that the site's typography looks intentional rather than falling back to system faces.
5. As a site visitor, I want the memorabilia and favorites filters to work, so that I can browse the collection.
6. As a site visitor, I want the moodboard canvas to render and stay interactive, so that the most demanding page on the site survives the move.
7. As a site visitor, I want moodboard card images to load, so that the canvas isn't a grid of blank planes.
8. As a site visitor, I want the site served over HTTPS with no mixed-content warnings, so that the browser doesn't flag it as insecure.
9. As a site visitor, I want the site to stay reachable throughout the cutover, so that there is no window where the domain fails to resolve.
10. As the site owner, I want hosting on the same platform as my data layer, so that I manage one account, one CLI, and one set of secrets.
11. As the site owner, I want the production build to succeed with the Cloudflare adapter, so that deploys are not blocked by a build failure.
12. As the site owner, I want pushing to the main branch to trigger a deploy automatically, so that shipping does not require me to run a command.
13. As the site owner, I want to preview a production-like build locally before deploying, so that I catch platform-specific breakage before it reaches the domain.
14. As the site owner, I want environment variables configured on Pages, so that the image CDN integration keeps working.
15. As the site owner, I want the Node version pinned in the build settings, so that the deploy environment matches the toolchain I develop against.
16. As the site owner, I want to compare the new deployment against the old one side by side before cutting DNS, so that I find regressions while rollback is still trivial.
17. As the site owner, I want Netlify kept alive until the new deployment is verified, so that I can revert by pointing DNS back.
18. As the site owner, I want Netlify decommissioned once I'm confident, so that I stop paying attention to a platform I no longer use.
19. As the site owner, I want the now-dead Netlify-specific references removed from the codebase, so that nothing pretends to read a variable that will never be set again.
20. As a future maintainer, I want no leftover Netlify assumptions in the config, so that I don't waste time reasoning about a platform the site no longer uses.
21. As a future maintainer, I want the reason the site is on Cloudflare recorded, so that I don't undo a deliberate alignment decision by accident.

## Implementation Decisions

**Migrate before the Cloudflare-dependent work, not after.** The content pipeline
and moodboard workstreams are the reason for the move. Doing the migration first
means those workstreams can assume an R2 binding is simply present, rather than
being written against Netlify and then ported.

**Wrangler is the primary tool.** Deployment and local production-like preview go
through Wrangler rather than the dashboard, giving one CLI across Pages, Workers,
and R2. Wrangler's Pages dev server replaces the Netlify dev server for local
production previews; the ordinary Astro dev server is unaffected.

**Static output mode is retained.** The Cloudflare adapter supports Astro's static
output, so the site's rendering model does not change.

**Drop the on-demand page caching option.** That option is specific to the Netlify
adapter and has no Cloudflare equivalent. It isn't needed: Pages applies
long-lived immutable cache headers to Astro's hashed asset directory by default,
which is the behaviour the option was there to get.

**The image proxy is the migration's only real blocker, and it needs a decision
before work starts.** The project has exactly one server-rendered route — the
moodboard's image proxy — and it depends on `sharp`, a Node-native image
processing library, plus Node's Buffer API. The Cloudflare Workers runtime cannot
load native bindings, so that route will not run there as written.

This is why the April 2026 planning docs this spec was collapsed from described
the migration as clean, with "no server state" and "no Netlify-specific features":
the proxy did not exist when they were written. Those docs were removed when this
spec replaced them and remain in git history. The same constraint is recorded from
the hosting side in `docs/adr/0002-selective-ssr-runs-in-netlifys-node-function.md`.

Resolving it means choosing one of:

- Re-implement the resize step on Cloudflare's own image transformation
  capability, dropping the Node image library entirely. Keeps the proxy's
  same-origin CORS behaviour, which is the reason it exists, and keeps the
  bandwidth savings, but is a rewrite of the route's core.
- Drop the resize and let the proxy pass bytes through unchanged. Simplest, but
  gives back the bandwidth reduction that removed the texture-decode tail from
  the canvas's frame times, so the moodboard regresses.
- Sequence this migration behind the content pipeline. Moving media to R2 makes
  the images same-origin at rest, which removes the reason the proxy exists at
  all. Cleanest end state, but inverts the ordering this spec argues for.

This choice is a prerequisite, not an implementation detail: it determines
whether the migration is an adapter swap or an adapter swap plus a route rewrite.

**No platform-feature migration is required beyond the adapter.** The project has
no redirects file, no headers file, no platform config file, and uses no forms,
identity, or edge-function features. The integration is adapter-only.

**Remove the dead build-time environment variable.** The footer reads a
Netlify-injected build-time variable, and the ambient type declarations declare
it. Both references go; the footer either loses the build time or sources it from
a platform-neutral value.

**Keep the image CDN as-is.** The existing Cloudinary integration is not touched
here. Replacing it with R2 belongs to the content pipeline workstream, and
bundling the two would make a reversible platform move into an irreversible data
migration.

**The package manager and Node version are configured explicitly.** Pages
supports the project's package manager once the install and build commands are
set explicitly, and the Node version is pinned to match the repo's toolchain
rather than relying on the platform default.

## Testing Decisions

**What a good test looks like here.** This is a migration, so the meaningful
assertion is *parity*: the new deployment behaves as the old one did. Tests
should observe externally visible behaviour — what a browser receives and
renders — and must not assert on adapter internals or build output structure,
which are exactly what the migration changes. There is no new application logic
to unit test.

**Build-level verification.** The production build completes with the Cloudflare
adapter, the type checker passes, and every expected page is present in the build
output. These are the cheapest signals and gate everything else.

**Local preview verification.** The built output is served through Wrangler's
Pages dev server and every page loads before anything is deployed.

**Deployed preview verification, against the live Netlify site side by side.**
This is the load-bearing test and the reason for the pre-cutover preview
deployment. Cover each of these, because each is either a past regression or a
platform-sensitive behaviour:

- The landing page gradient background renders. This has broken in a production
  build before, on exactly this kind of build-configuration change, and is the
  single highest-value check.
- The dark mode toggle works and the choice survives a reload.
- Both custom fonts render rather than falling back.
- The React islands hydrate and work: the favorites filter, the accordion, and
  the dialog.
- Content collections render their entries.
- Images served through the CDN load, confirming environment variables reached
  the build.
- The moodboard canvas renders, pans, zooms, and switches layout modes, and its
  card images load — this exercises the proxy route and is where the runtime
  difference will surface if the proxy decision above was wrong.

**Cutover verification.** The custom domain serves the site over a valid
certificate with no mixed-content warnings, and the pre-cutover checks are
re-run once against the real domain rather than the preview URL.

**Prior art.** The repo's own pre-push rule already prescribes this shape —
build, then compare the production build against local dev in a browser — so
this is that existing practice applied across two deployments instead of two
environments.

## Out of Scope

- Any change to the site's features, routes, content, or visual design.
- Replacing the image CDN with R2. That is the content pipeline workstream.
- The content pipeline and moodboard canvas workstreams themselves, except where
  the image proxy decision above forces a sequencing choice between them.
- Build pipeline changes beyond the adapter swap, environment configuration, and
  the Node version pin.
- Migrating DNS hosting itself, if the domain's DNS is not already on Cloudflare.
  Whether this is in scope depends on where DNS lives today, which is an open
  question the sources never resolved; the cutover assumes DNS records can be
  pointed at Pages.
- Adding Cloudflare capabilities the site doesn't use yet: Workers beyond what
  the adapter generates, KV, D1, Durable Objects, or analytics.
- Performance optimisation. Parity is the goal; if Cloudflare happens to be
  faster, that is a side effect, not a success criterion.
