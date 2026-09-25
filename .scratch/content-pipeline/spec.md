# Content sync pipeline (Cloudflare Worker + R2)

Status: ready-for-agent

Collapsed from the content-pipeline requirements and plan docs written 2026-04-19,
removed in the same commit that added this spec and recoverable from git history.

## Problem Statement

The moodboard's content is other people's infrastructure. Items live in Raindrop.io and
Are.na, their images are served from whatever CDN those platforms happened to use, and the
site reads that arrangement more or less directly. Two things follow from it.

The first is that the collection decays on its own. 52 of the 133 covers in the current
Raindrop dump are already dead — mostly expired Instagram signed URLs that cannot be
revived, plus a handful of Raindrop render-service failures and deleted tweets. Nobody
broke anything; the links simply aged out. Every month that passes takes more of the
moodboard with it.

The second is that maintaining the collection means touching several places. Adding
something is easy in whichever app it was found in, but there is no single view of what the
moodboard actually contains, no single place to correct a wrong title, and no way to see an
item's history. Saving a thing and having the site know about it are separate acts.

Underneath both: the site cannot answer "what is in my moodboard" without asking a
third-party API that may be rate-limited, changed, or gone.

## Solution

The site gets its own copy. A sync worker pulls from each source on a schedule and on
demand, copies every media file into Cloudflare R2, normalizes the metadata into one
manifest, and the site reads only from R2 from then on.

Because the media is copied rather than linked, an expired source URL stops mattering the
moment an item has been synced once. The rot problem becomes a one-time recovery problem
for items already lost, and a non-problem for everything after.

Because the metadata is normalized into one manifest, the moodboard has a single
definition. The site stops caring which platform an item came from; that becomes just
another field. Adding an item stays as easy as saving it in Raindrop — a webhook fires and
it appears within minutes — but now there is one canonical record of what was saved.

## User Stories

1. As a site visitor, I want moodboard images to load, so that the page is not a grid of
   broken placeholders.
2. As a site visitor, I want images to keep loading months after they were added, so that
   older items are as viewable as recent ones.
3. As a site visitor, I want the moodboard to render even when Raindrop or Are.na is down,
   so that a third party's outage is not my problem.
4. As a site visitor, I want video items to show a still image I can click, so that I can
   tell what a video is before committing to it.
5. As a site owner, I want everything I save in Raindrop to reach the site automatically,
   so that publishing is not a separate chore from collecting.
6. As a site owner, I want a newly saved item to appear within minutes, so that the site
   feels current rather than batch-updated.
7. As a site owner, I want items I save in Are.na to reach the site too, so that I am not
   restricted to one collection tool.
8. As a site owner, I want one manifest describing every item, so that I can see what the
   moodboard contains without opening three apps.
9. As a site owner, I want an item's original URL preserved, so that I can always get back
   to where I found it.
10. As a site owner, I want to know which platform an item came from, so that I can trace
    an oddity back to its source.
11. As a site owner, I want re-running a sync to be safe, so that I can trigger one
    whenever I am unsure without creating duplicates.
12. As a site owner, I want a title I corrected at the source to update on the next sync,
    so that fixes propagate without manual reconciliation.
13. As a site owner, I want items I delete at the source to stay on the site until I remove
    them deliberately, so that an accidental deletion does not silently erase content.
14. As a site owner, I want one source failing to leave the others working, so that an
    Are.na token problem does not block Raindrop entirely.
15. As a site owner, I want a failed sync to leave the previous manifest intact, so that a
    bad run degrades to "no new items" rather than "no items".
16. As a site owner, I want each sync to report what it added, updated, and failed on, so
    that I can tell whether it did anything.
17. As a site owner, I want a daily sync to run unattended, so that anything a webhook
    missed is picked up without me noticing the gap.
18. As a site owner, I want to trigger a sync by hand, so that I can force one after
    changing something at the source.
19. As a site owner, I want sync endpoints to require a token, so that nobody else can
    drive my worker.
20. As a site owner, I want the same item cross-posted to two platforms to be allowed
    rather than rejected, so that the sync never fails on a case I can clean up by hand.
21. As a site owner, I want an item whose media cannot be fetched to still appear with its
    metadata, so that one dead link does not drop the item entirely.
22. As a maintainer, I want the worker and the site to agree on one item type, so that a
    field added on one side cannot silently diverge on the other.
23. As a maintainer, I want media object keys to be predictable from the item id, so that I
    can find an item's file in R2 without consulting the manifest.
24. As a maintainer, I want to inspect and fix content with the tools I already have, so
    that I do not have to build an admin UI to correct a typo.
25. As a maintainer, I want the site's remaining Cloudinary assets moved to R2, so that
    there is one media host rather than two.

## Implementation Decisions

**R2 is the canonical store, not a cache.** Content is copied into R2 and the site reads
only from there. The alternative — federating the source APIs at build time — was rejected
because it keeps the site coupled to third-party availability, rate limits, and URL
lifetimes, which is the whole problem.

**One worker, per-source route handlers.** A single Cloudflare Worker exposes a route per
source plus a sync-all route, rather than one worker per source. At this scale a source is
a route, not a service; this keeps deployment and configuration singular.

**Cosmos.so is dropped.** It has no public API and no IFTTT integration, so it cannot be
synced. It was in the original requirements and is removed here deliberately rather than
left as an unimplementable route.

**The shared item type is the contract, and the canvas workstream owns it.** The pipeline
normalizes into the existing moodboard item interface and does not redefine it. That
interface currently carries: composite id, title, description, date, tags, content type,
media URL, an optional YouTube id, and source metadata (original URL, source domain,
source platform).

**Normalize into tags, not a category taxonomy.** Earlier planning specified a required
five-value category vocabulary (web, typography, illustration, photography, motion) with
keyword-based assignment from source tags. That did not ship: the shared type has no
category field and the canvas filters by content type instead. The pipeline therefore
passes source tags through as-is and does not invent a category. Re-introducing a taxonomy
means changing the shared type, which is the canvas workstream's decision, not this one's.

**Content type is inferred, and `link` is a real value.** The shipped type admits image,
gif, video, link, and markdown. Inference uses the source's own type hint plus the media
URL, matching what the site already does when reading the Raindrop dump directly.

**Composite key as identity.** Every item is keyed `{source}:{platformId}`. This doubles as
the item id in the manifest and as the basis for media object keys, so identity is derivable
rather than assigned.

**Idempotency by upsert on the composite key.** A sync matches on that key: an existing
item has its metadata updated in place, a new one is appended. Re-running a sync with
unchanged data is a no-op.

**Deletions at the source are not propagated.** Removing an item is a manual act. At this
volume the risk of silently losing content to an upstream deletion outweighs the
convenience of automatic pruning.

**Cross-posted items are allowed to duplicate.** The same thing saved to two platforms
yields two composite keys and two entries. Deduplicating automatically would require
guessing at URL equivalence; manual cleanup is cheaper and safer at this volume.

**One manifest object at the bucket root.** A single JSON manifest holds all items plus a
last-sync timestamp. Per-item objects were rejected as more machinery than low hundreds of
items justify. The worker reads the manifest, upserts, and writes it back whole; R2's put is
atomic, so a partial write cannot corrupt it.

**Flat media namespace.** Media objects are stored as `media/{itemId}.{ext}` with the
extension derived from the response content type. No nested hierarchy.

**Media download is skip-if-present.** An existing object key is not re-fetched, which is
what makes repeated syncs cheap as well as safe.

**Video stores a thumbnail, not the file.** Only the still image is copied into R2; the
embed reference stays in metadata for the canvas to render. Copying video files would cost
far more storage and bandwidth than the feature needs.

**Media failure degrades to metadata-only.** A fetch that fails is logged and the item is
still written to the manifest without media. One dead link must not drop an item or abort a
run.

**Source failures are isolated.** Each source syncs independently; an error is recorded and
the next source still runs. The sync-all route and the cron path both work this way.

**Webhooks primary, cron as the safety net.** Raindrop has IFTTT triggers, so its existing
applet is repointed from a notification action to a web request against the sync route.
Are.na has no IFTTT or Zapier trigger and is cron-only. A daily sync-all catches anything
the webhooks missed.

**Sync routes require a bearer token.** An environment-held token gates every sync route so
the endpoints cannot be triggered by anyone who learns the URL.

**Raindrop authenticates with a personal test token.** For single-user use, a
non-expiring test token avoids implementing an OAuth refresh flow. Are.na uses a personal
access token. Both platforms allow 120 requests per minute, which is generous against a
collection in the low hundreds; Raindrop pages at 50 items and Are.na at 100.

**Cloudinary migration is a separate one-time job.** Existing Cloudinary assets move to R2
once, after the pipeline is stable, and the site is repointed. It is not an ongoing sync and
should not be built into the worker.

**Already-lost media is a recovery problem, not a pipeline problem.** The 52 dead covers
predate any sync and cannot be retrieved by copying a URL that no longer resolves. The
pipeline stops the bleeding; recovering those specific items means re-fetching from the
Raindrop API so it re-signs them, which is tracked separately.

## Testing Decisions

A good test here asserts on externally observable behavior: what ends up in the manifest,
what objects exist in the bucket, what status a route returns. Tests that assert on how
normalization is structured internally will be rewritten every time a source changes shape,
and are not worth writing.

**Seams.** The pipeline has two natural boundaries and testing should use them rather than
introducing more. The first is the source API response: feed a handler a recorded payload
and assert on the manifest it produces. The second is the bucket: an in-memory or local
stand-in for R2 lets manifest and media behavior be asserted without network. Route
handlers are exercised through the worker's own dev server so routing, auth, and status
codes are covered as the outside world sees them.

**Manifest behavior** is where correctness lives and deserves the most coverage: a missing
manifest reads as empty rather than failing; a new item appends; an existing key updates in
place without changing the item count; unrelated items survive an update; a write followed
by a read round-trips.

**Idempotency is a first-class test, not an afterthought.** Running a source handler twice
against unchanged data must produce no new items, and running it against changed metadata
must update rather than append.

**Per-source normalization** is tested against recorded payloads from each platform,
covering each content type the source can produce — including Are.na's text blocks becoming
markdown and its media blocks becoming video — and covering an item with no tags.

**Failure paths carry equal weight to happy paths**, because graceful degradation is a
stated requirement rather than a nicety: an unreachable media URL yields a manifest entry
without media and does not throw; a rate-limited response fails without aborting the run;
one source erroring leaves another source's results intact; a missing or wrong auth token
returns unauthorized and performs no sync.

**Prior art.** The existing Raindrop scaffold script is the reference for pagination and
error handling, and the checked-in Raindrop dump is the fixture source for realistic
payloads — it is a real collection response, so tests built on it exercise the shapes that
actually occur rather than invented ones.

**End to end, done by hand once.** Saving an item in Raindrop and confirming it reaches the
manifest within minutes is a manual verification, not an automated test; automating a
third-party webhook round-trip costs more than it returns here.

## Out of Scope

- **An admin UI for managing content.** Wrangler and direct bucket access are sufficient.
- **Real-time sync.** Webhook-driven plus daily cron is near-real-time enough.
- **An image transformation pipeline.** No resizing or format conversion; Cloudflare's
  built-in image handling or a size constraint at upload covers this volume.
- **Automatic deletion propagation.** Deliberately excluded; see Implementation Decisions.
- **Automatic deduplication of cross-posted items.** Manual cleanup instead.
- **Cosmos.so.** No public API; dropped entirely rather than stubbed.
- **A category taxonomy.** Not part of the shipped item type; would require a change owned
  by the canvas workstream.
- **Recovering the 52 already-dead covers.** Related but separate: it needs a Raindrop
  re-fetch, not a sync pipeline.
- **The Cloudinary migration itself.** Planned, sequenced after the pipeline is stable, and
  executed as a one-time job.
- **Concurrency control on manifest writes.** A webhook and a cron run could in principle
  race; at this volume and frequency the risk is accepted, with a bucket-based lock as the
  known remedy if it ever bites.
