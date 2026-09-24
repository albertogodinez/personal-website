---
title: "feat: Content sync pipeline (Cloudflare Worker + R2)"
type: feat
status: active
date: 2026-04-19
origin: docs/brainstorms/2026-04-19-content-pipeline-requirements.md
---

# Content Sync Pipeline

## Overview

Build a Cloudflare Worker that syncs moodboard content from Raindrop.io and Are.na into Cloudflare R2 as the canonical store. A shared JSON manifest in R2 conforms to the TypeScript moodboard item interface defined in the moodboard canvas workstream. IFTTT webhooks trigger Raindrop syncs; Are.na syncs via daily cron. Cosmos.so is dropped from scope (no public API).

## Problem Frame

Moodboard content is scattered across Raindrop.io and Are.na, with images on Cloudinary. This couples the site to multiple third-party APIs and makes the collection hard to maintain. Consolidating into R2 decouples the site from source availability and provides a single, unified data layer. (see origin: `docs/brainstorms/2026-04-19-content-pipeline-requirements.md`)

## Requirements Trace

- R1. All moodboard content stored in Cloudflare R2
- R2. JSON manifest conforms to shared TypeScript moodboard item interface
- R3. Media files stored as R2 objects
- R4. Single Worker with route handlers: `/sync/raindrop`, `/sync/arena`, `/sync/all`
- R5. Each handler fetches, normalizes, downloads media, updates manifest
- R6. Idempotent sync via composite key (source platform + platform ID); updates in place
- R7. New items appended; deletions not auto-synced
- R8. IFTTT webhook triggers Raindrop sync; Are.na falls back to cron (no IFTTT trigger available)
- R9. Daily Cron Trigger calls `/sync/all`
- R10. Manual invocation via Wrangler or HTTP
- R11. Normalize to shared interface: id, title, description, date, category/tags, content type, media URL, source metadata
- R12. Unified tag vocabulary: web, typography, illustration, photography, motion
- R13. One-time Cloudinary migration to R2

## Scope Boundaries

- No admin UI — Wrangler CLI and direct R2 access
- No real-time sync — webhooks + daily cron
- No image transformation pipeline
- Cosmos.so dropped (no public API or IFTTT integration)

### Deferred to Separate Tasks

- Cloudinary migration (R13): one-time script, planned but executed after pipeline is stable

## Context & Research

### Relevant Code and Patterns

- `src/content/moodboard/raindrop-collection.json` — existing Raindrop data dump (5,700+ lines), shows item structure
- `src/scripts/scaffold-raindrop.js` — existing Raindrop fetch script, reference for pagination and error handling
- `src/content.config.ts` — content collection schema definitions (favorites, experience)
- `src/components/Card.tsx` — Cloudinary URL generation pattern (`@cloudinary/url-gen`)
- `.env` — `CLOUDINARY_URL`, `PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_SECRET`

### API Research Findings

**Raindrop.io:**
- Auth: OAuth 2.0 or test token (never expires, personal use)
- Rate limit: 120 requests/min
- Endpoint: `GET /rest/v1/raindrops/{collectionId}` — max 50 per page
- IFTTT: 9 triggers available including "New item" and "New item tagged"
- Item fields: `_id`, `title`, `excerpt`, `tags`, `type`, `cover`, `created`, `link`, `domain`, `file`

**Are.na:**
- Auth: Personal access token via `Authorization: Bearer`
- Rate limit: 120 requests/min (free tier)
- Endpoint: `GET /v2/channels/{slug}` — max 100 per page
- No IFTTT/Zapier triggers — cron-only sync
- Block types: Image, Link, Media (video), Text, Attachment — each with `image` object containing `thumb`, `display`, `large`, `original` URLs

**Cosmos.so:**
- No public API, no IFTTT — dropped from scope

### External References

- Cloudflare Workers docs: `developers.cloudflare.com/workers/`
- Cloudflare R2 API: `developers.cloudflare.com/r2/api/workers/`
- Raindrop API: `developer.raindrop.io`
- Are.na API: `dev.are.na/documentation`

## Key Technical Decisions

- **Cosmos dropped:** No public API or IFTTT. Route removed from scope entirely.
- **R2 bucket structure:** Flat namespace with prefixed keys — `media/{source}-{id}.{ext}` for files, `manifest.json` at root. Simple, no nested hierarchy needed at this volume.
- **Manifest as single JSON file:** At low hundreds of items, a single `manifest.json` is simpler than individual item files. The Worker reads it, appends/updates, and writes it back. No concurrency concern at this volume (one sync at a time).
- **Composite key format:** `{source}:{platformId}` (e.g., `raindrop:872677513`, `arena:3235876`). Used as the item `id` in the manifest.
- **Category mapping:** Items are tagged with one of five categories: web, typography, illustration, photography, motion. Source-specific tags are preserved in a separate `tags` array. Category assignment uses a keyword-based mapping from source tags; unmatched items default to a configurable fallback.
- **Cross-posted items:** Allowed as duplicates with different source metadata. The composite key ensures they don't collide. At this volume, manual dedup is fine.
- **Raindrop test token over OAuth:** For personal use, the never-expiring test token avoids refresh flow complexity.
- **Video handling:** Store thumbnail images in R2, not video files. YouTube/Vimeo URLs stored as metadata. The moodboard canvas renders embeds via drei `<Html>`.

## Open Questions

### Resolved During Planning

- **Are.na IFTTT triggers?** No — cron-only sync confirmed.
- **Cosmos.so API?** No public API — dropped from scope.
- **Unified categories?** Reuse mockup's five: web, typography, illustration, photography, motion.
- **Cross-posted item handling?** Allow duplicates with different composite keys.

### Deferred to Implementation

- Exact keyword-to-category mapping rules (needs analysis of existing Raindrop tags)
- Are.na channel slug(s) to sync — which channels contain moodboard content
- Cloudinary asset audit for R13 migration — which assets are used where

## Output Structure

```
workers/
  moodboard-sync/
    src/
      index.ts              # Worker entry, router
      sources/
        raindrop.ts         # Raindrop fetch + normalize
        arena.ts            # Are.na fetch + normalize
      lib/
        manifest.ts         # Read/write/update manifest in R2
        media.ts            # Download and store media in R2
        normalize.ts        # Shared normalization utilities
    wrangler.toml           # Worker config, R2 binding, cron trigger
    package.json
    tsconfig.json
src/
  types/
    moodboard.ts            # Shared TypeScript interface (consumed by both worker and site)
```

## Implementation Units

- [ ] **Unit 1: Define shared TypeScript moodboard item interface**

  **Goal:** Create the canonical type definition that both the sync worker and the moodboard canvas page consume.

  **Requirements:** R2, R11

  **Dependencies:** None

  **Files:**
  - Create: `src/types/moodboard.ts`

  **Approach:**
  - Define `MoodboardItem` interface with fields: `id` (composite key), `title`, `description`, `date`, `category` (one of the five), `tags` (string array), `contentType` (image/video/gif/markdown), `mediaUrl` (R2 path or external URL for video), `sourceMetadata` (original URL, source platform)
  - Define `MoodboardCategory` union type: `'web' | 'typography' | 'illustration' | 'photography' | 'motion'`
  - Define `ContentType` union type: `'image' | 'video' | 'gif' | 'markdown'`
  - Export `MoodboardManifest` type as `{ items: MoodboardItem[]; lastSync: string; }`

  **Patterns to follow:**
  - Existing type patterns in `src/content.config.ts`

  **Test scenarios:**
  - Happy path: Type-check passes when constructing a `MoodboardItem` with all required fields
  - Edge case: Type error when `category` is not one of the five allowed values
  - Edge case: Type error when `contentType` is not one of the four allowed values

  **Verification:**
  - `astro check` passes with no type errors
  - Both the worker and the site can import from this module

- [ ] **Unit 2: Scaffold Worker project with R2 binding and router**

  **Goal:** Create the Cloudflare Worker project with Wrangler config, R2 bucket binding, route handler skeleton, and cron trigger.

  **Requirements:** R4, R9, R10

  **Dependencies:** Unit 1

  **Files:**
  - Create: `workers/moodboard-sync/wrangler.toml`
  - Create: `workers/moodboard-sync/package.json`
  - Create: `workers/moodboard-sync/tsconfig.json`
  - Create: `workers/moodboard-sync/src/index.ts`

  **Approach:**
  - `wrangler.toml`: name the worker `moodboard-sync`, bind R2 bucket as `MOODBOARD_BUCKET`, define cron trigger for daily `/sync/all`
  - Router in `index.ts`: match `POST /sync/raindrop`, `POST /sync/arena`, `POST /sync/all`, return 404 for unknown routes
  - Cron handler: calls the `/sync/all` logic directly
  - All routes return JSON response with sync result summary
  - Include basic auth token check on sync routes (env var `SYNC_AUTH_TOKEN`) to prevent unauthorized triggers

  **Patterns to follow:**
  - Cloudflare Workers routing patterns from docs

  **Test scenarios:**
  - Happy path: `wrangler dev` starts and responds to `POST /sync/raindrop` with a stub response
  - Happy path: Unknown routes return 404
  - Error path: Request without auth token returns 401
  - Happy path: Cron trigger invokes sync-all logic

  **Verification:**
  - `wrangler dev` starts without errors
  - All route handlers respond with correct status codes

- [ ] **Unit 3: Manifest read/write utilities**

  **Goal:** Implement R2 manifest operations — read, append, update-in-place, write.

  **Requirements:** R2, R5, R6, R7

  **Dependencies:** Unit 1, Unit 2

  **Files:**
  - Create: `workers/moodboard-sync/src/lib/manifest.ts`

  **Approach:**
  - `getManifest(bucket)`: fetch `manifest.json` from R2, parse, return typed `MoodboardManifest`. Return empty manifest if not found.
  - `putManifest(bucket, manifest)`: serialize and write to R2.
  - `upsertItem(manifest, item)`: find by composite `id`. If exists, update metadata in place. If new, append. Return updated manifest.
  - Update `lastSync` timestamp on every write.

  **Patterns to follow:**
  - R2 `get`/`put` API from Cloudflare Workers docs

  **Test scenarios:**
  - Happy path: `getManifest` returns empty manifest when `manifest.json` doesn't exist in R2
  - Happy path: `upsertItem` appends a new item, increases array length by 1
  - Happy path: `upsertItem` with existing ID updates metadata, array length unchanged
  - Edge case: `upsertItem` preserves all other items when updating one
  - Happy path: `putManifest` writes valid JSON that `getManifest` can read back

  **Verification:**
  - Round-trip: write manifest → read manifest → items match

- [ ] **Unit 4: Media download utility**

  **Goal:** Download media files from source URLs and store in R2 with consistent key naming.

  **Requirements:** R3

  **Dependencies:** Unit 2

  **Files:**
  - Create: `workers/moodboard-sync/src/lib/media.ts`

  **Approach:**
  - `downloadAndStoreMedia(bucket, sourceUrl, itemId)`: fetch source URL, determine extension from content-type header, store as `media/{itemId}.{ext}` in R2, return R2 key
  - Skip download if R2 key already exists (idempotent)
  - For video items, download thumbnail only (not the video file). Store YouTube/Vimeo URL in manifest metadata.
  - Handle fetch failures gracefully — log error, return null, allow sync to continue without media

  **Patterns to follow:**
  - Cloudflare Workers `fetch` + R2 `put` with body streaming

  **Test scenarios:**
  - Happy path: Image URL downloaded and stored with correct key format `media/{id}.{ext}`
  - Happy path: Existing media key skips re-download
  - Error path: Unreachable source URL returns null, does not throw
  - Edge case: Content-type header maps correctly (image/jpeg → .jpg, image/png → .png, image/gif → .gif)

  **Verification:**
  - Media objects appear in R2 with expected keys
  - Failed downloads don't block the sync

- [ ] **Unit 5: Raindrop source handler**

  **Goal:** Fetch items from Raindrop.io API, normalize to shared interface, sync media and manifest.

  **Requirements:** R4, R5, R6, R8, R11, R12

  **Dependencies:** Unit 3, Unit 4

  **Files:**
  - Create: `workers/moodboard-sync/src/sources/raindrop.ts`

  **Approach:**
  - Fetch paginated results from `GET /rest/v1/raindrops/{collectionId}` (50 per page) using test token
  - Normalize each item: `_id` → `raindrop:{_id}`, `title`, `excerpt` → description, `created` → date, `type` → contentType mapping, `cover` → download to R2
  - Category assignment: map Raindrop `tags` to one of five categories via keyword matching. Default to first tag or 'web' if no match.
  - For each item: download media, upsert into manifest
  - Return sync summary (added count, updated count, errors)

  **Patterns to follow:**
  - Pagination pattern from existing `src/scripts/scaffold-raindrop.js`
  - Raindrop item structure from `src/content/moodboard/raindrop-collection.json`

  **Test scenarios:**
  - Happy path: Fetches all pages of a collection and normalizes each item
  - Happy path: Items with `type: "image"` get contentType `"image"`, `type: "video"` → `"video"`
  - Happy path: Re-running sync with unchanged data produces zero new items (idempotent)
  - Happy path: Re-running sync with a changed title updates the manifest entry
  - Edge case: Item with no tags gets default category
  - Error path: API rate limit (429) is handled with retry or graceful failure
  - Error path: Single item fetch failure doesn't abort the entire sync

  **Verification:**
  - Manifest contains all items from the Raindrop collection
  - Media files in R2 match manifest `mediaUrl` paths

- [ ] **Unit 6: Are.na source handler**

  **Goal:** Fetch blocks from Are.na channel(s), normalize, sync media and manifest.

  **Requirements:** R4, R5, R6, R11, R12

  **Dependencies:** Unit 3, Unit 4

  **Files:**
  - Create: `workers/moodboard-sync/src/sources/arena.ts`

  **Approach:**
  - Fetch paginated blocks from `GET /v2/channels/{slug}` (100 per page) using personal access token
  - Normalize each block: `id` → `arena:{id}`, `title`, `description`, `created_at` → date, `class` → contentType mapping (Image → image, Media → video, Text → markdown), image URLs from `image.original` or `image.large`
  - Category assignment: use Are.na channel name or block metadata for keyword matching, same rules as Raindrop
  - For Image blocks: download to R2. For Text blocks: store content as markdown in manifest. For Media blocks: store thumbnail + embed URL.

  **Patterns to follow:**
  - Same normalize/upsert pattern as Raindrop handler

  **Test scenarios:**
  - Happy path: Fetches all pages of a channel and normalizes Image, Text, and Media blocks
  - Happy path: Text blocks normalize to contentType `"markdown"` with content preserved
  - Happy path: Image blocks have media downloaded to R2
  - Happy path: Re-running is idempotent
  - Edge case: Block with missing image data is skipped gracefully
  - Error path: API rate limit handled

  **Verification:**
  - Manifest contains items from Are.na with correct composite keys
  - Different block types are correctly mapped to content types

- [ ] **Unit 7: IFTTT webhook integration and cron trigger**

  **Goal:** Wire up IFTTT webhook to trigger Raindrop sync, configure daily cron for all sources.

  **Requirements:** R8, R9

  **Dependencies:** Unit 5, Unit 6

  **Files:**
  - Modify: `workers/moodboard-sync/wrangler.toml` (verify cron config)
  - Modify: `workers/moodboard-sync/src/index.ts` (verify cron handler)

  **Approach:**
  - IFTTT side: modify existing Raindrop applet — change action from "Send message" to "Make a web request" targeting `POST https://{worker-url}/sync/raindrop` with auth token header
  - Cron handler already wired in Unit 2 — verify it calls both Raindrop and Are.na sync sequentially, continues if one fails
  - Partial failure handling: each source syncs independently, errors logged but not propagated across sources

  **Patterns to follow:**
  - IFTTT webhook action configuration

  **Test scenarios:**
  - Happy path: IFTTT webhook POST to `/sync/raindrop` triggers a successful sync
  - Happy path: Cron trigger syncs both sources; summary shows counts for each
  - Error path: Raindrop sync fails but Are.na sync still runs and succeeds
  - Error path: Invalid auth token returns 401, sync does not execute

  **Verification:**
  - Save an item in Raindrop → appears in R2 manifest within minutes
  - Daily cron runs without manual intervention

## System-Wide Impact

- **Interaction graph:** Worker writes to R2; site reads from R2 at build time or via fetch. No direct coupling between worker and site code beyond the shared type definition.
- **Error propagation:** Source failures are isolated per-handler. Manifest is only written after successful processing, so a failed sync leaves the previous manifest intact.
- **State lifecycle risks:** Concurrent IFTTT webhook and cron trigger could race on manifest write. At this volume and frequency, the risk is negligible. If it ever matters, add a simple R2-based lock.
- **API surface parity:** The shared `MoodboardItem` type is the contract. Changes to it affect both the worker and the moodboard canvas page.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Raindrop test token revoked or API changes | Monitor sync failures; test token is stable for personal use |
| Are.na rate limit hit during large initial sync | Paginate with delay between requests; 120 req/min is generous for low hundreds of items |
| R2 manifest corruption from partial write | Worker writes complete manifest atomically (R2 put is atomic) |
| IFTTT free tier limitations | Free tier supports the webhook action; monitor for plan changes |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-04-19-content-pipeline-requirements.md](docs/brainstorms/2026-04-19-content-pipeline-requirements.md)
- Related code: `src/scripts/scaffold-raindrop.js`, `src/content/moodboard/raindrop-collection.json`
- Raindrop API: `developer.raindrop.io`
- Are.na API: `dev.are.na/documentation`
- Cloudflare R2 Workers API: `developers.cloudflare.com/r2/api/workers/`
