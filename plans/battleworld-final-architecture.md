# 🎮 Battleworld: Rock-Paper-Scissors Game — Final Architecture

**Feature:** Real-time multiplayer RPS with cursor tracking, spectating, and high scores
**Tech Stack:** TinyBase + Cloudflare Durable Objects
**Date:** February 24, 2026

---

## Table of Contents

1. [Feature Summary](#feature-summary)
2. [Tech Stack Decision](#tech-stack-decision)
3. [Architecture Overview](#architecture-overview)
4. [TinyBase Integration](#tinybase-integration)
5. [Durable Objects Implementation](#durable-objects-implementation)
6. [Game Flow](#game-flow)
7. [Authentication](#authentication)
8. [Disconnection Handling](#disconnection-handling)
9. [UI/UX Specification](#ui-ux-specification)
10. [Implementation Phases](#implementation-phases)
11. [Migration Strategy](#migration-strategy)

---

## Feature Summary

### Core Mechanics

**Home Page:**
- Real-time cursor tracking (all visitors see each other's cursors)
- Hidden easter egg trigger (DOM element that changes by time of day)
- When 2+ users hover trigger simultaneously:
  - Screen shakes (camera effect)
  - Trigger glows rapidly
  - Click to enter `/battleworld`

**Game Loop:**
1. Enter 3-character arcade-style initials
2. Join FIFO queue (see position + spectate active battles)
3. Match with opponent (first 2 in queue)
4. Best-of-3 RPS rounds
   - 3-second synchronized countdown per round
   - Arrow keys (Left=Rock, Up=Scissors, Right=Paper)
   - Real-time choice visualization (opponent sees your cursor snap to icons)
5. Post-game: Replay animation + "You Won!/You Lost!"
6. High score leaderboard
7. Optional: Claim account (magic link or GitHub) for cross-device high scores

**Timing:**
- Sub-50ms latency for inputs
- Synchronized countdown timer across both players
- Last input before timer expires = final choice

**Disconnection:**
- In-round: 10-second grace → forfeit current round (not match)
- Between rounds: 20-second grace → forfeit entire match
- 3rd disconnect: instant forfeit

---

## Tech Stack Decision

### Final Choice: TinyBase + Cloudflare Durable Objects

After evaluating PartyKit, ElectricSQL, InstantDB, and raw Durable Objects, the winner is:

**TinyBase (client state) + Durable Objects (authoritative server)**

### Why This Won

| Criteria | Decision | Reasoning |
|---|---|---|
| **Client state management** | TinyBase | Reactive hooks, optimistic updates, structured data (tables/cells) |
| **Real-time sync** | Durable Objects | Native Cloudflare, <50ms WebSocket, no third-party dependency |
| **Persistence** | Cloudflare D1 | Edge-native SQLite, free tier covers use case |
| **Auth** | Better Auth | Magic link + GitHub OAuth, D1 adapter built-in |
| **Cost** | $5-10/month | Cloudflare only (no Neon, no ElectricSQL SaaS) |

### Alternatives Considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **PartyKit** | Great DX, TinyBase persister built-in | No releases since May 2024 (stale) | ❌ Dependency risk |
| **ElectricSQL + Postgres** | Live leaderboard, Postgres queries | $50/mo, higher latency (200ms), complex | ❌ Overkill |
| **InstantDB** | Simple API | SaaS only, no authoritative server (security risk) | ❌ Not suitable |
| **Raw React + DO** | Simple, no deps | Manual state sync, verbose | ⚠️ Worse DX |

### Why NOT ElectricSQL for Game Loop

ElectricSQL is **excellent for persistent data** but **not ideal for game sessions:**

- ✅ Use ElectricSQL: High scores, user profiles, game history
- ❌ Don't use ElectricSQL: 60fps cursor sync, countdown timers, RPS inputs

**Reason:** 200-500ms latency (HTTP polling) vs <50ms (WebSocket). Game loop needs instant feedback.

**Hybrid approach considered but rejected:**
- TinyBase + DO for game + ElectricSQL for leaderboard = $50/mo (10x cost)
- Benefit (live-updating leaderboard) doesn't justify cost for MVP
- Can add later if needed

---

## Architecture Overview

### System Diagram

```
┌─────────────────────────────────────────────────────┐
│ Client (Browser)                                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  TinyBase Store (in-memory reactive state)         │
│    ├─ tables:                                       │
│    │   ├─ game { battleId, round, phase, ... }     │
│    │   ├─ players { p1: {...}, p2: {...} }         │
│    │   ├─ timer { countdown: 3 }                   │
│    │   └─ cursors { user1: {x, y}, ... }           │
│    │                                                │
│    └─ WebSocket Persister (custom)                 │
│              ↕ wss://battle.agodinez.com            │
│                                                     │
└──────────────────────┬──────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────┐
│ Cloudflare Durable Objects                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  CursorRoom (home page)                            │
│    └─ Broadcasts cursor positions (60fps throttle) │
│                                                     │
│  TriggerRoom (easter egg)                          │
│    └─ Tracks hover count, activates power-up       │
│                                                     │
│  QueueRoom (matchmaking)                           │
│    └─ FIFO queue, creates BattleRoom on match      │
│                                                     │
│  BattleRoom:{id} (game session)                    │
│    ├─ Authoritative game logic                     │
│    ├─ Validates inputs (prevent cheating)          │
│    ├─ onAlarm for countdown timer                  │
│    └─ Broadcasts state to both players             │
│                                                     │
└──────────────────────┬────────────────────────────┘
                       │
                       ▼ (after match ends)
┌─────────────────────────────────────────────────────┐
│ Cloudflare D1 (SQLite at edge)                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  users:        id, initials, email, github_id      │
│  sessions:     id, user_id, expires_at             │
│  games:        id, player1_id, winner_id           │
│  high_scores:  user_id, wins, losses, streak       │
│  replays:      game_id, round_data (JSON)          │
│                                                     │
└─────────────────────────────────────────────────────┘
```

### Data Flow (Critical Path)

```
1. User presses Left arrow (Rock)
     ↓
2. TinyBase optimistically updates local store
     store.setCell('players', 'player1', 'choice', 'rock')
     ↓ (<1ms)
3. UI re-renders immediately (optimistic)
     ↓
4. Custom persister sends via WebSocket
     ws.send({ type: 'choice', playerId: 'p1', value: 'rock' })
     ↓ (15-30ms network)
5. Durable Object receives + validates
     if (phase === 'choosing' && validChoice) { ... }
     ↓ (<1ms)
6. Durable Object broadcasts authoritative state
     this.broadcast({ type: 'state', players: [...] })
     ↓ (15-30ms network)
7. Both clients receive via WebSocket
     ↓
8. TinyBase persister updates store (server reconciliation)
     ↓ (<1ms)
9. UI re-renders with authoritative state
     ↓
TOTAL: 30-60ms round-trip
```

**Key insight:** TinyBase optimistic updates give instant local feedback. Server validation ensures fairness. If server rejects, TinyBase rolls back.

---

## TinyBase Integration

### Why TinyBase Is Perfect for This

**TinyBase strengths:**
- ✅ **Reactive tables/cells** — granular subscriptions (only re-render when specific cell changes)
- ✅ **Optimistic updates** — instant local feedback before server confirms
- ✅ **Structured data** — game state as tables (players, timer, game) not JSON blobs
- ✅ **Queries** — filter, sort, join tables (e.g., "active players in queue")
- ✅ **Small** — 15KB gzipped (vs 50KB for full state management library)

### Store Schema

```ts
// src/lib/battle-store.ts
import { createStore } from 'tinybase'

export function createBattleStore() {
  return createStore()
    .setTables({
      game: {
        session: {
          battleId: 'abc123',
          round: 1,
          phase: 'countdown', // countdown | choosing | reveal | finished
          myPlayerId: 'player1'
        }
      },
      players: {
        player1: {
          id: 'user123',
          initials: 'ACE',
          choice: null,      // rock | paper | scissors | null
          score: 0
        },
        player2: {
          id: 'user456',
          initials: 'BOB',
          choice: null,
          score: 0
        }
      },
      timer: {
        countdown: {
          seconds: 3,
          startedAt: Date.now()
        }
      },
      cursors: {
        // Populated on home page only
        // user123: { x: 450, y: 320 }
        // user456: { x: 780, y: 190 }
      }
    })
}
```

### React Integration

```tsx
// src/components/BattleView.tsx
import { useCell, useRow } from 'tinybase/ui-react'

export function BattleView({ store }: { store: Store }) {
  // Subscribe to specific cells (granular re-renders)
  const phase = useCell('game', 'session', 'phase', store)
  const countdown = useCell('timer', 'countdown', 'seconds', store)
  const myPlayerId = useCell('game', 'session', 'myPlayerId', store)

  // Subscribe to entire player row
  const me = useRow('players', myPlayerId, store)
  const opponent = useRow('players',
    myPlayerId === 'player1' ? 'player2' : 'player1',
    store
  )

  const handleKeyPress = (e: KeyboardEvent) => {
    if (phase !== 'choosing') return

    const choice =
      e.key === 'ArrowLeft' ? 'rock' :
      e.key === 'ArrowUp' ? 'scissors' :
      e.key === 'ArrowRight' ? 'paper' : null

    if (choice) {
      // Optimistic update (instant local feedback)
      store.setCell('players', myPlayerId, 'choice', choice)
      // Persister auto-sends to server via WebSocket
    }
  }

  useEffect(() => {
    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [phase, myPlayerId])

  return (
    <div className="battle-view">
      <ScoreBar>
        <PlayerSide>
          <Initials>{me.initials}</Initials>
          <Wins>{renderWins(me.score)}</Wins>
        </PlayerSide>

        <Timer phase={phase}>{countdown}s</Timer>

        <PlayerSide>
          <Wins>{renderWins(opponent.score)}</Wins>
          <Initials>{opponent.initials}</Initials>
        </PlayerSide>
      </ScoreBar>

      <ChoiceDisplay>
        <PlayerChoice active={me.choice} side="left" />
        <VS>VS</VS>
        <PlayerChoice active={opponent.choice} side="right" />
      </ChoiceDisplay>
    </div>
  )
}
```

**Key benefits:**
- `useCell` only re-renders when that specific cell changes
- Optimistic updates feel instant (no waiting for server)
- Server can override if validation fails

### Custom WebSocket Persister

Since PartyKit is stale, we build a custom persister for Durable Objects:

```ts
// src/lib/durable-object-persister.ts
import { createCustomPersister } from 'tinybase/persisters'
import type { Store } from 'tinybase'

export function createDurableObjectPersister(
  store: Store,
  wsUrl: string,
  options: {
    sessionId: string
    userId: string
  }
) {
  let ws: WebSocket
  let isInitialized = false

  return createCustomPersister(
    store,

    // getPersisted: Load initial state from server
    async () => {
      ws = new WebSocket(`${wsUrl}?sessionId=${options.sessionId}&userId=${options.userId}`)

      return new Promise((resolve, reject) => {
        ws.onopen = () => {
          ws.send(JSON.stringify({ type: 'request_state' }))
        }

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data)

          if (message.type === 'init' && !isInitialized) {
            isInitialized = true
            // Return [tables, values] in TinyBase format
            resolve([message.tables || {}, message.values || {}])
          }
        }

        ws.onerror = (error) => reject(error)

        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      })
    },

    // setPersisted: Send local changes to server
    async (getContent) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return

      const [tables, values] = getContent()

      // Only send changes, not entire state
      ws.send(JSON.stringify({
        type: 'update',
        tables,
        values
      }))
    },

    // addPersisterListener: Receive server updates
    (listener) => {
      const handleMessage = (event: MessageEvent) => {
        const message = JSON.parse(event.data)

        if (message.type === 'state_update') {
          // Server sends authoritative state
          listener([message.tables, message.values])
        } else if (message.type === 'reject') {
          // Server rejected update - rollback handled automatically
          console.warn('Server rejected update:', message.reason)
        }
      }

      ws.addEventListener('message', handleMessage)

      // Cleanup
      return () => {
        ws.removeEventListener('message', handleMessage)
        ws.close()
      }
    },

    // Optional: onIgnoredError
    (error) => {
      console.error('Persister error:', error)
    }
  )
}
```

**Usage:**
```ts
const store = createBattleStore()
const persister = createDurableObjectPersister(
  store,
  'wss://battle.agodinez.com/room/abc123',
  {
    sessionId: localStorage.getItem('battleworld_session'),
    userId: getUserId()
  }
)

await persister.startAutoLoad()  // Load initial state
await persister.startAutoSave()  // Auto-sync changes
```

---

## Durable Objects Implementation

### BattleRoom (Game Session)

```ts
// workers/battle-room.ts
export class BattleRoom {
  state: DurableObjectState
  env: Env
  connections: Map<WebSocket, PlayerConnection>
  gameState: GameState
  alarmScheduled: boolean = false

  constructor(state: DurableObjectState, env: Env) {
    this.state = state
    this.env = env
    this.connections = new Map()

    // Load persisted state from Durable Object storage
    this.state.blockConcurrencyWhile(async () => {
      this.gameState = await this.state.storage.get('game') || {
        battleId: crypto.randomUUID(),
        round: 1,
        phase: 'waiting',
        players: {},
        timer: { countdown: 3 }
      }
    })
  }

  async fetch(request: Request) {
    const url = new URL(request.url)

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      const pair = new WebSocketPair()
      const [client, server] = Object.values(pair)

      await this.handleSession(server, url)

      return new Response(null, {
        status: 101,
        webSocket: client
      })
    }

    return new Response('Expected WebSocket', { status: 400 })
  }

  async handleSession(ws: WebSocket, url: URL) {
    ws.accept()

    const sessionId = url.searchParams.get('sessionId')
    const userId = url.searchParams.get('userId')

    // Register connection
    this.connections.set(ws, { sessionId, userId, playerId: null })

    // Check if this is a reconnection
    const reconnectedPlayer = this.findPlayerBySession(sessionId)
    if (reconnectedPlayer) {
      this.handleReconnection(ws, reconnectedPlayer)
    }

    ws.addEventListener('message', async (event) => {
      const message = JSON.parse(event.data as string)
      await this.handleMessage(ws, message)
    })

    ws.addEventListener('close', () => {
      this.handleDisconnect(ws)
    })
  }

  async handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'request_state':
        // Send current state to client
        ws.send(JSON.stringify({
          type: 'init',
          tables: this.gameStateToTinyBase().tables,
          values: this.gameStateToTinyBase().values
        }))
        break

      case 'update':
        // Client sent TinyBase update
        await this.handleClientUpdate(ws, message)
        break

      case 'join':
        // New player joining
        await this.addPlayer(ws, message.initials)
        break
    }
  }

  async handleClientUpdate(ws: WebSocket, message: any) {
    const conn = this.connections.get(ws)
    if (!conn?.playerId) return

    // Extract player choice from TinyBase update
    const choice = message.tables?.players?.[conn.playerId]?.choice

    if (choice) {
      // AUTHORITATIVE VALIDATION
      if (this.gameState.phase !== 'choosing') {
        ws.send(JSON.stringify({
          type: 'reject',
          reason: 'Not in choosing phase'
        }))
        return
      }

      if (!['rock', 'paper', 'scissors'].includes(choice)) {
        ws.send(JSON.stringify({
          type: 'reject',
          reason: 'Invalid choice'
        }))
        return
      }

      // Accept choice
      this.gameState.players[conn.playerId].choice = choice

      // Persist to Durable Object storage
      await this.state.storage.put('game', this.gameState)

      // Broadcast to all clients
      this.broadcast({
        type: 'state_update',
        tables: this.gameStateToTinyBase().tables,
        values: this.gameStateToTinyBase().values
      })
    }
  }

  async onAlarm() {
    // Countdown timer tick (called every 1 second)
    if (this.gameState.phase === 'countdown') {
      this.gameState.timer.countdown -= 1

      if (this.gameState.timer.countdown === 0) {
        this.gameState.phase = 'choosing'
        this.gameState.timer.countdown = 3 // Reset for choosing phase
        await this.scheduleNextAlarm(3000) // 3-second choosing window
      } else {
        await this.scheduleNextAlarm(1000) // Next countdown tick
      }

      this.broadcastState()
    } else if (this.gameState.phase === 'choosing') {
      // Choosing timer expired - resolve round
      await this.resolveRound()
    }
  }

  async resolveRound() {
    const [p1Id, p2Id] = Object.keys(this.gameState.players)
    const p1 = this.gameState.players[p1Id]
    const p2 = this.gameState.players[p2Id]

    const winner = this.determineWinner(p1.choice, p2.choice)

    if (winner === 1) p1.score += 1
    else if (winner === 2) p2.score += 1

    this.gameState.phase = 'reveal'

    // Check if match is over (best of 3)
    if (p1.score === 2 || p2.score === 2) {
      await this.endMatch()
    } else {
      // Next round after 2-second delay
      setTimeout(() => this.startNextRound(), 2000)
    }

    await this.state.storage.put('game', this.gameState)
    this.broadcastState()
  }

  determineWinner(c1: string, c2: string): 0 | 1 | 2 {
    if (c1 === c2) return 0
    if (c1 === 'rock' && c2 === 'scissors') return 1
    if (c1 === 'scissors' && c2 === 'paper') return 1
    if (c1 === 'paper' && c2 === 'rock') return 1
    return 2
  }

  handleDisconnect(ws: WebSocket) {
    const conn = this.connections.get(ws)
    if (!conn?.playerId) return

    const gracePeriod = this.gameState.phase === 'choosing' ? 10000 : 20000

    // Notify opponent
    this.broadcast({
      type: 'opponent_disconnected',
      playerId: conn.playerId,
      gracePeriod,
      timestamp: Date.now()
    }, ws)

    // Start forfeit timer
    const timer = setTimeout(async () => {
      await this.forfeitPlayer(conn.playerId)
    }, gracePeriod)

    // Store timer reference for reconnection
    this.connections.get(ws).disconnectTimer = timer
  }

  handleReconnection(ws: WebSocket, playerId: string) {
    const oldConn = [...this.connections.entries()].find(
      ([_, conn]) => conn.playerId === playerId
    )

    if (oldConn) {
      const [oldWs, oldConnData] = oldConn

      // Clear forfeit timer
      if (oldConnData.disconnectTimer) {
        clearTimeout(oldConnData.disconnectTimer)
      }

      // Remove old connection
      this.connections.delete(oldWs)
    }

    // Update connection map
    const conn = this.connections.get(ws)
    conn.playerId = playerId

    // Notify opponent
    this.broadcast({
      type: 'opponent_reconnected',
      playerId
    }, ws)

    // Send current state
    ws.send(JSON.stringify({
      type: 'init',
      tables: this.gameStateToTinyBase().tables,
      values: this.gameStateToTinyBase().values
    }))
  }

  broadcast(message: any, exclude?: WebSocket) {
    const payload = JSON.stringify(message)
    for (const [ws, _] of this.connections) {
      if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
        ws.send(payload)
      }
    }
  }

  gameStateToTinyBase() {
    // Convert internal game state to TinyBase format
    return {
      tables: {
        game: {
          session: {
            battleId: this.gameState.battleId,
            round: this.gameState.round,
            phase: this.gameState.phase
          }
        },
        players: this.gameState.players,
        timer: { countdown: this.gameState.timer }
      },
      values: {}
    }
  }
}
```

## Game Flow

### Detailed User Journey

#### Phase 1: Home Page (Cursor Tracking)

```
User lands on home page (/)
  ├─> TinyBase store initializes
  │     └─> CursorRoom WebSocket connects
  ├─> User moves mouse
  │     └─> Throttled to 60fps (16ms intervals)
  │           └─> store.setCell('cursors', myUserId, 'x', mouseX)
  │           └─> Persister sends to CursorRoom Durable Object
  ├─> Receive other cursors via WebSocket
  │     └─> TinyBase updates cursors table
  │           └─> React component re-renders other cursor positions
  └─> Easter egg trigger (DOM element changes by time of day)
        ├─> User hovers trigger
        │     └─> Send 'hover' event to TriggerRoom
        ├─> TriggerRoom checks if >=2 users hovering
        │     ├─> Yes: Broadcast 'activate' → screen shake + glow effect
        │     └─> No: Normal state
        └─> User clicks trigger → Navigate to /battleworld
```

#### Phase 2: Enter Battleworld + Queue

```
/battleworld route loads
  ├─> Show arcade-style initials input (3 characters, A-Z 0-9)
  ├─> User enters "ACE" using up/down arrows per character
  ├─> Click "ENTER QUEUE"
  │     └─> Store initials in localStorage + Better Auth anonymous session
  │           └─> POST /api/create-session { sessionId, initials }
  ├─> QueueRoom WebSocket connects
  │     └─> Send { type: 'join', initials: 'ACE', sessionId }
  └─> Queue UI renders
        ├─> "You're #3 in queue"
        ├─> Active battles list (click to spectate)
        └─> When first 2 in queue → QueueRoom creates BattleRoom
              └─> Redirect both players to /battleworld/battle/{battleId}
```

#### Phase 3: Battle (Best of 3)

```
/battleworld/battle/{battleId} loads
  ├─> BattleRoom WebSocket connects with sessionId
  ├─> Durable Object recognizes player (player1 or player2)
  ├─> TinyBase receives initial game state
  │
  ├─> Round 1 starts
  │     ├─> Phase: 'countdown' (3, 2, 1...)
  │     │     └─> onAlarm ticks every 1 second
  │     ├─> Phase: 'choosing' (3-second window)
  │     │     ├─> User presses arrow keys
  │     │     │     └─> Left=Rock, Up=Scissors, Right=Paper
  │     │     ├─> TinyBase optimistic update (instant feedback)
  │     │     │     └─> Cursor snaps to choice icon
  │     │     ├─> Persister sends to Durable Object
  │     │     ├─> Durable Object validates
  │     │     └─> Broadcasts authoritative state to both players
  │     │           └─> Opponent sees player's choice in real-time
  │     ├─> Timer expires → onAlarm triggers resolveRound()
  │     ├─> Phase: 'reveal'
  │     │     ├─> Replay animation (both choices shown)
  │     │     └─> Result: "You Won Round 1!" or "You Lost Round 1"
  │     └─> Update score indicators (●●○ vs ○●○)
  │
  ├─> Round 2 starts (2-second delay)
  ├─> Round 3 (if tied 1-1)
  │
  └─> Match ends (one player reaches 2 wins)
        └─> Phase: 'finished'
              └─> Durable Object writes to D1
                    └─> POST /api/save-game { player1Id, winnerId, rounds }
```

#### Phase 4: Post-Game

```
Match finished
  ├─> Show full-screen result: "YOU WON!" / "YOU LOST!"
  ├─> Replay animation (all 3 rounds)
  ├─> Fetch high scores from D1
  │     └─> GET /api/high-scores → Show top 10 leaderboard
  │           └─> "You're ranked #42 with 5 wins, 3 losses"
  └─> Options:
        ├─> "Play Again" → Return to QueueRoom
        ├─> "Claim Account" → Modal with Better Auth
        │     ├─> Enter email → Magic link sent
        │     └─> Or click "Sign in with GitHub"
        └─> "Exit" → Return to home page
```

---

## Authentication

### Strategy: Play-First, Auth-Optional

**Goal:** Let users play immediately without signup. Optionally claim account for cross-device high scores.

### Three Identity Levels

| Level | Storage | Persistence | Cross-Device | Use Case |
|---|---|---|---|---|
| **Anonymous** | localStorage session ID | Until browser clear | ❌ No | First-time visitor |
| **Initials** | Cookie + D1 session | 30 days | ❌ No | Repeat player (same device) |
| **Claimed** | D1 users table + Better Auth | Permanent | ✅ Yes | Want high scores everywhere |

### Better Auth Setup

```bash
npm install better-auth
```

```ts
// src/lib/auth.server.ts
import { betterAuth } from 'better-auth'
import { d1Adapter } from 'better-auth/adapters/d1'

export const auth = betterAuth({
  database: d1Adapter({
    binding: env.DB // Cloudflare D1 binding
  }),

  emailAndPassword: {
    enabled: false // No passwords
  },

  magicLink: {
    enabled: true,
    expiresIn: 300, // 5 minutes
    sendMagicLink: async ({ email, url }) => {
      // Send via Cloudflare Email Workers or Resend
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'Battleworld <noreply@agodinez.com>',
          to: email,
          subject: 'Your Battleworld login link',
          html: `<p>Click <a href="${url}">here</a> to sign in. Link expires in 5 minutes.</p>`
        })
      })
    }
  },

  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET,
      callbackURL: 'https://agodinez.com/api/auth/callback/github'
    }
  },

  session: {
    cookieCache: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60 // 30 days
    }
  },

  anonymousUser: {
    enabled: true // Support anonymous → authenticated upgrade
  }
})
```

### Flow: Anonymous → Claimed Account

**Step 1: First visit (anonymous)**
```ts
// Client-side (on first page load)
const sessionId = localStorage.getItem('battleworld_session') ||
  crypto.randomUUID()
localStorage.setItem('battleworld_session', sessionId)

// Games are associated with this sessionId
```

**Step 2: Enter initials**
```ts
// After entering "ACE" in Battleworld
await fetch('/api/create-session', {
  method: 'POST',
  body: JSON.stringify({
    sessionId,
    initials: 'ACE'
  })
})

// Server creates row in D1 sessions table
// INSERT INTO sessions (id, initials, created_at, expires_at)
```

**Step 3: Claim account (post-game modal)**
```tsx
<ClaimAccountDialog open={showClaimPrompt}>
  <h2>Save your high score!</h2>
  <p>You've won 5 games as "ACE". Claim this account to access stats from any device.</p>

  <Input
    type="email"
    placeholder="your@email.com"
    value={email}
    onChange={(e) => setEmail(e.target.value)}
  />
  <Button onClick={async () => {
    await auth.sendMagicLink({ email, callbackURL: '/battleworld' })
    setEmailSent(true)
  }}>
    Email me a magic link
  </Button>

  <Divider>or</Divider>

  <Button onClick={() => auth.signIn.social({ provider: 'github' })}>
    <GitHubIcon /> Sign in with GitHub
  </Button>
</ClaimAccountDialog>
```

**Step 4: Magic link verification**
```
User clicks magic link
  → GET /api/auth/verify-magic-link?token=abc123
  → Better Auth validates token
  → Create user in D1 users table
  → Migrate all games from sessionId to user.id
  → Set authenticated session cookie
  → Redirect to /battleworld
```

## Disconnection Handling

Policy from research (`plans/rps-disconnection-handling.md`):

**In-Round Disconnect:**
- Grace period: 10 seconds
- UI: "Opponent disconnected... ⏱️ 10s"
- If reconnects: Resume immediately
- If timeout: Forfeit current round only (not entire match)

**Between-Rounds Disconnect:**
- Grace period: 20 seconds
- UI: "Waiting for opponent... ⏱️ 20s"
- Block next round from starting
- If timeout: Forfeit entire match

**Repeat Offender:**
- 3rd disconnect in same match: 5-second grace only
- Auto-forfeit on timeout

**Reconnection Identity:** Session ID in WebSocket URL query params.

---

## UI/UX Specification

### Home Page Easter Egg

**Time-of-day trigger:**
```tsx
function getTimeEmoji() {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return '☀️'
  if (hour >= 12 && hour < 18) return '🌤️'
  if (hour >= 18 && hour < 24) return '🌙'
  return '⭐'
}

<footer>
  Built with <span className="battleworld-trigger">{getTimeEmoji()}</span> in San Francisco
</footer>
```

**Power-up effects (2+ users hovering):**
```css
/* Screen shake */
@keyframes shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-2px, 2px); }
  20% { transform: translate(2px, -2px); }
  /* ... */
}

body.battleworld-active {
  animation: shake 0.5s infinite;
}

/* Trigger glow */
.battleworld-trigger.powered-up {
  animation: glow 0.3s ease-in-out infinite alternate;
  box-shadow: 0 0 20px rgba(255, 100, 0, 0.8);
  cursor: pointer;
}
```

### Battle UI (Fighting Game Style)

```tsx
<BattleView>
  {/* Top: Score bar */}
  <ScoreBar>
    <PlayerSide>
      <Initials>ACE</Initials>
      <Wins>●●○</Wins> {/* 2 wins */}
    </PlayerSide>
    <Timer phase={phase}>{countdown}s</Timer>
    <PlayerSide>
      <Wins>●○○</Wins>
      <Initials>BOB</Initials>
    </PlayerSide>
  </ScoreBar>

  {/* Center: Choices */}
  <ChoiceDisplay>
    <PlayerChoice side="left">
      <Icon active={myChoice === 'rock'}>✊</Icon>
      <Icon active={myChoice === 'scissors'}>✌️</Icon>
      <Icon active={myChoice === 'paper'}>✋</Icon>
    </PlayerChoice>
    <VS>VS</VS>
    <PlayerChoice side="right">
      {/* Opponent's current choice */}
      <Icon active={opponentChoice === 'rock'}>✊</Icon>
      <Icon active={opponentChoice === 'scissors'}>✌️</Icon>
      <Icon active={opponentChoice === 'paper'}>✋</Icon>
    </PlayerChoice>
  </ChoiceDisplay>

  {/* Bottom: Input hints */}
  <InputHints>
    <Key>←</Key> Rock • <Key>↑</Key> Scissors • <Key>→</Key> Paper
  </InputHints>
</BattleView>
```

**Mobile:**
Large touch buttons instead of keyboard hints.

---

## Implementation Phases

### Phase 0: Setup (Week 1)
- [ ] Create new TanStack Start project (`npm create @tanstack/start@latest`)
- [ ] Configure `cloudflare-pages` preset in `app.config.ts`
- [ ] Set up Wrangler for local dev (`wrangler dev`)
- [ ] Create D1 database (`wrangler d1 create battleworld`)
- [ ] Install TinyBase (`npm install tinybase tinybase/ui-react`)
- [ ] Install Better Auth (`npm install better-auth`)
- [ ] Run migrations (create tables)
- [ ] Deploy "Hello World" to validate Cloudflare setup

### Phase 1: Cursor Tracking (Week 2)
- [ ] Create `CursorRoom` Durable Object
- [ ] Build custom TinyBase WebSocket persister
- [ ] Add cursor tracking to home page (React component)
- [ ] Implement easter egg trigger (time-of-day element)
- [ ] Create `TriggerRoom` Durable Object (hover detection)
- [ ] Add power-up effects (CSS animations)
- [ ] Test with 5+ concurrent users

### Phase 2: Queue System (Week 3)
- [ ] Build `/battleworld` route (TanStack Start)
- [ ] Create arcade-style initials input component
- [ ] Create `QueueRoom` Durable Object (FIFO matching)
- [ ] Implement queue position UI
- [ ] Build spectator mode (list of active battles)
- [ ] Test matchmaking with multiple pairs

### Phase 3: Core Game (Week 4-5)
- [ ] Create `BattleRoom` Durable Object
- [ ] Implement state machine (countdown → choosing → reveal)
- [ ] Add `onAlarm` for synchronized countdown
- [ ] Handle arrow key inputs (desktop)
- [ ] Handle touch inputs (mobile)
- [ ] Broadcast choices in real-time
- [ ] Implement RPS win logic
- [ ] Best-of-3 tracking
- [ ] Build battle UI components
- [ ] Add replay animation
- [ ] Test with 10+ concurrent battles

### Phase 4: Disconnection (Week 6)
- [ ] Implement grace period timers
- [ ] Add reconnection logic (sessionId matching)
- [ ] Build disconnection UI
- [ ] Track repeat offenders
- [ ] Test network interruption scenarios

### Phase 5: Auth & Persistence (Week 7)
- [ ] Integrate Better Auth (magic link + GitHub)
- [ ] Build anonymous session creation
- [ ] Save games to D1 after each match
- [ ] Build high score leaderboard
- [ ] Implement "Claim Account" flow
- [ ] Test session upgrade

### Phase 6: Polish & Deploy (Week 8)
- [ ] Add sound effects
- [ ] Optimize Durable Object hibernation
- [ ] Performance testing (50+ concurrent users)
- [ ] Production deployment
- [ ] Monitor and iterate

---

## Migration Strategy

### Recommended: Separate Deployment

Keep Astro for content, deploy Battleworld as separate app:

```
agodinez.com (Astro + Cloudflare Pages)
  ├─ / → Astro static
  ├─ /memorabilia → Astro static
  └─ /moodboard → Astro SSR

battleworld.agodinez.com (TanStack Start + Cloudflare Pages)
  ├─ / → Game UI
  └─ Durable Objects
```

**OR use Cloudflare routing:**

```
agodinez.com (Cloudflare Workers routing)
  ├─ / → Astro (Worker 1)
  ├─ /battleworld/* → TanStack Start (Worker 2)
  └─ /_durable/* → Durable Objects (Worker 2)
```

**Pros:**
- Minimal disruption to existing site
- Independent development/testing
- Easy rollback

**Cons:**
- Cursor tracking needs CORS setup (or same-origin routing)

**Alternative (full migration to TanStack Start):**
- Higher effort (~2-3 weeks to port content pages)
- Benefits: unified codebase, better TypeScript DX
- Drawback: Content pages ship larger bundles

---

## Cost Estimate

**Monthly (1000 daily games, 5000 daily visitors):**

```
Cloudflare Workers:           Free tier (100k req/day)
Cloudflare D1:                Free tier (5M reads, 100k writes)
Durable Objects:              ~$5-10
  - BattleRoom: ~50k requests
  - CursorRoom: ~500k requests (cursor updates)
  - Storage: <1GB

Total: $5-15/month
```

Compare to ElectricSQL approach: $50-60/month (Neon + ElectricSQL SaaS).

---

## Next Steps

1. Review this architecture with stakeholders
2. Decide: separate deployment or full migration?
3. Set up dev environment (Phase 0)
4. Build proof-of-concept (cursor tracking) to validate
5. Start Phase 1

**Timeline:** 8 weeks to production-ready game.

---

## References

- [TinyBase Docs](https://tinybase.org)
- [Cloudflare Durable Objects](https://developers.cloudflare.com/durable-objects)
- [Better Auth](https://www.better-auth.com)
- [TanStack Start](https://tanstack.com/start)
- Research docs: `plans/multiplayer-framework-comparison.md`, `plans/rps-disconnection-handling.md`
