# ✨ Framework Migration Evaluation: TanStack Start + Cloudflare + Local-First Real-Time

## Overview

This plan evaluates migrating this personal website from **Astro on Netlify** to **TanStack Start on Cloudflare**, with a survey of local-first / real-time data tools. It does not commit to migration — it provides the research and decision framework needed to choose the right path.

**Key question before any migration can be planned:** What is the real-time feature? The current site is entirely read-only. No user can write data, no content changes faster than a deployment, and there is no multi-user scenario. Any tooling choice depends on the answer.

---

## Problem Statement & Motivation

- The owner wants **real-time features** and believes Astro may limit this
- The owner wants to move from **Netlify to Cloudflare**
- The owner is interested in **local-first architecture** (ElectricSQL, InstantDB, Zero, etc.)
- This requires evaluating whether migration is necessary, or whether Astro can be extended

### Defined Real-Time Feature

**Feature:** Presence + ephemeral stickers/text overlay
- See who else is viewing the site (live visitor count or avatars)
- Visitors can place emoji stickers or text snippets on the page
- These disappear after a session ends (no persistence needed)
- All visitors see the same stickers/text in real-time

**Technical requirements:**
- WebSocket or similar for low-latency sync
- Structured reactive state (x/y coordinates, emoji/text, userId)
- No database needed — ephemeral in-memory state is fine
- Works on Cloudflare

**Recommended stack for this feature:** PartyKit + TinyBase (see Scenario C below)

---

## Current Architecture

### Pages

| Page | Route | Rendering | Data Source |
|---|---|---|---|
| Home | `/` | SSG (static) | `getCollection('experience')` — JSON files |
| Memorabilia | `/memorabilia` | SSG + client React | `getCollection('favorites')` — Markdown files |
| Moodboard | `/moodboard` | SSG | Raindrop API fetch at build time |
| 404 | `/404` | SSG | Static |

### Components

| Component | Type | Notes |
|---|---|---|
| `Nav.astro` | Astro | Deepest Astro coupling. Uses `transition:persist`, `astro:page-load`, `navigate()` from `astro:transitions/client`, DOM manipulation |
| `BaseLayout.astro` | Astro | ViewTransitions, slot |
| `RaindropWrapper.astro` | Astro | Build-time fetch to Raindrop API |
| `Experience.tsx` | React (`client:only`) | Radix Accordion. Receives 3 props, uses only `allExperience` |
| `FavoritesCollectionHandler.tsx` | React (`client:load`) | Filters favorites by type + year from nanostores |
| `SelectionHandler.tsx` | React (`client:load`) | Radix Dialog + Select for filter picks |
| `Card.tsx` | React | Cloudinary image URL built client-side |
| `GradientBackground.tsx` | React | Mouse-tracking bubble effect |
| `SelectWrapper.tsx` | React | Wraps Radix Select |

### State Management

Two nanostores atoms in `src/functionalityStore.ts`:
- `selectedFavoriteType` — which category of favorite (games, sneakers, etc.)
- `selectedYear` — which year to filter by

Filters are **not URL-persisted** — refresh resets to empty. No "clear filter" mechanism exists.

### Data Collections

| Collection | Format | Location | Entries |
|---|---|---|---|
| `experience` | JSON | `src/content/experience/work/` | 5 entries (Twitter, Expedia, IBM, TRS, SoleSavy) |
| `favorites` | Markdown | `src/content/favorites/` | 2 entries (TOTK game, cement-three sneaker) |
| `moodboard` | JSON | `src/content/moodboard/` | `raindrop-collection.json` (never read — dead artifact) |

> **Note:** `src/scripts/scaffold-raindrop.js` writes `raindrop-collection.json` but `RaindropWrapper.astro` never reads it — it fetches the Raindrop API directly at build time. The scaffold script produces dead output.

### Known Gaps in Current Site

- 9 favorite types defined, only 2 have content — selecting others shows an empty list with no message
- `YEARS` constant doesn't include 2025 or 2026
- `workExperience` and `projectExperience` props passed to `Experience.tsx` but never rendered
- Footer date is hardcoded as "Oct. 26th, 2024" — `NETLIFY_BUILD_TIME` is read but never used in template
- No CI/CD configuration (`netlify.toml`, GitHub Actions, `wrangler.toml`)
- `cacheOnDemandPages: true` in Netlify adapter is a no-op since `output: 'static'`

### Migration Difficulty Ranking (most → least disruptive)

1. **Nav component** — Full rewrite required. All Astro-specific APIs (`transition:persist`, `navigate()`, `astro:page-load`) must be replaced with React Router hooks + `useEffect`
2. **Moodboard / Raindrop fetch** — Build-time Astro frontmatter fetch → TanStack Start route `loader` or `createServerFn`
3. **Content collections** — Astro's `getCollection()` → direct JSON/Markdown imports in loaders
4. **ViewTransitions** — Astro `<ViewTransitions />` → native View Transitions API via `document.startViewTransition()` or Framer Motion
5. **nanostores → React state** — Easy. Two atoms become `useState` / `useSearchParams` (if URL-persisted)
6. **Cloudinary** — Rename `PUBLIC_CLOUDINARY_CLOUD_NAME` → `VITE_CLOUDINARY_CLOUD_NAME` (Astro uses `PUBLIC_*` prefix, TanStack Start uses Vite's `VITE_*` convention)
7. **CSS** — Fully portable. Plain CSS with no Astro-specific syntax
8. **Radix UI** — Already React. Zero changes needed

---

## Framework Analysis

### TanStack Start

**What it is:** A full-stack React framework built on [TanStack Router](https://tanstack.com/router/latest) and [Vinxi](https://vinxi.vercel.app). File-based routing with typed routes, server functions, SSR/streaming, and deep TanStack Query integration.

**Status (early 2026):** v1.0 released or approaching release. The underlying TanStack Router has been stable for some time; Start adds the server layer on top. Production-ready for early adopters.

**Routing model:**
```
routes/
  __root.tsx          ← root layout (like BaseLayout.astro)
  index.tsx           ← /
  memorabilia.tsx     ← /memorabilia
  moodboard.tsx       ← /moodboard
  $404.tsx            ← 404 handler
```

Each route file exports a `Route` created with `createFileRoute()`. Loaders run on the server (or client for client-only data), and the result is type-safe and available to the component.

**Server functions (`createServerFn`):**
```ts
// Replaces RaindropWrapper.astro build-time fetch
const getRaindropItems = createServerFn().handler(async () => {
  const res = await fetch(`${process.env.RAINDROP_ENDPOINT}/${process.env.RAINDROP_ID}`, {
    headers: { Authorization: `Bearer ${process.env.RAINDROP_TOKEN}` }
  })
  return res.json()
})
```
Server functions are typed RPC calls — the client calls them like normal async functions, but they run on the server. Secrets stay server-side.

**State management:** TanStack Query is the primary async state primitive. For synchronous UI state (like the current nanostores filters), `useSearchParams` (URL-persisted) or React `useState` are idiomatic.

**SSR + streaming:** Full support. Routes can be loaders-only (SSR data) or deferred/streamed with `defer()`.

**SSG:** Supported via `prerender` export on routes. Hybrid (some static, some SSR) is straightforward.

**Cloudflare deployment:**
- Uses the `cloudflare-pages` preset in `app.config.ts` / `vite.config.ts`
- Binds to `getWebRequest()` context to access `env.DB`, `env.KV`, etc.
- Edge runtime compatible — no Node.js APIs by default

**Real-time:** TanStack Start has no built-in WebSocket or SSE primitive. Real-time requires a separate layer (PartyKit, Durable Objects, ElectricSQL shapes, etc.). The advantage over Astro is that it's a persistent server process rather than serverless functions, making long-lived connections more natural.

**Bundle size trade-off:** Every page ships a full React runtime. A home page that is purely content-display is heavier than the Astro equivalent, which ships zero JS by default.

---

### Astro's Real-Time Capabilities (Often Underestimated)

Astro is commonly described as "not real-time capable" but this is not entirely accurate:

**What Astro CAN do:**
- **SSE (Server-Sent Events):** An Astro API endpoint can return `text/event-stream`. On Cloudflare, this works via Workers as long as you use `TransformStream` — Cloudflare Workers support streaming responses.
- **WebSockets:** Not supported natively in Astro endpoints, but a **separate Cloudflare Worker** can handle WebSockets via Durable Objects, while Astro pages connect to it as an external service. This is the "bolt-on" pattern.
- **PartyKit:** Works with any frontend. An Astro page can import `partysocket` and connect to a PartyKit server. Zero Astro changes needed.
- **ElectricSQL:** The `useShape()` hook works in any React component — including Astro islands. An Astro page with `client:load` React islands can use ElectricSQL shapes for live-updating data.
- **InstantDB:** Same — `useQuery()` in a React island in an Astro page works fine.
- **Hybrid output:** With `@astrojs/cloudflare` adapter, Astro supports `output: 'hybrid'` — most pages are static CDN-served, only specific pages/endpoints are Workers-rendered.

**What Astro genuinely cannot do easily:**
- Persistent WebSocket connections in Astro endpoint handlers (serverless functions time out)
- Long-running background processes
- Stateful server-side logic across requests without Durable Objects
- First-class TypeScript type safety across data boundaries (TanStack Router is significantly better here)

**Bottom line:** If the real-time feature is read-only sync (ElectricSQL shapes, InstantDB `useQuery`) or multiplayer via PartyKit, Astro can support it without migration. Migration to TanStack Start makes more sense when the site becomes significantly more app-like (authenticated users, complex mutations, deeply typed data flows).

---

## Local-First Tools Survey

"Local-first" means data is stored and queryable on the client (SQLite, IndexedDB, in-memory), writes happen locally and sync to a server, and the app works offline. The original definition (Kleppmann et al., 2019) emphasizes: data ownership, offline capability, real-time sync, and collaboration without lock-in. Reference: https://www.inkandswitch.com/local-first/

> **Important context for this site:** A personal portfolio with no user accounts, no writable user data, and no multi-user scenario is not a natural fit for local-first architecture. These tools shine when users own data they generate. Evaluate them based on what features you intend to add, not the current site.

---

### ElectricSQL (v2 / Electric)

**Repo:** https://github.com/electric-sql/electric
**Docs:** https://electric-sql.com/docs

**Architecture:** Postgres → Electric sync service → client via HTTP "shapes". A "shape" is a live subscription to a subset of a Postgres table (e.g., `SELECT * FROM bookmarks WHERE user_id = ?`). The client polls or streams shape changes via HTTP long-polling. No WebSocket required.

**Key API:**
```ts
import { useShape } from '@electric-sql/react'

function MoodboardLive() {
  const { data } = useShape({
    url: 'https://your-electric-server/v1/shape',
    params: { table: 'bookmarks', where: `collection_id='${MOODBOARD_ID}'` }
  })
  return data.map(item => <img src={item.cover} alt={item.title} />)
}
```

**Cloudflare compatibility:** Excellent. Electric v2 is stateless HTTP — it can be proxied through a Cloudflare Worker or called directly from Pages. No Durable Objects needed.

**Database required:** PostgreSQL only (Neon, Supabase, or self-hosted).

**Self-hostable:** Yes. Docker compose or Electric Cloud (managed).

**Use case for this site:** Replace the build-time Raindrop fetch with a live Postgres table that syncs to the client. When you add a new Raindrop bookmark, it appears on the page without a redeploy.

**Maturity:** Production-ready. Used in production by several companies.

**Limitations:** Requires Postgres. Read-only sync on the client (writes go through your own API). v1 (with PGlite) was complex; v2 simplified to HTTP shapes.

---

### InstantDB

**Repo:** https://github.com/instantdb/instant
**Docs:** https://www.instantdb.com/docs

**Architecture:** Firebase-style realtime database with a local-first twist. Data is synced to the client via WebSockets and cached in IndexedDB. Writes are optimistic (applied locally immediately, synced to server).

**Key API:**
```ts
import { init, useQuery, tx } from '@instantdb/react'

const db = init({ appId: 'your-app-id' })

function Guestbook() {
  const { data } = db.useQuery({ messages: {} })
  const addMessage = (text: string) =>
    db.transact(tx.messages[id()].update({ text, createdAt: Date.now() }))
  return /* ... */
}
```

**Cloudflare compatibility:** Limited. InstantDB is a managed SaaS service — you connect to their servers, not self-host. Your Cloudflare app just imports the client SDK. No Cloudflare-native integration.

**Self-hostable:** No. Managed SaaS only.

**Use case for this site:** Guestbook, comments, or any feature where visitors write small amounts of data that others see in real-time.

**Maturity:** Production-ready, active development, well-regarded in the indie hacker community.

**Limitations:** No Postgres backing (own store). Cannot self-host. Free tier has limits.

---

### Zero (by Rocicorp)

**Repo:** https://github.com/rocicorp/mono
**Docs:** https://zerosync.dev

**Architecture:** Full relational sync engine. Postgres on the server, SQLite (via WASM) on the client. You write SQL queries; Zero keeps the client cache in sync. Supports offline writes with conflict resolution.

**Key API:**
```ts
const z = new Zero({ userID, auth, server, schema })
const { data } = useQuery(z.query.issues.where('status', '=', 'open').limit(100))
```

**Cloudflare compatibility:** Complex. Zero's sync server needs stateful WebSocket connections, which requires Cloudflare Durable Objects. This is non-trivial to self-host on Cloudflare.

**Self-hostable:** Yes, but complex. Requires running the Zero cache server.

**Use case for this site:** Overkill for a personal site, but excellent if it ever becomes a full app with relational data, filtering, and offline support.

**Maturity:** Early access / beta as of mid-2025. Actively developed. Not production-ready for general use.

**Limitations:** Most complex setup of all the options. Requires Postgres. Cloudflare deployment requires Durable Objects.

---

### PartyKit

**Repo:** https://github.com/partykit/partykit
**Docs:** https://docs.partykit.io

**Architecture:** WebSocket rooms running on Cloudflare Workers + Durable Objects. Each "room" (PartyServer class) is a Durable Object. Clients connect with `PartySocket`. No persistent database — state is in-memory (or you bring your own storage via `party.storage`).

**Key API:**
```ts
// Server (partykit server file)
export default class MyServer implements Party.Server {
  onMessage(message: string, sender: Party.Connection) {
    this.party.broadcast(message)
  }
}

// Client
import PartySocket from 'partysocket'
const socket = new PartySocket({ host: 'your-project.partykit.dev', room: 'main' })
socket.onmessage = (evt) => console.log(evt.data)
```

**Cloudflare compatibility:** Native. PartyKit IS Cloudflare Workers + Durable Objects, abstracted into a nice DX.

**Self-hostable:** No. Managed service by Cloudflare (PartyKit was acquired by Cloudflare). Free tier available.

**Use case for this site:** Live visitor presence (see who else is viewing), cursor sharing, real-time moodboard collaboration, live "what I'm listening to" indicator.

**Maturity:** Production-ready. Used by Storybook, Figma community tools, and others.

**Limitations:** In-memory state by default (use `party.storage` for persistence, which wraps Durable Object storage). Not for large structured data.

---

### Triplit

**Repo:** https://github.com/aspen-cloud/triplit
**Docs:** https://www.triplit.dev/docs

**Architecture:** TypeScript-first local-first database. Stores data in IndexedDB on client, syncs to a Triplit server. Schema-first with TypeScript types auto-generated. Supports offline writes.

**Key API:**
```ts
const client = new TriplitClient({ serverUrl, token, schema })
const { results } = useQuery(client, client.query('todos').where('done', '=', false))
```

**Cloudflare compatibility:** Partial. The Triplit sync server is a Node.js process — can be run on Workers but requires some adaptation.

**Self-hostable:** Yes.

**Use case for this site:** Best fit if you want a TypeScript-first local-first store without the Postgres requirement.

**Maturity:** Beta/early production. Smaller community than InstantDB.

---

### Liveblocks

**Docs:** https://liveblocks.io/docs

**Architecture:** SaaS platform for real-time collaboration features. Provides presence (who is online), live cursors, comments, notifications, and document sync (Yjs-based). Drop-in React hooks.

**Cloudflare compatibility:** SaaS — your app uses their client SDK regardless of where you deploy.

**Self-hostable:** No.

**Use case for this site:** If you want a guestbook with threaded comments and reactions, or want to show live cursors on the moodboard page.

**Maturity:** Production-ready, well-funded, widely used.

---

### TinyBase

**Repo:** https://github.com/tinyplex/tinybase
**Docs:** https://tinybase.org

**Architecture:** Reactive data store for structured data. Not a sync engine itself — it's a client-side reactive store with first-class PartyKit integration. You define tables and relationships, and TinyBase provides granular reactive subscriptions.

**Key API:**
```ts
import { createStore } from 'tinybase'
import { createPartyKitPersister } from 'tinybase/persisters/persister-partykit-client'

const store = createStore()
  .setTable('stickers', {
    sticker1: { x: 100, y: 200, emoji: '👋', userId: 'user123' }
  })

const persister = createPartyKitPersister(store, { host, room })
persister.startAutoSave()  // auto-syncs to PartyKit
persister.startAutoLoad()  // receives updates from PartyKit

// React hooks
const stickers = useTable('stickers', store)
```

**Cloudflare compatibility:** Excellent via PartyKit. TinyBase is just a client library — PartyKit handles the sync.

**Self-hostable:** Client library only. PartyKit handles server (CF-native).

**Use case for this site:** **Perfect for your stated feature** — presence + ephemeral stickers/text. TinyBase provides structured reactive data (stickers table with x/y/emoji/text), PartyKit syncs it across clients, zero persistence needed.

**Maturity:** Production-ready. 4+ years of development, well-documented.

**Limitations:** Not a full sync engine — needs a sync partner (PartyKit, WebSocket server, etc.). Ephemeral by default (no built-in persistence unless you add a persister).

---

### Comparison Table

| Tool | Backing DB | Self-host | Offline writes | Cloudflare native | Best for |
|---|---|---|---|---|---|
| ElectricSQL v2 | Postgres (required) | Yes | Via PGlite | Yes (stateless HTTP) | Read-heavy live sync from Postgres |
| InstantDB | Own store (SaaS) | No | Optimistic | No (SaaS SDK) | Firebase replacement, real-time writes |
| Zero | Postgres (required) | Yes (complex) | Yes (SQLite) | Partial (needs DOs) | Full relational sync, complex apps |
| PartyKit | In-memory / DO storage | No (CF-native) | N/A | Yes (built on CF) | Multiplayer, presence, chat |
| **TinyBase + PartyKit** | In-memory (ephemeral) | PartyKit only | N/A | Yes (via PartyKit) | **Structured ephemeral state, stickers, presence** |
| Triplit | Own store | Yes | Yes | Partial | TypeScript-first local-first |
| Liveblocks | Own store (SaaS) | No | Optimistic | No (SaaS SDK) | Collaboration, comments, cursors |

---

## Cloudflare Stack

### Services Overview

| Service | What it is | Use case |
|---|---|---|
| **Pages** | CDN-hosted static files + Workers for SSR | Deploy Astro or TanStack Start; static pages served from CDN, SSR pages from Workers |
| **Workers** | Serverless edge functions (V8 isolates) | API endpoints, SSR, proxies, auth middleware |
| **D1** | SQLite at the edge, replicated globally | App database — users, posts, bookmarks, guestbook entries |
| **KV** | Key-value store, eventually consistent | Sessions, feature flags, rate limit counters, cached API responses |
| **R2** | S3-compatible object storage | User uploads, video hosting (ocean.mp4 → R2), Cloudinary replacement |
| **Durable Objects** | Stateful Workers with WebSocket support | WebSocket rooms, real-time collaboration, PartyKit runs on these |
| **Queues** | Async message queue | Email sending, background jobs, delayed processing |
| **Hyperdrive** | Proxy to external Postgres | Reduces Neon/Supabase connection latency from Workers |
| **Workers AI** | ML models at edge | Image tagging, content moderation, embeddings |

### Recommended Architecture for This Site on Cloudflare

```
yourdomain.com
├── Cloudflare Pages
│   ├── / (CDN-served, zero Workers cost)
│   ├── /memorabilia (CDN-served static)
│   ├── /moodboard (SSR via Worker → reads KV cache or D1)
│   └── /api/guestbook (Worker endpoint → writes D1)
│
├── PartyKit / Durable Object (optional)
│   └── wss://party.yourdomain.com/presence → live visitor count
│
└── Storage
    ├── D1   → guestbook messages, bookmark cache
    ├── KV   → Raindrop API response cache (TTL: 1 hour)
    └── R2   → any uploaded media
```

### Accessing Cloudflare Bindings

**In Astro (`@astrojs/cloudflare` adapter):**
```ts
// src/pages/api/guestbook.ts
import type { APIContext } from 'astro'
export async function POST({ request, locals }: APIContext) {
  const db = locals.runtime.env.DB  // D1 binding
  const kv = locals.runtime.env.KV  // KV binding
}
```

**In TanStack Start (`cloudflare-pages` preset):**
```ts
// Accessed via getWebRequest() context or middleware
import { getWebRequest } from 'vinxi/http'
const { env } = getWebRequest().context  // CF bindings
```

### Auth on Cloudflare

Neither Netlify Auth nor Supabase Auth are needed. On Cloudflare:
- **Better Auth** (https://www.better-auth.com) — most actively maintained, Cloudflare D1 adapter, session cookies
- **Lucia Auth** (now a reference implementation, Better Auth is the successor)

---

## Framework + Deployment Comparison

| Capability | Astro + `@astrojs/cloudflare` | TanStack Start + CF Pages |
|---|---|---|
| Static pages | Excellent (CDN, zero Workers cost) | Good (SSG with `prerender`) |
| SSR pages | Good | Excellent |
| TypeScript DX | Good (Astro types) | Excellent (end-to-end router types) |
| Real-time (SSE) | Works via streaming Worker response | Works natively |
| Real-time (WebSockets) | Separate Worker / PartyKit only | Separate Worker / PartyKit only |
| ElectricSQL shapes | Works in React islands | Works natively |
| InstantDB | Works in React islands | Works natively |
| PartyKit client | Works in any JS | Works natively |
| D1 access | Yes (`locals.runtime.env.DB`) | Yes (via request context) |
| KV access | Yes | Yes |
| R2 access | Yes | Yes |
| Bundle size (content pages) | Minimal (islands only) | Full React bundle |
| Content collections | First-class | Manual (JSON imports + Zod) |
| Migration effort | Zero (already Astro) | High (rewrite) |
| Recommended when | Content-heavy, minimal interactivity | App-heavy, auth, complex mutations |

---

## Scenario-Based Recommendations

### Scenario A: Live Moodboard (Raindrop syncs without redeploy)

**Best approach with Astro:**
1. Add `@astrojs/cloudflare` adapter, switch to `output: 'hybrid'`
2. Mark `/moodboard` as `export const prerender = false`
3. Use a Cloudflare KV cache: fetch Raindrop on first request, cache for 1 hour
4. Add ElectricSQL if you move bookmarks to your own Postgres (D1 doesn't work with Electric — it requires standard Postgres)

**Best approach with TanStack Start:**
1. Same — the moodboard route uses a server loader with KV caching
2. Slightly better DX since the loader is co-located with the route

**Winner:** Either works. Astro requires less migration. TanStack Start has better type safety.

---

### Scenario B: Guestbook (visitors leave messages, seen in real-time)

**Best approach with Astro:**
1. Add a React island with InstantDB — visitors write messages via `transact()`, all see them via `useQuery()`
2. Or use D1 + a Cloudflare Worker endpoint for writes, and SSE for real-time push

**Best approach with TanStack Start:**
1. `createServerFn` for writes → D1
2. InstantDB or ElectricSQL for real-time client sync
3. Cleaner — server functions and client components are co-located

**Winner:** TanStack Start has cleaner architecture here, but the feature is entirely possible in Astro too.

---

### Scenario C: Presence + Ephemeral Stickers/Text (your stated feature)

**Best approach (either framework):**
- **PartyKit + TinyBase** is the perfect stack for this
- PartyKit server handles WebSocket connections + broadcasts state
- TinyBase provides structured reactive store (stickers table: `{ x, y, emoji, text, userId }`)
- `tinybase/persisters/persister-partykit-client` auto-syncs store to PartyKit
- Works identically in Astro (React island) or TanStack Start

**Implementation pattern:**
```ts
// PartyKit server (party/stickers.ts)
export default class StickersServer implements Party.Server {
  constructor(public party: Party.Party) {}

  onConnect(connection: Party.Connection) {
    // Broadcast current state to new connection
    connection.send(JSON.stringify(this.party.storage.get('stickers') || {}))
  }

  onMessage(message: string, sender: Party.Connection) {
    const stickers = JSON.parse(message)
    this.party.storage.put('stickers', stickers)
    this.party.broadcast(message, [sender.id])  // broadcast to others
  }
}

// Client component (React island or TanStack Start component)
import { createStore } from 'tinybase'
import { createPartyKitPersister } from 'tinybase/persisters/persister-partykit-client'
import { useTable, useAddRowCallback } from 'tinybase/ui-react'

function StickersOverlay() {
  const store = createStore().setTable('stickers', {})
  const persister = createPartyKitPersister(store, {
    host: 'your-project.partykit.dev',
    room: 'main'
  })
  persister.startAutoSave().startAutoLoad()

  const stickers = useTable('stickers', store)
  const addSticker = useAddRowCallback('stickers', (e) => ({
    x: e.clientX,
    y: e.clientY,
    emoji: '👋',
    userId: getCurrentUserId()
  }), [])

  return (
    <div onClick={addSticker}>
      {Object.entries(stickers).map(([id, sticker]) => (
        <div key={id} style={{ position: 'absolute', left: sticker.x, top: sticker.y }}>
          {sticker.emoji}
        </div>
      ))}
    </div>
  )
}
```

**Winner:** Framework-agnostic. No migration needed. TinyBase + PartyKit is designed exactly for this use case.

---

### Scenario D: Full App (auth, user profiles, personal data sync across devices)

**Best approach:**
- Migrate to TanStack Start — the authenticated app pattern is natural here
- Cloudflare D1 + Drizzle ORM for data
- Better Auth for sessions
- Zero or ElectricSQL for data sync if offline support is wanted
- R2 for any file uploads

**Winner:** TanStack Start is clearly better for this scenario.

---

## SpecFlow Gaps & Open Questions

These gaps were identified by analyzing the current codebase. They need answers before committing to any migration:

### Strategic (Must Answer First)

- [ ] **What is the real-time feature?** The current site has zero real-time requirements. Define the specific feature before choosing any tooling.
- [ ] **Who writes data?** Local-first tools are designed for user-writable data. If only the site owner publishes content, a CMS + webhook redeploy is simpler than a sync engine.
- [ ] **Is offline support needed?** Full local-first (ElectricSQL with PGlite, Zero, Triplit) only makes sense if visitors should be able to use the site without a network connection.

### UX Gaps (Exist Today, Carry Into Migration)

- [ ] Filter state is not URL-persistent — bookmarked/shared URLs don't preserve filter selections. Fix with `useSearchParams` in either framework.
- [ ] No empty state when filters yield zero results — show a message.
- [ ] No filter reset — add an "all" option or a clear button.
- [ ] YEARS constant doesn't include 2025/2026.
- [ ] 7 of 9 favorite type categories have zero content — add content or hide empty categories.
- [ ] `workExperience` and `projectExperience` props are passed to `Experience.tsx` but never rendered — either use them or remove them.
- [ ] Footer date is hardcoded. Automate from build time.
- [ ] Raindrop scaffold script writes a JSON file that nothing reads — remove or connect it.

### Infrastructure Gaps

- [ ] No `wrangler.toml` for Cloudflare deployment — needs to be created
- [ ] No CI/CD pipeline — build + deploy needs to be configured (GitHub Actions + `wrangler deploy` or Cloudflare Pages Git integration)
- [ ] Moodboard has no error state and no fallback if Raindrop API is down

---

## Baseline Performance Metrics (Before Migration)

Before any framework change, capture current site performance as a baseline. This will allow proper comparison after TanStack Start migration.

### Metrics to Capture

**Lighthouse scores (mobile + desktop):**
- [ ] Performance score
- [ ] First Contentful Paint (FCP)
- [ ] Largest Contentful Paint (LCP)
- [ ] Time to Interactive (TTI)
- [ ] Total Blocking Time (TBT)
- [ ] Cumulative Layout Shift (CLS)

**Bundle analysis:**
- [ ] Total JS bundle size (initial load)
- [ ] Total CSS size
- [ ] Number of network requests
- [ ] Parse + compile time for JS
- [ ] Breakdown by page: `/`, `/memorabilia`, `/moodboard`

**Network waterfall:**
- [ ] Screenshot of waterfall for home page first load
- [ ] Time to first byte (TTFB) from Netlify CDN

**Tools:**
```bash
# Lighthouse CI
npm install -g @lhci/cli
lhci autorun --collect.url=https://yourdomain.com --collect.numberOfRuns=3

# Bundle analyzer (run after build)
npx vite-bundle-visualizer

# WebPageTest
# Use https://www.webpagetest.org with Moto G4 / Slow 3G for mobile baseline
```

### Comparison Targets After Migration

**Astro (current) vs TanStack Start:**
- Expect: TanStack Start home page will have +100-200KB JS (React runtime) vs Astro's near-zero JS
- Expect: Astro TTI ~0.5-1s, TanStack Start TTI ~1.5-2.5s on slow 3G
- Expect: Both should have excellent LCP since images are optimized via Cloudinary

**With PartyKit + TinyBase added (either framework):**
- PartyKit client: ~10KB gzipped
- TinyBase: ~15KB gzipped
- Total overhead: ~25KB + WebSocket connection
- Expected impact: minimal on LCP, adds ~50-100ms to TTI

### Acceptance Criteria for Migration

- [ ] Home page Lighthouse performance score stays >90 (desktop)
- [ ] Home page Lighthouse performance score stays >70 (mobile)
- [ ] LCP stays under 2.5s on slow 3G
- [ ] JS bundle size increase is justified by feature gains (presence + stickers)
- [ ] Interactive features (filters, dialogs) work at same speed or faster

---

## Recommendation

### Short-term (Cloudflare + real-time without full migration) — RECOMMENDED

**Stay on Astro, move to Cloudflare, add PartyKit + TinyBase for presence/stickers.**

Given your defined feature (presence + ephemeral stickers/text), this is the optimal path:

1. **Capture baseline performance** (Phase 0 above)
2. Switch adapter from `@astrojs/netlify` to `@astrojs/cloudflare`
3. Switch `output` from `'static'` to `'hybrid'` — static pages stay CDN-served, dynamic ones use Workers
4. Move secrets to Cloudflare dashboard (use `wrangler secret put` or Cloudflare dashboard)
5. Add Cloudflare KV caching for the Raindrop API response (moodboard updates without full redeploy)
6. **Add PartyKit + TinyBase** for presence + stickers — a React island (`client:load`) that works on any Astro page
7. Set up `wrangler.toml` and GitHub Actions deploy
8. **Capture post-migration performance** and compare

**Migration effort:** Low. Mostly config changes + one new React component.

**Why not migrate to TanStack Start?**
- The feature (presence + stickers) works identically in both frameworks
- Astro's zero-JS static pages keep your content pages fast
- TanStack Start migration would add ~150KB+ to home page bundle for no feature gain
- You can always migrate later if you add auth / complex app features

### Long-term (if the site becomes significantly more app-like)

**Migrate to TanStack Start on Cloudflare.**

Only worth doing when:
- You need authenticated user accounts
- You want end-to-end TypeScript type safety across data fetching
- The interactive surface area outweighs the content surface area
- You want to co-locate server logic with routes (loaders, server functions)

**Migration effort:** High. Nav and ViewTransitions require full rewrites. Content collections need to be replaced with direct imports + Zod schemas (which already exist in `src/schemas.ts`).

---

## Implementation Phases

### Phase 0 — Baseline Performance Capture

- [ ] Run Lighthouse on home page (mobile + desktop) — save reports
- [ ] Run `npx vite-bundle-visualizer` and save screenshot of bundle map
- [ ] Run WebPageTest on Moto G4 / Slow 3G — save waterfall + filmstrip
- [ ] Document current JS bundle size from `dist/_astro/` folder
- [ ] Screenshot Network tab waterfall from Chrome DevTools
- [ ] Git commit these artifacts to `docs/performance-baseline/` for future comparison

**Artifacts to save:**
- `docs/performance-baseline/lighthouse-home-mobile.json`
- `docs/performance-baseline/lighthouse-home-desktop.json`
- `docs/performance-baseline/bundle-map.png`
- `docs/performance-baseline/webpagetest-report.pdf`
- `docs/performance-baseline/metrics.md` (summary table)

### Phase 1 — Cloudflare Infrastructure Setup

- [ ] Set up Cloudflare account and project
- [ ] Create `wrangler.toml`
- [ ] Add secrets to Cloudflare dashboard (Raindrop token, Cloudinary secrets)
- [ ] Set up GitHub Actions for deploy on push to `main`

**Files to create/modify:**
- `wrangler.toml` (new)
- `.github/workflows/deploy.yml` (new)
- `astro.config.mjs` (swap adapter: `@astrojs/cloudflare`, `output: 'hybrid'`)

### Phase 2 — Cloudflare Migration (Astro stays)

- [ ] Replace Netlify adapter with `@astrojs/cloudflare`
- [ ] Switch to hybrid output
- [ ] Add KV cache for Raindrop API (moodboard page becomes on-demand SSR with caching)
- [ ] Fix moodboard error handling (graceful fallback if API fails)
- [ ] Fix footer auto-date
- [ ] Fix filter URL persistence + empty states

**Files to modify:**
- `src/components/RaindropWrapper.astro` (add KV caching, error handling)
- `src/pages/moodboard.astro` (add `export const prerender = false`)
- `src/components/Footer.astro` (use build time from env)
- `src/components/FavoritesCollectionHandler.tsx` (URL search params, empty state)
- `src/constants/memorabilia.ts` (add 2025, 2026 to YEARS)

### Phase 3 — Add Real-Time Feature (TBD on feature definition)

Depends on what is chosen. Possible implementations:

**Option 3A — Live moodboard sync (ElectricSQL + Neon Postgres)**
- [ ] Set up Neon Postgres database
- [ ] Create `bookmarks` table, write a script to sync from Raindrop → Postgres
- [ ] Self-host or use Electric Cloud
- [ ] Replace `RaindropWrapper.astro` with a React island using `useShape()`
- Relevant files: `src/components/RaindropWrapper.astro` → `src/components/MoodboardLive.tsx`

**Option 3B — Guestbook (InstantDB)**
- [ ] Create InstantDB app at https://www.instantdb.com
- [ ] Add `src/components/Guestbook.tsx` React island
- [ ] Add `/guestbook` page or embed in home page
- Relevant files: `src/pages/index.astro` or new `src/pages/guestbook.astro`

**Option 3C — Presence + Ephemeral Stickers/Text (PartyKit + TinyBase) — RECOMMENDED**
- [ ] Install: `npm install tinybase tinybase-ui-react partysocket partykit`
- [ ] `npm create partykit@latest` — create PartyKit server
- [ ] Create `party/stickers.ts` — PartyKit server that broadcasts sticker state
- [ ] Add `src/components/StickersOverlay.tsx` — TinyBase store + PartyKit persister
- [ ] Embed as `client:load` island in `BaseLayout.astro` (or specific pages)
- [ ] Add presence indicator showing live visitor count from PartyKit connections
- [ ] Add click-to-place sticker UI (emoji picker or text input)
- [ ] Add auto-cleanup for stickers older than 5 minutes (PartyKit alarm)
- Relevant files:
  - `party/stickers.ts` (new)
  - `src/components/StickersOverlay.tsx` (new)
  - `src/components/Presence.tsx` (new)
  - `partykit.json` (new — PartyKit config)

### Phase 4 — TanStack Start Migration (only if Phase 3 reveals Astro limitations)

- [ ] Scaffold new TanStack Start app
- [ ] Port CSS system (direct copy)
- [ ] Port Radix UI components (direct copy)
- [ ] Rewrite Nav as React component with TanStack Router hooks
- [ ] Port content data as direct JSON/Markdown imports in route loaders
- [ ] Rewrite moodboard route with `createServerFn` for Raindrop/ElectricSQL
- [ ] Implement ViewTransitions via `document.startViewTransition()`
- [ ] Port nanostores → `useSearchParams` (URL-persistent filters)
- [ ] Configure Cloudflare Pages preset, `wrangler.toml`

---

## References

### TanStack
- TanStack Start docs: https://tanstack.com/start/latest
- TanStack Router: https://tanstack.com/router/latest
- GitHub: https://github.com/TanStack/router
- Vinxi (server layer): https://vinxi.vercel.app

### Astro
- Astro docs: https://docs.astro.build
- Cloudflare adapter: https://docs.astro.build/en/guides/integrations-guide/cloudflare/
- Hybrid rendering: https://docs.astro.build/en/guides/on-demand-rendering/

### Local-First Tools
- ElectricSQL: https://electric-sql.com / https://github.com/electric-sql/electric
- PGlite (WASM Postgres): https://pglite.dev
- InstantDB: https://www.instantdb.com / https://github.com/instantdb/instant
- Zero (Rocicorp): https://zerosync.dev / https://github.com/rocicorp/mono
- PartyKit: https://docs.partykit.io / https://github.com/partykit/partykit
- **TinyBase: https://tinybase.org / https://github.com/tinyplex/tinybase**
- Liveblocks: https://liveblocks.io/docs
- Triplit: https://www.triplit.dev
- Original local-first paper (Kleppmann et al.): https://www.inkandswitch.com/local-first/

### Cloudflare
- Workers: https://developers.cloudflare.com/workers/
- Pages: https://developers.cloudflare.com/pages/
- D1: https://developers.cloudflare.com/d1/
- KV: https://developers.cloudflare.com/kv/
- R2: https://developers.cloudflare.com/r2/
- Durable Objects: https://developers.cloudflare.com/durable-objects/
- Queues: https://developers.cloudflare.com/queues/
- Hyperdrive: https://developers.cloudflare.com/hyperdrive/

### Auth + ORM (Cloudflare-compatible)
- Better Auth: https://www.better-auth.com
- Drizzle ORM + D1: https://orm.drizzle.team/docs/get-started-sqlite

---

## Summary & Decision Framework

### The Feature Is Now Defined

**Real-time requirement:** Presence + ephemeral stickers/text overlay
- No persistence needed
- No authentication required
- No complex data relationships
- Perfect for PartyKit + TinyBase

### Clear Answer: Stay on Astro, Add PartyKit + TinyBase

**Why Astro wins for this use case:**
- ✅ Your content pages (home, memorabilia, 404) ship zero JS — fast LCP, excellent Lighthouse scores
- ✅ PartyKit + TinyBase work perfectly in Astro React islands (`client:load`)
- ✅ Hybrid rendering on Cloudflare means static pages stay CDN-cached, only moodboard hits Workers
- ✅ Migration effort is minimal — one new React component, config changes, adapter swap
- ✅ You preserve Astro's content collections, which are excellent for your JSON/Markdown data
- ✅ ViewTransitions and Nav animations already work — no rewrite needed

**When to consider TanStack Start migration later:**
- You add user authentication and profiles
- You need complex server-side mutations with type safety
- The interactive surface area significantly outweighs content pages
- You want to co-locate server functions with routes

**Action plan:**
1. Capture baseline performance metrics (Phase 0)
2. Migrate Netlify → Cloudflare with Astro (Phase 1-2)
3. Add PartyKit + TinyBase stickers component (Phase 3C)
4. Compare performance vs baseline — expect minimal impact (~25KB + WebSocket connection)
5. Re-evaluate TanStack Start only if you add authenticated features later

**Estimated timeline:**
- Phase 0 (baseline): 1 hour
- Phase 1 (infrastructure): 2-3 hours
- Phase 2 (Cloudflare migration): 4-6 hours
- Phase 3C (PartyKit + TinyBase): 6-8 hours
- **Total: ~2 days of focused work**

vs. TanStack Start migration: ~2-3 weeks (full rewrite)
