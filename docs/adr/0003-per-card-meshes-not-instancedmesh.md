# The moodboard canvas keeps one mesh per Card, rather than an InstancedMesh

The canvas renders hundreds of Cards, each with its own texture. The obvious performance move — collapsing them into an `InstancedMesh` — was scored and rejected: per-Card textures would force a texture atlas, it breaks `@react-spring/three`, and it loses per-Card raycasting, while doing nothing about the actual bottleneck, which was React reconciliation. A web worker for layout was rejected for similar reasons.

60fps was reached instead by fixing React object identity, moving per-frame work out of React into a single `useFrame` loop, and decoding textures off-thread. Details in `docs/solutions/architecture-patterns/r3f-performance-diagnostic-path-chunk-canvas-2026-04-23.md`.

## Consequences

This holds for the "hundreds of Cards" regime. Past roughly a thousand Cards the next lever is frustum culling, and only past ~10k should instancing or LOD be reconsidered. Don't reach for them before profiling shows the current approach saturated.
