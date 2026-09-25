# 🎮 Battleworld: Multiplayer Rock-Paper-Scissors Game Architecture

**Feature**: Real-time best-of-3 RPS game with cursor tracking, spectating, and high scores
**Date**: February 24, 2026
**Status**: Architecture + Implementation Plan

---

## Table of Contents

1. [Feature Overview](#feature-overview)
2. [Tech Stack Decision](#tech-stack-decision)
3. [Architecture](#architecture)
4. [Game Flow](#game-flow)
5. [Authentication Strategy](#authentication-strategy)
6. [Disconnection Handling](#disconnection-handling)
7. [UI/UX Specification](#ui-ux-specification)
8. [Implementation Phases](#implementation-phases)
9. [Migration Strategy](#migration-strategy)
10. [References](#references)

---

## Feature Overview

### Core Mechanics

**Home Page Cursor Tracking:**
- All visitors see each other's cursors in real-time (site-wide)
- Hidden "Enter Battleworld" trigger (easter egg)
- When 2+ users hover over trigger simultaneously:
  - Screen shakes (camera movement effect)
  - Trigger area glows rapidly (powering up effect)
  - DOM element changes based on time of day

**Game Loop:**
1. User hovers trigger → `/battleworld` route
2. Enter 3-character initials (arcade-style)
3. Join FIFO queue (see spectator mode + queue position)
4. Match with opponent (first 2 in queue)
5. Best-of-3 RPS rounds (3-second countdown per round)
6. Real-time choice visualization (arrow keys → rock/paper/scissors icons)
7. Post-game: show replay animation + "You Won!/You Lost!"
8. High score screen (leaderboard)
9. Optional: claim account (magic link or GitHub OAuth) to save scores cross-device

**Input:**
- **Desktop:** Arrow keys (Left = Rock, Up = Scissors, Right = Paper)
- **Mobile:** Touch buttons for Rock/Paper/Scissors

**Timing:**
- 3-second countdown synchronized across both players
- Last input before timer expires = final choice
- Both players see opponent's choice updating in real-time

**Disconnection:**
- In-round: 10-second grace → forfeit current round (not match)
- Between rounds: 20-second grace → forfeit match
- 3rd disconnect: instant forfeit (anti-rage-quit)

---

## Tech Stack Decision

### Framework: TanStack Start + PartyKit on Cloudflare

**Why TanStack Start won:**
- ✅ Native Cloudflare Pages support with typed RPC (`createServerFn`)
- ✅ Seamless PartyKit integration (`useSync` hook for optimistic updates)
- ✅ Best-in-class TypeScript DX for game state synchronization
- ✅ Bundle size acceptable for React (~45-50KB gzipped)
- ✅ Hibernatable Durable Objects for efficient game sessions
- ✅ PartyKit's `onAlarm` for synchronized countdown timers

**Alternatives considered:**
| Framework | Pros | Cons | Verdict |
|---|---|---|---|
| **Astro + custom Worker** | Already in use, no migration | Manual WebSocket setup, no typed RPC, complex Durable Object integration | ❌ Too complex |
| **Next.js 15** | Great DX | ❌ No WebSocket support on Cloudflare Pages | ❌ Not viable |
| **SvelteKit** | Smaller bundle (30-35KB) | Smaller ecosystem, team less familiar with Svelte | ⚠️ Runner-up |

### Core Libraries

| Layer | Tool | Purpose |
|---|---|---|
| **Framework** | TanStack Start | React framework with Cloudflare preset |
| **Real-time sync** | PartyKit | WebSocket connections via Durable Objects |
| **Client state** | TinyBase | Reactive store for game state (optional) |
| **Persistence** | Cloudflare D1 | SQLite database for high scores, user accounts |
| **ORM** | Drizzle ORM | Type-safe database queries |
| **Auth** | Better Auth | Magic link + GitHub OAuth, Cloudflare D1 adapter |
| **Styling** | Existing CSS | Port from Astro (plain CSS, fully compatible) |
| **UI Components** | Radix UI | Already in use (Accordion, Dialog, etc.) |

### Why NOT CRDTs (Yjs, Automerge)?

**Rock-Paper-Scissors is authoritative server game:**
- Turn-based, deterministic outcomes (rock beats scissors, etc.)
- No need for conflict-free replicated data types
- Simpler to reason about: server is source of truth
- Lower latency: clients send inputs, server broadcasts outcomes

**CRDTs are overkill** for:
- Games with clear winners/losers decided by server
- Real-time synchronized timers (PartyKit `onAlarm` handles this)
- Sequential turn-based mechanics

**Use CRDTs for** (not this game):
- Collaborative document editing (Yjs shines here)
- Conflict resolution when multiple users edit same data
- Offline-first apps with eventual consistency

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare Pages (TanStack Start)                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  /                    (home - Astro static or TanStack)   │
│  /memorabilia         (static)                             │
│  /battleworld         (SSR - game UI)                      │
│  /api/high-scores     (serverFn - D1 queries)              │
│                                                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ PartyKit Durable Objects (Game Server)                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  CursorRoom         - Tracks all cursors on home page      │
│  TriggerRoom        - Monitors hover over "Enter" trigger  │
│  QueueRoom          - FIFO matchmaking queue               │
│  BattleRoom:${id}   - Individual game session (2 players)  │
│  SpectatorRoom      - Broadcasts active battles to viewers │
│                                                             │
└──────────────┬──────────────────────────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────────────────────────┐
│ Cloudflare D1 (Persistent Storage)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  users           - id, initials, email, github_id, avatar  │
│  sessions        - id, user_id, created_at, expires_at     │
│  games           - id, player1_id, player2_id, winner_id   │
│  high_scores     - id, user_id, wins, losses, streak       │
│  replays         - id, game_id, round_data (JSON)          │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### PartyKit Room Architecture

**1. CursorRoom** (home page)
```ts
// party/cursor.ts
export default class CursorRoom implements Party.Server {
  cursors: Map<string, { x: number; y: number; userId: string }>

  onConnect(connection: Party.Connection) {
    // Send all current cursors to new user
    connection.send({ type: 'init', cursors: [...this.cursors.values()] })
  }

  onMessage(message: string, sender: Party.Connection) {
    const { x, y } = JSON.parse(message)
    this.cursors.set(sender.id, { x, y, userId: sender.id })
    this.party.broadcast(JSON.stringify({ type: 'move', id: sender.id, x, y }))
  }
}
```

**2. TriggerRoom** (easter egg activation)
```ts
// party/trigger.ts
export default class TriggerRoom implements Party.Server {
  hovering: Set<string> = new Set()

  onMessage(message: string, sender: Party.Connection) {
    const { type, trigger } = JSON.parse(message)
    if (type === 'hover') {
      this.hovering.add(sender.id)
      if (this.hovering.size >= 2) {
        // Activate power-up effect
        this.party.broadcast(JSON.stringify({ type: 'activate', count: this.hovering.size }))
      }
    } else if (type === 'leave') {
      this.hovering.delete(sender.id)
      this.party.broadcast(JSON.stringify({ type: 'deactivate', count: this.hovering.size }))
    }
  }
}
```

**3. QueueRoom** (matchmaking)
```ts
// party/queue.ts
export default class QueueRoom implements Party.Server {
  queue: Array<{ userId: string, initials: string, connection: Party.Connection }> = []

  onMessage(message: string, sender: Party.Connection) {
    const { type, initials } = JSON.parse(message)
    if (type === 'join') {
      this.queue.push({ userId: sender.id, initials, connection: sender })

      // Broadcast queue position to all
      this.broadcastQueueState()

      // Match first two in queue
      if (this.queue.length >= 2) {
        const [player1, player2] = this.queue.splice(0, 2)
        this.createBattle(player1, player2)
      }
    }
  }

  async createBattle(p1, p2) {
    const battleId = crypto.randomUUID()
    // Redirect both players to battle room
    p1.connection.send({ type: 'matched', battleId, opponent: p2.initials })
    p2.connection.send({ type: 'matched', battleId, opponent: p1.initials })
  }
}
```

**4. BattleRoom** (game session)
```ts
// party/battle.ts
export default class BattleRoom implements Party.Server {
  state: {
    player1: { id: string, choice: 'rock'|'paper'|'scissors'|null, score: number }
    player2: { id: string, choice: 'rock'|'paper'|'scissors'|null, score: number }
    round: number
    phase: 'countdown' | 'choosing' | 'reveal' | 'finished'
    countdown: number
  }

  async onAlarm() {
    // Countdown tick (runs every 1 second)
    if (this.state.phase === 'countdown') {
      this.state.countdown -= 1
      if (this.state.countdown === 0) {
        this.state.phase = 'choosing'
        this.startChoosingPhase()
      }
      this.broadcastState()
    } else if (this.state.phase === 'choosing') {
      // 3-second timer expired → reveal
      this.resolveRound()
    }
  }

  onMessage(message: string, sender: Party.Connection) {
    const { type, choice } = JSON.parse(message)

    if (type === 'choose') {
      // Update player choice in real-time
      if (sender.id === this.state.player1.id) {
        this.state.player1.choice = choice
      } else {
        this.state.player2.choice = choice
      }
      // Broadcast so opponent sees current choice
      this.broadcastState()
    }
  }

  async startChoosingPhase() {
    this.state.phase = 'choosing'
    // Set alarm for 3 seconds from now
    await this.party.storage.setAlarm(Date.now() + 3000)
  }

  resolveRound() {
    const { player1, player2 } = this.state
    const winner = this.determineWinner(player1.choice, player2.choice)

    if (winner === 1) player1.score += 1
    else if (winner === 2) player2.score += 1

    this.state.phase = 'reveal'
    this.broadcastState()

    // Check if match is over (best of 3)
    if (player1.score === 2 || player2.score === 2) {
      this.endMatch()
    } else {
      // Next round after 2-second delay
      setTimeout(() => this.startNextRound(), 2000)
    }
  }

  determineWinner(c1, c2): 0 | 1 | 2 {
    if (c1 === c2) return 0 // tie
    if (c1 === 'rock' && c2 === 'scissors') return 1
    if (c1 === 'scissors' && c2 === 'paper') return 1
    if (c1 === 'paper' && c2 === 'rock') return 1
    return 2
  }

  async endMatch() {
    this.state.phase = 'finished'
    this.broadcastState()

    // Save game result to D1
    await fetch('/api/save-game', {
      method: 'POST',
      body: JSON.stringify({
        player1Id: this.state.player1.id,
        player2Id: this.state.player2.id,
        winnerId: this.state.player1.score === 2 ? this.state.player1.id : this.state.player2.id,
        rounds: this.state.rounds
      })
    })
  }
}
```

---

## Game Flow

### Detailed User Journey

#### Phase 1: Home Page (Cursor Tracking)

```
User lands on home page
  ├─> React island mounts: <CursorTracker />
  ├─> PartySocket connects to CursorRoom
  ├─> User moves mouse
  │     └─> Send {x, y} to CursorRoom every 16ms (60fps throttled)
  ├─> Render other users' cursors from PartyKit state
  └─> Hidden trigger element (DOM node that changes by time of day)
        ├─> User hovers trigger
        │     └─> Send 'hover' event to TriggerRoom
        ├─> TriggerRoom broadcasts if >=2 users hovering
        │     ├─> Screen shake effect (CSS animation)
        │     └─> Trigger glows rapidly (keyframe animation)
        └─> User clicks trigger → Navigate to /battleworld
```

#### Phase 2: Enter Battleworld

```
/battleworld loads
  ├─> Show arcade-style initials input (3 characters, A-Z 0-9)
  ├─> User enters initials (e.g., "ACE")
  │     └─> Store in localStorage for session continuity
  ├─> Click "Enter Queue"
  │     └─> PartySocket connects to QueueRoom
  │           └─> Send { type: 'join', initials: 'ACE' }
  └─> Queue UI updates showing position (e.g., "You're #3 in queue")
```

#### Phase 3: Spectator Mode (While Waiting)

```
While in queue:
  ├─> PartySocket connects to SpectatorRoom
  ├─> See list of active battles
  │     └─> Each shows: "ACE vs BOB - Round 2 (ACE: 1, BOB: 0)"
  ├─> Click to spectate a battle
  │     └─> Join BattleRoom as observer (read-only)
  │           ├─> See both players' choices in real-time
  │           └─> See countdown timer
  └─> When matched → Disconnect from SpectatorRoom, join BattleRoom as player
```

#### Phase 4: Battle (Best of 3)

```
Matched with opponent
  ├─> Both players join BattleRoom:{id}
  ├─> Server starts Round 1
  │     ├─> Phase: 'countdown' (3, 2, 1...)
  │     ├─> Phase: 'choosing' (3-second timer)
  │     │     ├─> Player presses arrow keys (desktop) or taps icons (mobile)
  │     │     │     └─> Left = Rock, Up = Scissors, Right = Paper
  │     │     ├─> Each keystroke updates local choice
  │     │     │     └─> Send to server → Broadcast to opponent
  │     │     └─> Opponent sees player's cursor snap to icon in real-time
  │     ├─> Timer expires → Server reads last choice from each player
  │     ├─> Phase: 'reveal'
  │     │     ├─> Replay animation (both choices shown simultaneously)
  │     │     └─> Show result: "You Won Round 1!" or "You Lost Round 1"
  │     └─> Update score counter at top (Fighting game style: ●○○ vs ○●○)
  ├─> Round 2 starts after 2-second delay
  ├─> Round 3 (if tied 1-1)
  └─> Match ends when one player reaches 2 wins
```

#### Phase 5: Post-Game

```
Match ends
  ├─> Show full-screen result: "YOU WON!" or "YOU LOST!"
  ├─> Replay animation of all 3 rounds
  ├─> Server saves game to D1:
  │     ├─> games table (player IDs, winner, timestamp)
  │     ├─> replays table (round-by-round choices)
  │     └─> high_scores table (update win/loss counts)
  ├─> Show high score screen (top 10 leaderboard)
  │     └─> "You're ranked #42 with 5 wins, 3 losses"
  └─> Options:
        ├─> "Play Again" → Return to queue
        ├─> "Claim Your Account" → Magic link or GitHub OAuth
        └─> "Exit to Home" → Return to home page
```

---

## Authentication Strategy

### Play-First, Auth-Optional Pattern

**Goal:** Let users play immediately without signup, then optionally claim their account.

### Three Identity Levels

| Level | Storage | Cross-Device | Persistence |
|---|---|---|---|
| **Anonymous** | `localStorage` session ID | ❌ No | Until browser clear |
| **Initials-only** | Cookie + D1 `sessions` table | ❌ No | 30 days |
| **Claimed** | D1 `users` table (email or GitHub) | ✅ Yes | Permanent |

### Implementation with Better Auth

**Better Auth** (https://www.better-auth.com) provides:
- ✅ Cloudflare D1 adapter (native support)
- ✅ Magic link authentication (email-based, no password)
- ✅ GitHub OAuth built-in
- ✅ Anonymous session upgrade (guest → authenticated)
- ✅ Session cookies with automatic renewal

**Setup:**
```bash
npm install better-auth
```

```ts
// src/lib/auth.ts
import { betterAuth } from 'better-auth'
import { d1 } from 'better-auth/adapters/d1'

export const auth = betterAuth({
  database: d1({
    binding: env.DB // Cloudflare D1 binding
  }),
  emailAndPassword: {
    enabled: false // We don't want passwords
  },
  magicLink: {
    enabled: true,
    expiresIn: 300 // 5 minutes
  },
  socialProviders: {
    github: {
      clientId: env.GITHUB_CLIENT_ID,
      clientSecret: env.GITHUB_CLIENT_SECRET
    }
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 30 * 24 * 60 * 60 // 30 days
    }
  }
})
```

### Flow: Anonymous → Claimed

**Step 1: First visit**
```ts
// Client-side (first page load)
const sessionId = localStorage.getItem('battleworld_session') ||
  crypto.randomUUID()
localStorage.setItem('battleworld_session', sessionId)

// Games are associated with this sessionId in D1
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

// Server creates row in `sessions` table
// All games from this session are now associated with "ACE"
```

**Step 3: Claim account (optional)**
```tsx
// UI shown after game ends
<Dialog>
  <h2>Save your high score!</h2>
  <p>You've won 5 games as "ACE". Claim this account to access your stats from any device.</p>

  <Button onClick={() => auth.sendMagicLink({ email })}>
    Email me a magic link
  </Button>

  <Button onClick={() => auth.signIn.social({ provider: 'github' })}>
    Sign in with GitHub
  </Button>
</Dialog>
```

**Step 4: Magic link flow**
```
User enters email → Server sends magic link (expires in 5 min)
  → User clicks link → Server verifies token
  → Create user record in D1 `users` table
  → Migrate all games from sessionId to user.id
  → Set authenticated session cookie
  → User now logged in, high scores persist across devices
```

**Database Schema:**
```sql
-- D1 Schema
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  initials TEXT NOT NULL,
  email TEXT UNIQUE,
  github_id TEXT UNIQUE,
  github_username TEXT,
  avatar_url TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  anonymous_id TEXT,
  initials TEXT,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE games (
  id TEXT PRIMARY KEY,
  player1_user_id TEXT,
  player2_user_id TEXT,
  winner_user_id TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (player1_user_id) REFERENCES users(id),
  FOREIGN KEY (player2_user_id) REFERENCES users(id)
);

CREATE TABLE high_scores (
  user_id TEXT PRIMARY KEY,
  wins INTEGER DEFAULT 0,
  losses INTEGER DEFAULT 0,
  win_streak INTEGER DEFAULT 0,
  best_streak INTEGER DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## Disconnection Handling

### Policy (from research)

**In-Round Disconnect (active turn):**
- Grace period: 10 seconds
- UI: "Opponent disconnected... ⏱️ 10s"
- If reconnects: Resume immediately
- If timeout: Forfeit current round only (not entire match)

**Between-Rounds Disconnect:**
- Grace period: 20 seconds
- UI: "Waiting for opponent... ⏱️ 20s"
- If reconnects: Continue from current score
- If timeout: Forfeit entire match

**Repeat Offender:**
- 3rd disconnect in same match: Instant forfeit (5-second grace only)
- Track disconnect count per player session

**Implementation:**
```ts
// party/battle.ts
onDisconnect(connection: Party.Connection) {
  const disconnectedPlayer = this.getPlayer(connection.id)
  const gracePeriod = this.state.phase === 'choosing' ? 10000 : 20000

  // Notify opponent
  this.broadcast({
    type: 'opponent_disconnected',
    gracePeriod,
    timestamp: Date.now()
  })

  // Start countdown
  this.disconnectTimer = setTimeout(() => {
    this.forfeitMatch(disconnectedPlayer.id)
  }, gracePeriod)
}

onConnect(connection: Party.Connection) {
  // Reconnection - clear timer
  if (this.disconnectTimer) {
    clearTimeout(this.disconnectTimer)
    this.broadcast({ type: 'opponent_reconnected' })
  }
}
```

---

## UI/UX Specification

### Home Page Easter Egg

**Trigger Element:**
- Changes based on time of day:
  - 6am-12pm: ☀️ (sun emoji in text)
  - 12pm-6pm: 🌤️ (cloud emoji)
  - 6pm-12am: 🌙 (moon emoji)
  - 12am-6am: ⭐ (star emoji)
- Hidden in plain sight (part of regular copy, not obvious button)
- Example: "Built with ☀️ in San Francisco"

**Power-Up Effect (2+ users hovering):**
```css
/* Screen shake */
@keyframes shake {
  0%, 100% { transform: translate(0, 0); }
  10% { transform: translate(-2px, 2px); }
  20% { transform: translate(2px, -2px); }
  30% { transform: translate(-2px, -2px); }
  /* ... */
}

body.battleworld-active {
  animation: shake 0.5s infinite;
}

/* Trigger glow */
.trigger.powered-up {
  animation: glow 0.3s ease-in-out infinite alternate;
  box-shadow: 0 0 20px rgba(255, 100, 0, 0.8);
}
```

### Battleworld UI

**Initials Input (Arcade Style):**
```tsx
<InitialsInput>
  {/* 3 character slots, A-Z 0-9 */}
  <CharSlot value="A" onUp={() => increment(0)} onDown={() => decrement(0)} />
  <CharSlot value="C" onUp={() => increment(1)} onDown={() => decrement(1)} />
  <CharSlot value="E" onUp={() => increment(2)} onDown={() => decrement(2)} />
  <EnterButton disabled={!isValid}>ENTER QUEUE</EnterButton>
</InitialsInput>
```

**Queue UI:**
```tsx
<QueueView>
  <QueuePosition>You're #{position} in queue</QueuePosition>
  <ActiveBattles>
    <h3>Active Battles (Click to spectate)</h3>
    {battles.map(b => (
      <BattleCard key={b.id} onClick={() => spectate(b.id)}>
        <Players>{b.player1} vs {b.player2}</Players>
        <Score>Round {b.round} • {b.score1}-{b.score2}</Score>
      </BattleCard>
    ))}
  </ActiveBattles>
</QueueView>
```

**Battle UI (Fighting Game Style):**
```tsx
<BattleView>
  {/* Top: Score indicators */}
  <ScoreBar>
    <PlayerSide>
      <Initials>ACE</Initials>
      <Wins>●●○</Wins> {/* 2 wins, 1 remaining */}
    </PlayerSide>
    <Timer>{countdown}s</Timer>
    <PlayerSide>
      <Wins>●○○</Wins>
      <Initials>BOB</Initials>
    </PlayerSide>
  </ScoreBar>

  {/* Center: Choices */}
  <ChoiceDisplay>
    <PlayerChoice side="left">
      {/* Cursor animates to current choice */}
      <Icon active={myChoice === 'rock'}>✊</Icon>
      <Icon active={myChoice === 'scissors'}>✌️</Icon>
      <Icon active={myChoice === 'paper'}>✋</Icon>
    </PlayerChoice>

    <VS>VS</VS>

    <PlayerChoice side="right">
      {/* Show opponent's current choice */}
      <Icon active={opponentChoice === 'rock'}>✊</Icon>
      <Icon active={opponentChoice === 'scissors'}>✌️</Icon>
      <Icon active={opponentChoice === 'paper'}>✋</Icon>
    </PlayerChoice>
  </ChoiceDisplay>

  {/* Bottom: Input hints */}
  <InputHints>
    <Key>←</Key> Rock
    <Key>↑</Key> Scissors
    <Key>→</Key> Paper
  </InputHints>
</BattleView>
```

**Mobile UI:**
```tsx
<MobileBattle>
  {/* Large touch targets */}
  <ChoiceButtons>
    <Button onTouchStart={() => choose('rock')}>
      <Icon>✊</Icon>
      <Label>ROCK</Label>
    </Button>
    <Button onTouchStart={() => choose('scissors')}>
      <Icon>✌️</Icon>
      <Label>SCISSORS</Label>
    </Button>
    <Button onTouchStart={() => choose('paper')}>
      <Icon>✋</Icon>
      <Label>PAPER</Label>
    </Button>
  </ChoiceButtons>
</MobileBattle>
```

---

## Implementation Phases

### Phase 0: Preparation (Week 1)
- [ ] Set up TanStack Start project with Cloudflare preset
- [ ] Configure Drizzle ORM + D1 locally (Wrangler dev)
- [ ] Set up Better Auth with magic link + GitHub OAuth
- [ ] Create database schema and run migrations
- [ ] Deploy "Hello World" to Cloudflare Pages (validate deployment)

### Phase 1: Cursor Tracking (Week 2)
- [ ] Create PartyKit `CursorRoom`
- [ ] Implement cursor sync on home page (React island)
- [ ] Add easter egg trigger element (time-of-day logic)
- [ ] Implement `TriggerRoom` (hover detection)
- [ ] Add power-up effects (screen shake + glow)
- [ ] Test with multiple users simultaneously

### Phase 2: Queue System (Week 3)
- [ ] Build `/battleworld` route (initials input UI)
- [ ] Create PartyKit `QueueRoom`
- [ ] Implement FIFO matchmaking
- [ ] Show queue position in real-time
- [ ] Create `SpectatorRoom` for active battles
- [ ] Build spectator UI (list of active games)

### Phase 3: Core Game Logic (Week 4-5)
- [ ] Create PartyKit `BattleRoom`
- [ ] Implement state machine (countdown → choosing → reveal → next round)
- [ ] Add synchronized countdown timer (`onAlarm`)
- [ ] Handle arrow key inputs (desktop)
- [ ] Handle touch inputs (mobile)
- [ ] Broadcast choices in real-time
- [ ] Implement RPS win logic
- [ ] Add best-of-3 tracking
- [ ] Build battle UI (fighting game style)
- [ ] Add replay animation
- [ ] Test with 2+ concurrent battles

### Phase 4: Disconnection Handling (Week 6)
- [ ] Implement grace period timers
- [ ] Add reconnection logic
- [ ] Build disconnection UI ("Opponent disconnected...")
- [ ] Track repeat offenders
- [ ] Test network interruption scenarios

### Phase 5: Persistence & Auth (Week 7)
- [ ] Integrate Better Auth
- [ ] Build anonymous session creation
- [ ] Save games to D1 after each match
- [ ] Build high score leaderboard
- [ ] Implement "Claim Account" flow (magic link + GitHub)
- [ ] Test session upgrade (anonymous → authenticated)

### Phase 6: Polish & Production (Week 8)
- [ ] Add sound effects (optional)
- [ ] Optimize PartyKit hibernation
- [ ] Add analytics (Cloudflare Web Analytics)
- [ ] Performance testing (load test with 50+ concurrent users)
- [ ] Production deployment
- [ ] Monitor and iterate

---

## Migration Strategy

### Option A: Keep Astro, Add Battleworld Separately

**Architecture:**
```
agodinez.com (Astro on Cloudflare Pages)
  ├─ / → Astro static
  ├─ /memorabilia → Astro static
  └─ /moodboard → Astro SSR

battleworld.agodinez.com (TanStack Start on Cloudflare Pages)
  ├─ / → TanStack Start
  └─ PartyKit rooms
```

**Pros:**
- ✅ Minimal disruption to existing site
- ✅ Can develop/test Battleworld independently
- ✅ Rollback is easy (just remove subdomain)

**Cons:**
- ❌ Cursor tracking on home page requires cross-origin setup
- ❌ Two separate deployments to manage

### Option B: Migrate Entire Site to TanStack Start

**Architecture:**
```
agodinez.com (TanStack Start on Cloudflare Pages)
  ├─ / → TanStack Start (port from Astro)
  ├─ /memorabilia → TanStack Start
  ├─ /moodboard → TanStack Start
  ├─ /battleworld → TanStack Start
  └─ PartyKit rooms
```

**Pros:**
- ✅ Single codebase, unified deployment
- ✅ Cursor tracking works seamlessly (same origin)
- ✅ Better TypeScript DX across entire site

**Cons:**
- ❌ Higher migration effort (~2-3 weeks)
- ❌ Nav + ViewTransitions need full rewrite
- ❌ Content pages ship larger bundles (+150KB React)

### Recommendation: Start with Option A, Consider Option B Later

**Rationale:**
- Get Battleworld to market faster
- Validate game mechanics before committing to full migration
- Cursor tracking can work cross-origin with proper CORS setup
- If game is successful and site becomes more app-like, migrate then

---

## References

### Documentation
- [TanStack Start](https://tanstack.com/start/latest)
- [PartyKit](https://docs.partykit.io)
- [Better Auth](https://www.better-auth.com)
- [Cloudflare D1](https://developers.cloudflare.com/d1/)
- [Drizzle ORM](https://orm.drizzle.team)

### Research Documents (Created by Agents)
- `plans/multiplayer-framework-comparison.md` - Framework evaluation
- `plans/rps-disconnection-handling.md` - Disconnection policy + Socket.IO patterns

### Key GitHub Examples
- TanStack Start + Cloudflare + Drizzle: Search GitHub for recent examples (Feb 2026)
- PartyKit game examples: https://github.com/partykit/partykit/tree/main/examples

---

## Next Steps

1. **Review this plan** with stakeholders
2. **Decide on migration strategy** (Option A or B)
3. **Set up dev environment** (TanStack Start + Wrangler + D1)
4. **Start Phase 0** (preparation week)
5. **Build proof of concept** (cursor tracking + queue) to validate architecture

**Estimated Total Timeline:** 8 weeks (2 months) to production-ready game

**Critical Path:** Phases 1-3 (cursor tracking, queue, game logic) are sequential. Phases 4-5 (disconnection, auth) can be parallelized.