---
date: 2026-04-19
topic: content-pipeline
---

# Content Pipeline

## Problem Frame

Moodboard content is currently scattered across Raindrop.io, Are.na, and Cosmos.so, with images hosted on Cloudinary. This fragmentation makes the collection hard to maintain and couples the site to multiple third-party APIs at render time. The goal is to consolidate all content into Cloudflare R2 as the canonical store, with automated sync from each source.

## Requirements

**Canonical Store**

- R1. All moodboard content (media files and metadata) is stored in Cloudflare R2.
- R2. A JSON manifest in R2 contains normalized metadata for all items, conforming to the shared TypeScript moodboard item interface. This interface is defined in the moodboard canvas workstream; the content pipeline implements it but does not own its definition.
- R3. Media files (images, GIFs, videos/thumbnails) are stored as R2 objects alongside the manifest.

**Sync Worker**

- R4. A single Cloudflare Worker with per-source route handlers: `/sync/raindrop`, `/sync/arena`, `/sync/cosmos`, `/sync/all`.
- R5. Each route handler fetches items from its source API, normalizes them to the shared item interface, downloads media to R2, and updates the manifest.
- R6. Sync is idempotent — re-running does not create duplicates. Items are matched by a composite key of source platform + platform-specific ID. If an existing item's metadata has changed at the source, the manifest entry is updated in place.
- R7. New items are appended to the manifest. Deleted items at the source are not automatically removed (manual cleanup preferred at this volume).

**Sync Triggers**

- R8. IFTTT (or Zapier) applets fire webhooks to the worker endpoints when new items are saved. The existing Raindrop IFTTT applet is adapted by changing its action from "send message" to "make web request." Sources without IFTTT/Zapier triggers fall back to cron-only sync (R9).
- R9. An optional Cron Trigger (e.g., daily) calls `/sync/all` as a catch-all for any items missed by webhooks.
- R10. Manual invocation via Wrangler CLI or direct HTTP request is also supported.

**Data Normalization**

- R11. Each source's raw data is normalized to the shared TypeScript interface: id, title, description, date, category/tags, content type (image/video/markdown/gif), media URL (R2 path), and source metadata (original URL, source platform).
- R12. Categories and tags are normalized across sources (e.g., mapping Are.na "channels" and Raindrop "collections" to a unified tag vocabulary).

**Cloudinary Migration**

- R13. Existing Cloudinary-hosted assets used elsewhere on the site are migrated to R2 as a one-time operation. After migration, the site reads media from R2 instead of Cloudinary.

## Success Criteria

- Content from all three sources lands in R2 in a unified format.
- The moodboard page can read from R2 without knowing which source an item came from.
- Adding a new item in Raindrop results in it appearing in R2 within minutes (via IFTTT webhook).
- The sync worker handles partial failures gracefully (one source failing doesn't block others).

## Scope Boundaries

- No admin UI for managing R2 content — Wrangler CLI and direct R2 access are sufficient.
- No real-time sync — near-real-time via webhooks and daily cron is sufficient.
- No image transformation pipeline (resizing, format conversion) — Cloudflare's built-in image optimization or simple size constraints on upload are sufficient at this volume.
- Cloudinary migration (moving existing assets out) is part of this workstream but is a one-time operation, not an ongoing sync. See R13.

## Key Decisions

- **Single worker with route handlers over one worker per source:** Simpler deployment and configuration at this scale. Each source is just a route, not a separate service.
- **R2 as canonical store over build-time API federation:** Decouples the site from third-party API availability and rate limits. Content persists even if a source goes away.
- **IFTTT webhooks as primary trigger:** Leverages existing IFTTT integration. Low-effort automation that matches the content volume.

## Dependencies / Assumptions

- Cloudflare account with Workers and R2 access.
- API keys/tokens for Raindrop.io, Are.na, and Cosmos.so.
- IFTTT (free tier) supports webhook actions for all three sources. Verify Are.na and Cosmos.so have IFTTT triggers — if not, those fall back to cron-only sync.
- The shared TypeScript moodboard item interface is defined in the moodboard canvas workstream and used here as the normalization target.
- Content volume is low (handful of items per week, low hundreds total). The worker does not need to handle large batch imports.

## Outstanding Questions

### Deferred to Planning

- [Affects R4][Needs research] Are.na and Cosmos.so API authentication and rate limits — what's available?
- [Affects R8][Needs research] Do Are.na and Cosmos.so have IFTTT/Zapier triggers? If not, cron-only sync for those sources.
- [Affects R3][Technical] R2 bucket structure — flat namespace with prefixed keys vs. folder-like hierarchy.
- [Affects R12][User decision] Unified tag vocabulary — what categories should items be normalized into? (Reuse the mockup's: web, typography, illustration, photography, motion? Or different?)
- [Affects R6][Technical] How to handle items that exist in multiple sources (cross-posted). Deduplicate by URL, or allow duplicates with different source metadata?

## Next Steps

-> `/ce:plan` for structured implementation planning
