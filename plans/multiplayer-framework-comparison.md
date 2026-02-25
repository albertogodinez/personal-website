# Framework Comparison: Real-Time Multiplayer Game on Cloudflare (2026)

## Executive Recommendation

**Winner: TanStack Start** with PartyKit for real-time features

**Runner-up: SvelteKit** if bundle size is critical priority

**Current site strategy:** Keep existing Astro site, deploy game as separate TanStack Start app on Cloudflare, or migrate entire site to TanStack Start for unified deployment.

---

## Quick Comparison Matrix

| Criteria | TanStack Start | SvelteKit | Astro | Next.js |
|----------|---------------|-----------|-------|---------|
| **WebSocket Support** | ⭐⭐⭐⭐⭐ Native | ⭐⭐⭐⭐ Native | ⭐⭐⭐⭐ Via Worker | ⭐⭐ SSE Only |
| **Durable Objects** | ⭐⭐⭐⭐⭐ First-class | ⭐⭐⭐⭐ Direct access | ⭐⭐⭐⭐ Custom worker | ⭐⭐ Requires separate Worker |
| **TypeScript DX** | ⭐⭐⭐⭐⭐ Typed RPC | ⭐⭐⭐⭐ Excellent | ⭐⭐⭐ Good | ⭐⭐⭐⭐⭐ Excellent |
| **Bundle Size** | 45-50KB | 30-35KB | 55-60KB | 85-95KB |
| **Dev Velocity** | ⭐⭐⭐⭐⭐ Fast | ⭐⭐⭐⭐ Fast | ⭐⭐⭐⭐ Fast | ⭐⭐⭐ Medium |
| **PartyKit Integration** | ⭐⭐⭐⭐⭐ Seamless | ⭐⭐⭐⭐ Good | ⭐⭐⭐ Manual | ⭐⭐ Complex |
| **D1 + Drizzle** | ⭐⭐⭐⭐⭐ Native | ⭐⭐⭐⭐⭐ Native | ⭐⭐⭐⭐⭐ Native | ⭐⭐⭐⭐ Works |
| **Game State Sync** | ⭐⭐⭐⭐⭐ useSync | ⭐⭐⭐⭐ Stores | ⭐⭐⭐ Context | ⭐⭐ Limited |

---

## Detailed Analysis

### 1. TanStack Start (Recommended)

**Why it wins:**
- Purpose-built for Cloudflare with `cloudflare-pages` preset
- Typed RPC with `createServerFn` - best TypeScript experience
- PartyKit integration is seamless (both use Durable Objects)
- Smaller bundle than Next.js, faster DX than raw Workers
- Growing ecosystem with Better Auth, Drizzle, TRPC support

**WebSocket Architecture:**
```typescript
// app/server/game.ts
import { createServerFn } from '@tanstack/start'

export const connectToGame = createServerFn()
  .handler(async ({ request }) => {
    const env = request.env
    const gameStub = env.GAME_SESSION.idFromName('game-123')
    return gameStub.fetch(request)
  })

// party/game.ts (PartyKit)
import { Server } from 'partyserver'

export class GameServer extends Server {
  static options = { hibernate: true }

  async webSocketMessage(ws, message) {
    // Broadcast game state to all players
    this.broadcast(message)
  }

  async onAlarm() {
    // Handle countdown timers
    this.broadcast(JSON.stringify({ type: 'timer-expired' }))
  }
}
```

**Client-side with type-safe sync:**
```typescript
import { usePartySocket } from 'partysocket/react'
import { useSync } from 'partysync/react'

function GameUI() {
  const socket = usePartySocket({ party: 'game', room: gameId })

  const [gameState, sendAction] = useSync<GameState, GameAction>(
    'game',
    socket,
    (state, action) => {
      // Optimistic updates for responsive UI
      return applyAction(state, action)
    }
  )

  return <GameBoard state={gameState} onMove={sendAction} />
}
```

**Pros:**
- Best-in-class TypeScript DX with typed RPC
- Native Cloudflare Pages deployment
- PartyKit provides state sync, presence, alarms
- Minimal bundle size vs Next.js
- Fast iteration cycle

**Cons:**
- Newer framework (less Stack Overflow answers)
- Smaller community than Next.js/Svelte

**Setup:**
```bash
pnpm create @tanstack/start
# Select cloudflare-pages preset
pnpm add partykit partysocket partysync
pnpm add drizzle-orm @cloudflare/workers-types
```

---

### 2. SvelteKit (Runner-up)

**Why it's strong:**
- Smallest bundle size (30-35KB)
- Svelte 5 signals perfect for game reactivity
- Excellent Cloudflare adapter with Durable Object support
- Native reactive stores ideal for game state

**WebSocket Architecture:**
```typescript
// src/routes/game/[id]/+server.ts
import type { RequestHandler } from './$types'

export const GET: RequestHandler = async ({ platform, params }) => {
  const gameId = platform.env.GAME_SESSION.idFromName(params.id)
  const stub = platform.env.GAME_SESSION.get(gameId)
  return stub.fetch(request)
}

// src/lib/stores/game.ts
import { writable } from 'svelte/store'

export const gameState = writable({
  players: [],
  countdown: 0,
  status: 'waiting'
})
```

**Pros:**
- Smallest production bundle
- Svelte's reactivity is perfect for game loops
- Excellent performance
- Clean Cloudflare integration

**Cons:**
- Learning curve if team knows React
- PartyKit integration less documented
- Smaller ecosystem than React

---

### 3. Astro + Cloudflare (Keep existing, add feature)

**Strategy:** Keep Astro for content, add game as React island or separate deployment

**WebSocket via custom worker:**
```typescript
// src/worker.ts
import { DurableObject } from 'cloudflare:workers'

class GameSession extends DurableObject {
  async fetch(request) {
    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)
    this.ctx.acceptWebSocket(server)
    return new Response(null, { status: 101, webSocket: client })
  }

  async webSocketMessage(ws, message) {
    this.broadcast(message)
  }
}

export function createExports(manifest) {
  return {
    default: { fetch: handle(manifest, ...) },
    GameSession
  }
}
```

**Pros:**
- No migration needed
- React islands for game UI
- Keep existing Astro content structure

**Cons:**
- Split architecture (Astro pages + Worker exports)
- Less type-safe than TanStack Start
- Manual WebSocket routing

---

### 4. Next.js on Cloudflare (Not Recommended)

**Critical limitation:** Next.js on Cloudflare Pages does NOT support WebSockets directly.

- Server Actions work for mutations
- SSE (Server-Sent Events) for one-way updates
- But bi-directional WebSocket requires separate Worker

**Workaround:** Deploy Next.js on Pages + separate Worker for game logic (complex)

**Verdict:** Avoid for real-time multiplayer on Cloudflare

---

## D1 Database + Drizzle (All Frameworks)

Configuration identical across frameworks:

```typescript
// drizzle.config.ts
export default {
  schema: './db/schema.ts',
  out: './migrations',
  dialect: 'sqlite',
  driver: 'd1-http'
}

// db/schema.ts
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'

export const highScores = sqliteTable('high_scores', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull(),
  score: integer('score').notNull(),
  gameMode: text('game_mode').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' })
})

// Usage in server context
import { drizzle } from 'drizzle-orm/d1'

const db = drizzle(env.DB)
await db.insert(highScores).values({ /* ... */ })
const top10 = await db.select().from(highScores).limit(10)
```

---

## PartyKit vs Raw Durable Objects

**Use PartyKit for:**
- State synchronization (useSync hook)
- Presence tracking (who's online)
- Countdown timers (onAlarm)
- Built-in hibernation
- SQL helpers

**Use raw Durable Objects for:**
- Maximum control
- Custom protocols
- Complex state machines

**PartyKit example for your use case:**
```typescript
export class GameLobby extends Server {
  static options = { hibernate: true }

  onStart() {
    this.sql`
      CREATE TABLE IF NOT EXISTS battles (
        id TEXT PRIMARY KEY,
        status TEXT,
        countdown_ends INTEGER
      )
    `
  }

  async webSocketMessage(connection, message) {
    const action = JSON.parse(message)

    if (action.type === 'join-queue') {
      await this.addToQueue(action.playerId)
      this.matchPlayers()
    }
  }

  async onAlarm() {
    // Countdown expired, start battle
    const battles = this.sql`SELECT * FROM battles WHERE countdown_ends <= ${Date.now()}`
    for (const battle of battles) {
      this.broadcast(JSON.stringify({ type: 'battle-start', battleId: battle.id }))
    }
  }
}
```

---

## Deployment Configuration

### TanStack Start on Cloudflare

```bash
# package.json
{
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "deploy": "pnpm build && wrangler deploy"
  }
}

# wrangler.toml
name = "multiplayer-game"
compatibility_date = "2026-01-01"

[[durable_objects.bindings]]
name = "GAME_SESSION"
class_name = "GameServer"
script_name = "multiplayer-game"

[[d1_databases]]
binding = "DB"
database_name = "game_scores"
database_id = "your-d1-id"
```

### SvelteKit on Cloudflare

```javascript
// svelte.config.js
import adapter from '@sveltejs/adapter-cloudflare'

export default {
  kit: {
    adapter: adapter()
  }
}
```

---

## Migration Path from Astro

### Option A: Incremental (Recommended for low risk)

1. Keep Astro site for content pages
2. Deploy game feature as separate TanStack Start app on Cloudflare
3. Link from Astro to game subdomain

**Pros:** No risk to existing site, test Cloudflare separately
**Cons:** Two deployments, CORS configuration needed

### Option B: Full Migration

1. Migrate Astro content to TanStack Start
2. Use TanStack Start for entire site
3. Unified Cloudflare deployment

**Pros:** Single deployment, unified architecture
**Cons:** Migration effort, testing all content

---

## Final Recommendation

### For your multiplayer game: TanStack Start + PartyKit

**Why:**
1. Typed RPC makes game logic type-safe end-to-end
2. PartyKit's useSync perfect for cursor sync, game state
3. Native Cloudflare Pages support
4. Excellent DX for real-time features
5. Growing ecosystem (Better Auth, Drizzle, TRPC)
6. Bundle size reasonable for React (45-50KB)

**If bundle size is critical:** SvelteKit (30-35KB)

**If minimizing change:** Keep Astro, add game as separate deployment

---

## Implementation Roadmap

### Phase 1: Proof of Concept (Week 1-2)
- Set up TanStack Start with cloudflare-pages preset
- Create basic Durable Object for game session
- Implement cursor sync on home page
- Test WebSocket hibernation

### Phase 2: Core Game Logic (Week 3-4)
- Build queue system with PartyKit
- Implement battle state machine
- Add countdown timers with onAlarm
- Test with multiple concurrent games

### Phase 3: Persistence (Week 5)
- Set up D1 database with Drizzle
- Implement high score table
- Add replay storage
- Test database under load

### Phase 4: Integration (Week 6)
- Integrate with existing Astro site (or migrate)
- Production deployment to Cloudflare
- Monitor performance and optimize

---

## Key Technical Decisions

1. **Real-time sync:** PartyKit's useSync (optimistic updates + CRDT-like reconciliation)
2. **State persistence:** D1 + Drizzle ORM
3. **WebSockets:** Hibernatable Durable Objects via PartyKit
4. **Timers:** PartyKit onAlarm for countdown synchronization
5. **Type safety:** TanStack Start's createServerFn with Zod validation

---

## References

- [TanStack Start Docs](https://tanstack.com/start)
- [PartyKit Docs](https://docs.partykit.io)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects)
- [Drizzle ORM + D1](https://orm.drizzle.team/docs/get-started-sqlite)
- GitHub: Real-world examples found with TanStack Start + Cloudflare + Drizzle (Feb 2026)

---

## Questions to Consider

1. **Team skill set:** Is your team more comfortable with React or Svelte?
   - React → TanStack Start
   - Svelte → SvelteKit

2. **Bundle size priority:** How important is <50KB bundle?
   - Critical → SvelteKit (30KB)
   - Important → TanStack Start (45KB)
   - Flexible → Either works

3. **Migration risk tolerance:** Comfortable migrating entire site?
   - Yes → Migrate to TanStack Start
   - No → Keep Astro, deploy game separately

4. **Type safety priority:** How important is end-to-end typing?
   - Critical → TanStack Start (typed RPC is unmatched)
   - Important → SvelteKit (good TypeScript support)

---

**Next Steps:** Review this comparison with your team and decide based on priorities. I recommend starting with TanStack Start proof of concept to validate the architecture.
