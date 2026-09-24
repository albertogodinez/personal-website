# Chunk Boundary Stall Analysis

> **Note:** This is the pre-implementation diagnostic that motivated the Unit 10 refactor. The fix it recommended (incremental chunk-delta) was correct but insufficient on its own — it regressed p95 until Units 11 and 12 also landed. See the validated end-to-end pattern at [`docs/solutions/architecture-patterns/r3f-performance-diagnostic-path-chunk-canvas-2026-04-23.md`](../solutions/architecture-patterns/r3f-performance-diagnostic-path-chunk-canvas-2026-04-23.md). This doc is preserved as the profiling record that informed the plan.

## 1. Exact Hot Paths During Boundary Crossing

When `CameraRig` crosses a chunk boundary at line 192 (`$cameraChunk.set({ cx, cy, cz })`), the cascade is:

1. **Store update** (stores.ts:16) — `$cameraChunk` atom fires subscribers
2. **MoodboardCanvas re-render** (MoodboardCanvas.tsx:147) — `useStore($cameraChunk)` triggers component update
3. **Throttle delay** (lines 153-167) — setTimeout queues chunk update for 100-400ms
4. **useMemo recompute** (line 182) — `throttledCameraChunk` changes, `calculateInfiniteLayout` runs
5. **Full array regeneration** (infinite.ts:39-136) — 125 chunks × 5 items = 625 new `CardLayout` objects with new object identity
6. **SceneContent re-render** (line 108) — `layouts` prop changes, entire `layouts.map()` executes
7. **625 MemoizedCard reconciliations** (lines 110-134) — React compares props for all 625 cards
8. **625 spring retargets** (CardMesh.tsx:74-79) — `@react-spring/three` recalculates animation targets for every card

The stall happens at step 5: `calculateInfiniteLayout` allocates 625 fresh objects (each with 10 properties) in a tight loop (infinite.ts:107-120), causing GC pressure. Step 7 compounds it: every `layout` object in the map has new identity, so `React.memo` shallow-equals fails even when semantic values (x, y, z) haven't changed for cards in previously-visible chunks.

## 2. Why MemoizedCard Memoization Is Partially Defeated

`MemoizedCard` (line 32) uses `React.memo` but receives three props that get new references every render:

- **`layout` prop** (line 123): Comes from `layouts.map((layout) => ...)`. Even if a card at chunk (0,0,0) had the same position last frame, `calculateInfiniteLayout` regenerates the entire 625-item array with fresh object literals. React's shallow comparison sees `prevLayout !== nextLayout` and re-renders.
  
- **`cameraChunk` prop** (line 129): Object literal `{ cx, cy, cz }` from store. Changes every boundary crossing by definition, but also re-renders cards whose chunk coordinates haven't changed relative to the camera.

- **`handleCardClick` prop** (line 131): Wrapped in `useCallback` (line 196) with `[mode]` dependency, so stable across frames. Not the problem.

The `layout` prop failure is critical. When camera moves from chunk (0,0,0) to (0,0,1), chunks at (0,0,0), (1,0,0), etc., should reuse existing layout objects, but instead we rebuild all 625 from scratch. `MemoizedCard` sees a new `layout` object and calls `useSpring` (CardMesh.tsx:74), which retargets the spring even if position didn't change. For the ~500 cards that were visible last frame and remain visible, this is wasted work.

## 3. Feasibility of Incremental Chunk-Delta Updates

**Files to change:**
- `infinite.ts` (major refactor): Replace flat array return with `Map<string, CardLayout[]>` keyed by `"cx-cy-cz"`. Add function signature: `calculateInfiniteLayoutIncremental(items, filter, cameraChunk, existingChunksMap) => { added: Map, removed: Set<string> }`.
- `MoodboardCanvas.tsx` (medium): Replace `layouts` state with `layoutChunksMap: Map<string, CardLayout[]>`. Change useMemo to call incremental function, merge delta into map. Flatten map to array only for rendering.
- `stores.ts` (trivial): Add `$layoutChunksMap` atom if state lift is needed.

**Shape:** State becomes `Map<"0-0-0", CardLayout[5]>`. On chunk boundary cross, compute 3D grid of needed chunks, diff against map keys, call `calculateInfiniteLayout` only for missing keys, splice results into map, delete stale keys outside render distance + 1 (cache buffer).

**Keyed reconciliation:** Currently `key={layout.id}` (line 124). Layout IDs like `"itemId-chunk-0-0-0-2"` are stable across frames for the same chunk. React will preserve existing `<MemoizedCard>` instances as long as keys don't change. Springs won't re-mount; `useSpring` updates targets via diffing. This is safe.

**Risk:** Mode transitions (infinite → clustered) need full rebuild. Current code already recalculates on mode change (line 184 `mode` dependency). Incremental approach needs a "clear map" path when mode changes. Detail overlay click (line 196) extracts `originalId` from layout ID, so chunk suffix doesn't break it.

**Feasibility score: 4/5.** Architecture supports it with moderate refactor. Main complexity is maintaining map consistency during filter changes (filter affects opacity but not position, so can update in-place without regenerating chunks).

## 4. Fit Assessment for Alternative Strategies

### a. Incremental Chunk-Delta (Map of chunks, recompute only added)
**Fit: 4/5**

Directly addresses the root cause (regenerating 625 layouts). Preserves object identity for unchanged chunks, letting `React.memo` succeed. Requires changing layout state from array to Map and adding diff logic. Chunk IDs in layout.id are already stable. Filter changes complicate it (need to iterate all chunks to update opacity), but can batch-update without full regeneration. Biggest win for the effort.

### b. Web Worker for Layout Computation
**Fit: 2/5**

`calculateInfiniteLayout` is 30 lines of tight math (infinite.ts:59-123). Moving it off-thread adds postMessage latency (2-5ms) and serialization cost. The real bottleneck is React reconciling 625 changed objects, not the CPU time to generate them (likely <2ms). Worker buys nothing if we still replace the entire array. Only helps if combined with incremental deltas, at which point the delta computation itself is cheap enough to stay on main thread.

### c. THREE.InstancedMesh + Per-Instance Attributes
**Fit: 1/5**

Our cards have unique textures (625 different images). `InstancedMesh` requires all instances share one material, so we'd need a texture atlas (stitching 625 images into one giant texture) or `Texture2DArray` (GPU support inconsistent). Atlas generation is complex and breaks texture caching (CardMesh.tsx:13). We also lose per-card click handlers (line 76 onClick) unless we implement raycasting + instanceId lookup. React-spring doesn't animate instance attributes out of the box. Codrops doesn't use instancing for the same reason. Not viable without a major architecture rewrite.

### d. Object Pooling (Fixed Pool, Swap Position/Texture)
**Fit: 3/5**

Maintain 625 `<CardMesh>` instances at fixed array indices, mutate `layout` prop in-place when chunks change. Requires changing `CardLayout` from readonly interface to mutable class, updating fields imperatively in `useFrame` (CameraRig.tsx:154), bypassing React state. Springs would need `set()` calls instead of declarative targets. Loses React's declarative model. Bigger issue: filter changes still require updating all 625 cards (opacity), and mode transitions (clustered/timeline) have different card counts and need pool resize. Partial improvement but high complexity.

### e. Direct useFrame Mutation (Imperative, Bypass React)
**Fit: 2/5**

Store mesh refs in array, mutate `mesh.position/rotation` directly in `useFrame` like Codrops. Eliminates React reconciliation entirely. Requires rewriting CardMesh to expose refs, moving all animation logic to a single `useFrame` loop in MoodboardCanvas, manually managing texture loading/unloading. Springs are gone (must implement lerp manually). Click handling needs raycaster. Mode transitions become imperative state machines. Clustered/timeline layouts (which are 2D, lines 43-64 clustered.ts, 28-52 timeline.ts) would need separate code paths. This is a full rewrite to a non-React paradigm. Only justified if we're chasing 120fps and incremental updates don't work.

## 5. Recommended Path

**Primary: Incremental chunk-delta updates (strategy 4a).**

Change `calculateInfiniteLayout` to return `Map<chunkKey, CardLayout[]>` instead of flat array. In `MoodboardCanvas.tsx` useMemo (line 182), diff new camera chunk's 5×5×5 grid against existing map keys, call layout function only for missing chunks, merge into map, remove chunks beyond render distance + 1. Flatten map to array for rendering. Estimated **50 LOC** in infinite.ts (split into `generateChunkLayouts(cx, cy, cz, items)` helper + incremental wrapper), **30 LOC** in MoodboardCanvas.tsx (map state, diff logic, flatten).

**Why this fits best:** Our chunk-based IDs (line 108 `"itemId-chunk-0-0-0-2"`) already support stable keys. Layout generation is pure and deterministic (seeded random, lines 76-120 infinite.ts). The 625-card count is arbitrary (5×5×5 grid); only ~100-200 are on-screen at typical FOV, so we're already computing excess for smooth edges. Incremental approach drops redundant work from ~625 regenerated/frame to ~25-125 new chunks/cross (depending on camera velocity axis). React reconciliation improves because 500 cards get same `layout` object reference.

**Risks:** Filter changes (lines 86-116 infinite.ts) currently bake filter opacity into layout. With cached chunks, changing filter requires iterating map, cloning layouts, updating opacity field. Either accept stutter on filter change (rare user action) or extract opacity to render-time calculation (move `calculateItemOpacity` call from MemoizedCard line 53 to CardMesh, pass `filterMatch` as prop). Mode transitions already rebuild (line 184 dependency).

**Secondary: None.** Object pooling and imperative mutations are premature. If incremental deltas reduce boundary stalls to <16ms p99 and filter changes are acceptable, we're done. If still not smooth, next step is profiling React reconciliation overhead specifically (flamegraph the 500 unchanged cards re-rendering). Worker and instancing don't fit our architecture.

## 6. Open Questions

- What's the p99 texture upload time for newly-visible chunks? DevTools rAF sampling shows "severe stalls" but doesn't attribute them. If texture decode is >20ms, incremental deltas won't fix it; need to preload textures for chunks at render distance + 1.
- Does `@react-spring/three` retarget springs even when target values haven't changed? If `useSpring({ position: [0, 0, 0] })` is called with same array values next frame, does it no-op or recompute? May need to wrap spring config in useMemo.
- How does filter change performance need to be? If user spams filter buttons, current approach stutters. Incremental deltas make it worse (must iterate all cached chunks). Acceptable if filter is slow-path, but needs UX decision.
- What's the actual LOC of clustered/timeline modes? They return flat arrays (clustered.ts:36, timeline.ts:28). Switching from infinite's Map to flat array on mode change is trivial, but are there shared utilities that assume array shape?
