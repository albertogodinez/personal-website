# RPS Game: Player Disconnection Handling Strategy

**Research Date**: February 24, 2026
**Focus**: Fair, UX-friendly disconnection policy for Rock-Paper-Scissors multiplayer game

---

## Executive Summary

Based on research of Socket.IO best practices, Page Visibility API standards, and competitive gaming patterns, here's the recommended disconnection policy for your RPS game:

**Grace Period: 10 seconds for in-round disconnects, 20 seconds between rounds**

---

## 1. Socket.IO Reconnection Configuration

### Recommended Client Setup

```javascript
import { io } from 'socket.io-client';

const socket = io('wss://your-server.com', {
  // Reconnection settings
  reconnection: true,              // Enable auto-reconnect
  reconnectionAttempts: 3,         // Try 3 times before giving up
  reconnectionDelay: 1000,         // Start with 1s delay
  reconnectionDelayMax: 5000,      // Max 5s between attempts
  randomizationFactor: 0.5,        // Prevent thundering herd
  timeout: 20000,                  // 20s timeout per attempt

  autoConnect: true
});
```

### Exponential Backoff Pattern

- **Attempt 1**: 500-1500ms delay
- **Attempt 2**: 1000-3000ms delay
- **Attempt 3**: 2000-5000ms delay
- **After 3 attempts**: Give up, show "Connection lost" UI

**Why randomization?** Prevents all clients from reconnecting simultaneously after server restart.

---

## 2. Recommended Disconnection Policy

### Tier 1: In-Round Disconnect (Active Turn)

```
Grace Period: 10 seconds
Behavior:
  - Show "Opponent disconnected... (⏱️ 10s)"
  - Display countdown timer
  - If reconnects → Resume immediately
  - If timeout → Forfeit CURRENT ROUND ONLY (not entire match)

Rationale: 10s covers brief network hiccups while keeping game flowing
```

### Tier 2: Between-Rounds Disconnect

```
Grace Period: 20 seconds
Behavior:
  - Show "Waiting for opponent... (⏱️ 20s)"
  - Block next round from starting
  - If reconnects → Continue from current score
  - If timeout → Forfeit entire match

Rationale: More forgiving since no active turn is interrupted
```

### Tier 3: Repeat Offender

```
Grace Period: 5 seconds (reduced)
Trigger: 2+ disconnects in same match
Behavior:
  - Show warning: "Connection unstable"
  - 3rd disconnect → Automatic forfeit

Rationale: Prevents abuse while acknowledging unstable connections
```

---

## 3. Page Visibility API Integration

Handle tab backgrounding/mobile suspension gracefully:

```javascript
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab backgrounded
    pauseGameAnimations();
    muteAudio();
    // Note: WebSocket stays active, but may timeout from browser throttling
  } else {
    // Tab foregrounded
    resumeGameAnimations();
    unmuteAudio();
    syncGameState(); // Fetch latest state from server
  }
});
```

**Mobile considerations**: iOS Safari and Android Chrome aggressively suspend background tabs. Expect more frequent disconnects on mobile.

---

## 4. Server-Side Implementation

```javascript
const io = require('socket.io')(server);
const games = new Map(); // gameId -> game state

io.on('connection', (socket) => {
  let currentGame = null;

  socket.on('join-game', (gameId) => {
    currentGame = games.get(gameId);
    socket.join(gameId);

    // Handle reconnection
    if (currentGame?.disconnectTimer) {
      clearTimeout(currentGame.disconnectTimer);
      socket.to(gameId).emit('opponent-reconnected');
      socket.emit('game-state', currentGame.state);
    }
  });

  socket.on('disconnect', (reason) => {
    if (!currentGame) return;

    // Determine grace period based on game phase
    const gracePeriod = currentGame.phase === 'in-round' ? 10000 : 20000;

    // Notify opponent
    socket.to(currentGame.id).emit('opponent-disconnected', {
      gracePeriod,
      timestamp: Date.now()
    });

    // Start forfeit countdown
    currentGame.disconnectTimer = setTimeout(() => {
      handleForfeit(currentGame, socket.id);
    }, gracePeriod);
  });
});

function handleForfeit(game, disconnectedPlayerId) {
  const winner = game.players.find(p => p.id !== disconnectedPlayerId);

  io.to(game.id).emit('game-over', {
    winner: winner.id,
    reason: 'opponent-disconnected'
  });

  games.delete(game.id);
}
```

---

## 5. Client-Side Implementation

```javascript
import { useEffect, useState } from 'react';

function GameComponent() {
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('connected');
  const [opponentGracePeriod, setOpponentGracePeriod] = useState(null);

  useEffect(() => {
    const newSocket = io('wss://your-server.com', {
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000
    });

    // Connection events
    newSocket.on('connect', () => {
      setConnectionStatus('connected');
    });

    newSocket.on('disconnect', () => {
      setConnectionStatus('reconnecting');
    });

    newSocket.io.on('reconnect', (attemptNumber) => {
      console.log(`Reconnected after ${attemptNumber} attempts`);
      setConnectionStatus('connected');
    });

    newSocket.io.on('reconnect_failed', () => {
      setConnectionStatus('disconnected');
      showError('Connection lost. Please refresh the page.');
    });

    // Opponent disconnect events
    newSocket.on('opponent-disconnected', ({ gracePeriod }) => {
      setOpponentGracePeriod(gracePeriod / 1000);
      startCountdown(gracePeriod);
    });

    newSocket.on('opponent-reconnected', () => {
      setOpponentGracePeriod(null);
      showNotification('Opponent reconnected!');
    });

    setSocket(newSocket);
    return () => newSocket.close();
  }, []);

  return (
    <div>
      {connectionStatus === 'reconnecting' && (
        <div className="alert alert-warning">
          🔄 Reconnecting to server...
        </div>
      )}

      {opponentGracePeriod !== null && (
        <div className="alert alert-info">
          ⚠️ Opponent disconnected ({opponentGracePeriod}s remaining)
        </div>
      )}

      {/* Game UI */}
    </div>
  );
}
```

---

## 6. UI/UX Patterns

### Connection Status Indicator

```
┌─────────────────────────────────────┐
│  [●] Connected                       │ ← Green dot
│  [○] Reconnecting...                 │ ← Yellow dot, pulsing
│  [○] Disconnected                    │ ← Red dot
└─────────────────────────────────────┘
```

### Opponent Disconnection Banner

```
┌─────────────────────────────────────┐
│  ⚠️ Opponent Disconnected            │
│                                      │
│  Waiting for reconnection...         │
│  ⏱️ 8 seconds remaining               │
│                                      │
│  You will win if they don't return.  │
└─────────────────────────────────────┘
```

### Your Disconnection Overlay

```
┌─────────────────────────────────────┐
│  🔄 Connection Lost                  │
│                                      │
│  Attempting to reconnect...          │
│  Attempt 2 of 3                      │
│                                      │
│  [Refresh Page]                      │
└─────────────────────────────────────┘
```

---

## 7. Testing Scenarios

### Chrome DevTools Testing

```bash
# Test 1: Brief network interruption
1. Open DevTools → Network tab
2. Select "Offline" for 5 seconds
3. Re-enable network
Expected: Auto-reconnect, game resumes

# Test 2: Extended disconnection
1. Offline for 15 seconds during active round
2. Re-enable network
Expected: Round forfeited, match continues

# Test 3: Tab backgrounding
1. Switch to another tab for 30 seconds
2. Return to game tab
Expected: Game paused, syncs on return

# Test 4: Mobile lock screen (requires actual device)
1. Lock phone screen for 20 seconds
2. Unlock and return to game
Expected: Reconnection flow triggers
```

### Automated Testing

```javascript
describe('Disconnection handling', () => {
  it('should forfeit round after 10s in-round disconnect', async () => {
    const { socket1, socket2 } = await setupGameWithTwoPlayers();

    // Disconnect player 1 during their turn
    socket1.disconnect();

    // Wait for grace period
    await sleep(10000);

    // Expect player 2 to win the round
    expect(game.currentRound.winner).toBe(socket2.id);
  });

  it('should reconnect within grace period', async () => {
    const { socket1, socket2 } = await setupGameWithTwoPlayers();

    socket1.disconnect();
    await sleep(5000); // Reconnect before 10s timeout
    socket1.connect();

    // Game should resume
    expect(game.status).toBe('active');
  });
});
```

---

## 8. Fair Play Considerations

### Preventing Abuse

**Problem**: Player disconnects when about to lose to avoid defeat.

**Solutions**:
1. **Track disconnect patterns**: Flag players who disconnect >50% of losing matches
2. **Penalize frequent disconnectors**: Reduce grace period to 5s after 2 disconnects
3. **Score the round before disconnect**: If player made their move, round completes regardless
4. **Cooldown penalties**: 5-minute matchmaking cooldown after 3 disconnects in 1 hour

### Accidental vs Intentional Detection

```javascript
function classifyDisconnect(reason, gameState, playerHistory) {
  const indicators = {
    accidental: [
      reason === 'transport close',
      reason === 'ping timeout',
      playerHistory.avgConnectionQuality > 0.9,
      gameState.playerIsWinning
    ],
    intentional: [
      reason === 'client namespace disconnect',
      playerHistory.disconnectsWhenLosing > 0.3,
      !socket.reconnecting
    ]
  };

  const score = indicators.intentional.filter(Boolean).length -
                indicators.accidental.filter(Boolean).length;

  return score > 0 ? 'intentional' : 'accidental';
}
```

---

## 9. Key Takeaways

### Do's
- ✅ Use 10-20 second grace periods (fast but forgiving)
- ✅ Implement exponential backoff with randomization
- ✅ Forfeit ROUND, not entire match (less punishing)
- ✅ Show clear countdown timer to both players
- ✅ Track disconnect patterns for abuse prevention
- ✅ Handle Page Visibility API for tab backgrounding
- ✅ Test on real mobile devices (aggressive suspension)

### Don'ts
- ❌ Don't use grace periods >30s (slows gameplay too much)
- ❌ Don't forfeit entire match on first disconnect (too harsh)
- ❌ Don't rely solely on `disconnect` reason (can be misleading)
- ❌ Don't forget mobile browser suspension behavior
- ❌ Don't assume WebSocket stays alive in background tabs

---

## 10. References

### Official Documentation
- **Socket.IO v4 Reconnection**: https://socket.io/docs/v4/client-options
- **Page Visibility API**: https://developer.mozilla.org/en-US/docs/Web/API/Page_Visibility_API

### Case Studies
- **Awwwards Messenger**: https://www.awwwards.com/sites/messenger
  - Room-based multiplayer (max 10 players)
  - WebSockets + Three.js
  - Mobile-first design with aggressive memory management

### Best Practices
- Socket.IO implements automatic reconnection with exponential backoff
- Grace periods for competitive games typically range 5-30 seconds
- Mobile browsers require special handling due to aggressive suspension
- Pattern detection is key to distinguishing accidental vs intentional disconnects

---

## Implementation Checklist

- [ ] Set up Socket.IO with recommended reconnection config
- [ ] Implement server-side grace period timers (10s/20s)
- [ ] Add client-side reconnection UI (banners, countdowns)
- [ ] Integrate Page Visibility API for tab backgrounding
- [ ] Create disconnect reason classifier (accidental vs intentional)
- [ ] Add repeat offender detection (reduce grace period)
- [ ] Test on Chrome DevTools with network throttling
- [ ] Test on real iOS Safari and Android Chrome devices
- [ ] Add automated tests for reconnection scenarios
- [ ] Monitor disconnect rates in production analytics

---

**Conclusion**: A 10-second grace period for in-round disconnects and 20 seconds between rounds strikes the right balance between fairness and game flow for a casual competitive RPS game. This policy is forgiving enough for accidental network hiccups while preventing abuse through pattern detection and reduced grace periods for repeat offenders.
