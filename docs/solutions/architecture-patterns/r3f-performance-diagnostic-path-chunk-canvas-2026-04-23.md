---
title: "R3F infinite-canvas performance: three-lens diagnostic ordering"
date: 2026-04-23
category: architecture-patterns
module: moodboard-canvas
problem_type: architecture_pattern
component: tooling
severity: medium
applies_when:
  - "R3F scene with hundreds of streamed meshes organized in chunks"
  - "Chunk-based infinite canvas where camera position drives React state"
  - "Per-frame opacity or visibility updates across large card counts"
  - "Texture-heavy scenes with dynamic loading and GPU upload bottlenecks"
  - "Profile shows p95/p99 rising during camera motion while p50 stays stable"
tags:
  - react-three-fiber
  - three-js
  - performance
  - infinite-canvas
  - chunk-streaming
  - texture-decode
  - create-image-bitmap
  - react-memo
related_components:
  - src/components/moodboard/MoodboardCanvas.tsx
  - src/components/moodboard/CardMesh.tsx
  - src/components/moodboard/CameraRig.tsx
  - src/components/moodboard/layouts/infinite.ts
  - src/pages/api/proxy-image.ts
---

# R3F infinite-canvas performance: three-lens diagnostic ordering

## Context

The moodboard displays 625 image cards in a chunk-streamed R3F scene with drag/zoom navigation. Baseline performance had acceptable p50 (8.3ms) but visible stalls under interaction: p95 20.1ms, p99 52ms, 3 stalls >50ms per 121 frames of drag+zoom.

Reaching 60fps took three sequenced fixes. The first one — incremental chunk-delta layout — was architecturally correct but **regressed p95 to 78.2ms** because the fix stabilized `layout` object identity while leaving camera-derived values (`cameraChunk`, `cameraZ`) as React props on every card. Those props changed every frame the camera moved, defeating `React.memo` shallow-equals on all 625 cards. The wins from chunk stability were eaten by per-frame reconciliation of the whole tree.

The real lesson is the **ordering**. Engineers often reach for `InstancedMesh`, web workers, or full imperative rewrites when R3F scenes stall. Those are expensive architectural moves that rarely target the actual bottleneck. A three-lens diagnostic — React identity, then React/THREE boundary, then texture pipeline — resolves most cases without any of them. Our final measurement after all three lenses: median p95 9.8ms across 3 runs, steady-state p99 ~10ms, 82% bandwidth reduction from the proxy, no visible quality loss.

## Guidance

Apply these lenses in order. Each is independent and measurable; don't proceed to the next before the current one is validated.

### Lens 1 — Stable object identity in the React layer

In chunk-based scenes, never rebuild every layout on every boundary crossing. Use a `Map<chunkKey, CardLayout[]>` and compute the delta. Surviving chunks keep the same `CardLayout` object reference; `React.memo` now has a chance.

```ts
const infiniteLayouts = useMemo(() => {
  const map = layoutChunksMapRef.current;
  const required = new Set<string>();
  for (let dx = -R; dx <= R; dx++)
    for (let dy = -R; dy <= R; dy++)
      for (let dz = -R; dz <= R; dz++)
        required.add(chunkKey(cam.cx + dx, cam.cy + dy, cam.cz + dz));

  for (const k of required)
    if (!map.has(k)) map.set(k, generateChunkLayouts(...parseKey(k), items));

  for (const k of map.keys())
    if (chebyshev(parseKey(k), cam) > R + 1) map.delete(k); // +1 hysteresis

  return [...map.values()].flat();
}, [throttledCameraChunk, items]);
```

Keep React keys stable (`${itemId}-chunk-${cx}-${cy}-${cz}-${i}`) so reconciliation preserves mesh instances across crossings.

### Lens 2 — Remove camera-derived props; mutate THREE imperatively

Anything that changes per frame cannot be a React prop. Move per-frame computation into `useFrame`, read camera state non-reactively, and write directly to THREE objects. Consolidate to a single `useFrame` loop in a parent component rather than one per card.

```tsx
// SceneContent.tsx — one loop, iterates a registry
const cardRegistry = useRef(new Map<string, CardEntry>()).current;

useFrame((state) => {
  const cz = state.camera.position.z;
  const chunk = $cameraChunk.get(); // nanostore non-reactive read
  for (const e of cardRegistry.values()) {
    const d = calculateItemOpacity(e.chunkCoords, e.layout.z, chunk, cz, 1.0);
    const opacity = e.filterMatch ? d : 0.1;
    e.material.opacity = opacity;
    e.mesh.visible = opacity > 0.01;
  }
});

// CardMesh.tsx — self-registers; no camera props
useEffect(() => {
  const mesh = meshRef.current;
  const material = materialRef.current;
  if (!mesh || !material) return; // narrows to non-null below
  registry.set(layoutId, { layoutId, mesh, material, chunkCoords, layout, filterMatch });
  return () => { registry.delete(layoutId); };
}, [layoutId]);
```

`parseKey` returns `[cx, cy, cz]`, spread into `generateChunkLayouts(cx, cy, cz, items)`. `chebyshev` takes the same tuple plus the camera chunk. Keep those signatures in mind when adapting to a typed codebase.

### Lens 3 — Off-thread texture decode with resolution cap

`TextureLoader` decodes on the main thread and uploads to the GPU inline. Swap for `createImageBitmap` (off-thread decode) and defer GPU upload via `requestIdleCallback`. Cap resolution at the proxy so the texture pipeline isn't absorbing full-size upstream images. The resolution cap is the load-bearing change here — it eliminated our p99 tail. `requestIdleCallback` is scheduling hygiene that avoids upload during an active interaction frame; useful but a second-order effect at this scale.

```ts
// CardMesh.tsx — off-thread decode, deferred upload
const blob = await (await fetch(url)).blob();
const bitmap = await createImageBitmap(blob);
const texture = new CanvasTexture(bitmap);
texture.needsUpdate = true;

const schedule = typeof requestIdleCallback !== 'undefined'
  ? (cb: IdleRequestCallback) => requestIdleCallback(cb, { timeout: 50 })
  : (cb: () => void) => setTimeout(cb, 0);
schedule(() => setTexture(texture));
```

```ts
// pages/api/proxy-image.ts — resolution cap with safe fallback
try {
  const image = sharp(buffer);
  const meta = await image.metadata();
  if ((meta.width ?? 0) > 512) {
    buffer = await image.resize({ width: 512, withoutEnlargement: true })
      .jpeg({ quality: 82 }).toBuffer();
    contentType = 'image/jpeg';
  }
} catch {
  // sharp can't handle animated GIFs / SVGs — fall through to original buffer
}
```

## Why This Matters

The lens order is load-bearing. Jumping ahead — e.g., adopting `InstancedMesh` — forces a texture atlas for hundreds of unique images, breaks `@react-spring/three`, loses per-card raycasting, and doesn't address the React reconciliation cost anyway. A web worker for layout adds postMessage latency and doesn't reduce the React-layer re-render when results come back; at this scale (hundreds of cards, not tens of thousands), it's the wrong lever. Imperative rewrites abandon R3F's declarative model for marginal gain. None of that is necessary if React identity, the React/THREE boundary, and the texture pipeline are each clean.

Our measurements show each lens' contribution. Baseline: p95 20.1ms, p99 52ms. Lens 1 alone regressed to p95 78.2ms because Lens 2 wasn't applied — chunk-delta stabilized `layout` but camera props still invalidated memo on every motion. Lenses 1+2: p95 median 28.8ms, best run 17.1ms, but p99 variance 282–372ms from texture decode spikes. Lenses 1+2+3: **p95 median 9.8ms, p99 10ms steady, stalls_over_50 = 0 on two of three runs.** The first cold run still shows a one-time decode spike (~168ms) before the cache warms, which is acceptable and unavoidable without precaching.

These three lenses are scoped to the "hundreds of cards" regime. Beyond ~1000 cards, the next lever is frustum culling (our current visibility gate is depth-based, not view-frustum-based). Beyond ~10k, consider LOD, material reuse, or a thin imperative layer over a Zustand-style store. Don't reach for those until profiling shows the current three lenses are saturated.

## When to Apply

- R3F scene rendering hundreds of dynamically-textured meshes, each needing unique texture state (photo grids, moodboards, card walls).
- Chunk-based or tile-based infinite canvas where layout needs to update on camera boundary crossings.
- Profile shows p95/p99 rising during camera motion even though p50 is stable — the signature of per-frame React reconciliation.
- You're considering `InstancedMesh` for content with per-card textures, or reaching for a web worker for layout.
- Per-frame opacity, fade, or culling computations across large component counts (100+).
- Streaming image content from external sources with unpredictable resolution.

## Examples

### Before (Unit 10 regression — chunk-delta without Lens 2)

```tsx
// MoodboardCanvas.tsx
{layouts.map(layout => (
  <MemoizedCard
    key={layout.id}
    layout={layout}
    cameraChunk={cameraChunk}   // changes on every boundary cross
    cameraZ={cameraPosition.z}  // changes EVERY frame
    filterMatch={filterMatch}
  />
))}

// MemoizedCard body
const opacity = calculateItemOpacity(layout, cameraChunk, cameraZ);
if (opacity < 0.01) return null;
return (
  <mesh position={[layout.x, layout.y, layout.z]}>
    <meshBasicMaterial opacity={opacity} transparent map={texture} />
  </mesh>
);
```

Result: `React.memo` shallow-equals on `cameraZ` fails every frame → all 625 cards reconcile → p95 78ms.

### After (Lens 2 applied)

```tsx
// MoodboardCanvas.tsx — no camera props
{layouts.map(layout => (
  <MemoizedCard
    key={layout.id}
    layout={layout}
    layoutId={layout.id}
    filterMatch={filterMatch}
    registry={cardRegistry}
  />
))}

// CardMesh.tsx body — no opacity in render, refs + registry instead
const meshRef = useRef<THREE.Mesh>(null);
const materialRef = useRef<THREE.MeshBasicMaterial>(null);

useEffect(() => {
  const mesh = meshRef.current;
  const material = materialRef.current;
  if (!mesh || !material) return;
  registry.set(layoutId, { layoutId, mesh, material, chunkCoords, layout, filterMatch });
  return () => { registry.delete(layoutId); };
}, [layoutId]);

// Keep entry.filterMatch and entry.layout in sync without recreating the entry.
// Safe because the parent useFrame reads entries by reference — mutating fields
// in-place propagates without re-registration.
useEffect(() => {
  const e = registry.get(layoutId);
  if (e) { e.filterMatch = filterMatch; e.layout = layout; }
}, [filterMatch, layout]);

return (
  <mesh ref={meshRef} position={[layout.x, layout.y, layout.z]}>
    <meshBasicMaterial ref={materialRef} transparent map={texture} />
  </mesh>
);
```

Result: `cameraZ` never enters the React tree. `MemoizedCard` reconciles only when `filterMatch` or `layout` actually change. Opacity/visibility update happens in one `useFrame` loop iterating `registry.values()`.

## Related

- `docs/adr/0003-per-card-meshes-not-instancedmesh.md` — the resulting decision to keep one mesh per Card. The full arc, baseline measurements and alternative-strategy scoring lived in the original moodboard plan, now in git history.
- `docs/analysis/chunk-boundary-stall-analysis.md` — hot-path trace that scored five alternative strategies (InstancedMesh 1/5, Web Worker 2/5, chunk-delta 4/5) and motivated Lens 1 (session history).
- `docs/analysis/codrops-vs-ours-comparison.md` — gap analysis vs Codrops reference implementation; confirmed the `InstancedMesh`-is-wrong-for-per-card-textures decision (session history).
- External: [Codrops "Infinite Canvas" tutorial](https://tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/) and [`edoardolunardi/infinite-canvas`](https://github.com/edoardolunardi/infinite-canvas) — reference implementations for chunk streaming.
- `docs/solutions/runtime-errors/webgl-texture-cors-proxy-fix-2026-04-22.md` — prerequisite: images must pass CORS before any of this performance work is meaningful.
- `patches/@react-three__fiber@9.6.0.patch` — unrelated but adjacent work in the same feature branch: patches R3F's internal `new THREE.Clock()` to use `THREE.Timer` and eliminate the deprecation warning.
