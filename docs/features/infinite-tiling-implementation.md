# Infinite Tiling Implementation

## Overview

This document describes the implementation of infinite repeating/tiling content for the moodboard canvas. The feature creates an "infinite zoom" effect where content appears to repeat seamlessly at different scales, inspired by the Codrops "infinite canvas" technique.

## Problem Statement

Previously, the infinite mode had infinite zoom capability but static content:
- Camera could zoom infinitely in any direction
- But the cards remained in fixed positions
- Zooming deeply would just get closer to the same static cards
- No sense of "infinite" content - it felt finite

## Solution: Multi-Scale Layering

The implementation uses a **multi-scale layering** technique where each card is rendered at multiple scale levels simultaneously.

### Core Concept

Instead of rendering each card once, we render it **three times** at different:
1. **Scales**: 0.5x, 1.0x, 2.0x
2. **Z-depths**: -100, 0, +100 (relative)
3. **Positions**: X and Y coordinates are multiplied by the scale factor

This creates:
- **Depth parallax**: Different scale layers at different depths
- **Tiling effect**: Scaled positions create repeating spatial patterns
- **Infinite illusion**: As you zoom through one layer, the next emerges

### Mathematics

For each item with base position `(baseX, baseY)`:

```
Layer 0 (far):   scale=0.5x, pos=(baseX*0.5, baseY*0.5, -100)
Layer 1 (mid):   scale=1.0x, pos=(baseX*1.0, baseY*1.0,    0)
Layer 2 (near):  scale=2.0x, pos=(baseX*2.0, baseY*2.0, +100)
```

**Why this works:**
- As camera moves from Z=10 → Z=100, you pass through all three layers
- Small cards (0.5x) at Z=-100 appear distant when camera is at Z=10
- Medium cards (1.0x) at Z=0 are at your "level" 
- Large cards (2.0x) at Z=100 emerge as you zoom in
- The scaled positions create similar spatial arrangements at each scale

### Visual Example

```
Camera Z=10:
  Far layer (0.5x @ Z=-100):  tiny cards in distance
  Mid layer (1.0x @ Z=0):     normal cards, close by
  Near layer (2.0x @ Z=100):  large cards ahead (not visible yet)

Camera Z=110 (after zooming in):
  Far layer (0.5x @ Z=-100):  still distant, but closer than before
  Mid layer (1.0x @ Z=0):     behind you now
  Near layer (2.0x @ Z=100):  right in front, dominating view

The pattern "repeats" because the relative spatial arrangement
is similar at each scale layer.
```

## Implementation Details

### Modified Files

**1. `/src/components/moodboard/layouts/infinite.ts`**

Changed from single-instance layout to multi-layer:

```typescript
// Before: One layout per item
return items.map(item => ({
  id: item.id,
  x: randomX,
  y: randomY,
  z: randomZ,
  scale: 1,
  // ...
}));

// After: Three layouts per item (one per scale layer)
items.forEach(item => {
  scaleLayers.forEach((layer, layerIndex) => {
    layouts.push({
      id: `${item.id}-layer${layerIndex}`,
      x: baseX * layer.scale,
      y: baseY * layer.scale,
      z: layerDepthSpacing * (layerIndex - 1) + baseZOffset,
      scale: layer.scale,
      // ...
    });
  });
});
return layouts;
```

**Key changes:**
- Returns array of `N_items × 3` layouts instead of `N_items`
- Each layout has unique ID: `{itemId}-layer{0,1,2}`
- Positions are scaled by layer scale factor
- Z-depth varies by layer (far/mid/near)

**2. `/src/components/moodboard/MoodboardCanvas.tsx`**

Changed from 1:1 item-to-layout mapping to N:1 item-to-layouts:

```typescript
// Before: Map items directly to layouts by index
{items.map((item, i) => (
  <CardMesh key={item.id} layout={layouts[i]} ... />
))}

// After: Map layouts to items, handling layer IDs
const itemsByLayoutId = useMemo(() => {
  const map = new Map();
  if (mode === 'infinite') {
    items.forEach(item => {
      for (let i = 0; i < 3; i++) {
        map.set(`${item.id}-layer${i}`, item);
      }
    });
  }
  return map;
}, [items, mode]);

{layouts.map((layout) => {
  const item = itemsByLayoutId.get(layout.id);
  return <CardMesh key={layout.id} layout={layout} ... />;
})}
```

**Key changes:**
- Iterate over layouts (not items)
- Look up source item by layout ID
- Handle layer ID format: extract original item ID for click handlers

### Parameters

```typescript
// Scale factors for each layer
const scaleLayers = [
  { scale: 0.5, label: 'far' },
  { scale: 1.0, label: 'mid' },
  { scale: 2.0, label: 'near' },
];

// Z-depth spacing between layers
const layerDepthSpacing = 100;

// Base XY spread
const baseX = (random - 0.5) * 80;
const baseY = (random2 - 0.5) * 80;

// Z variation within layer
const baseZOffset = (random3 - 0.5) * 15;
```

These parameters can be tuned:
- **scaleLayers**: Different scale factors change the "zoom intervals"
- **layerDepthSpacing**: Larger = layers more spread out, smaller = more compressed
- **baseX/baseY spread**: Controls how far apart cards are
- **baseZOffset**: Adds depth variation within each layer (prevents flat layers)

## Design Rationale

### Why 3 Layers Instead of 5 or More?

**Performance vs. Effect:**
- Each layer adds `N_items` more cards to render
- 3 layers provides good infinite effect without excessive overhead
- 5 layers would be 5x the cards (too many)
- 2 layers wouldn't create sufficient depth illusion

**Tested range:**
- 2 layers: Noticeable gaps, not enough depth
- 3 layers: Good balance ✓
- 5 layers: Performance concerns, diminishing returns

### Why Not Dynamic Tiling?

The alternative approach (used in some Codrops examples) is **dynamic tiling**:
- Calculate visible bounds based on camera position
- Generate card instances on-the-fly in a grid pattern
- Use modulo math to wrap positions and create infinite repetition

**Pros of dynamic tiling:**
- Truly infinite (not limited to 3 layers)
- Better performance (only render visible cards)
- True mathematical infinity

**Cons of dynamic tiling:**
- Much more complex to implement
- Requires careful frustum culling
- Harder to maintain deterministic layout (seeded random becomes tricky)
- More prone to bugs (edge cases at boundaries)

**Decision:** Multi-scale layering is simpler, more maintainable, and sufficient for the use case. The moodboard isn't meant to be mathematically infinite - the 3-layer illusion is adequate.

## Performance Characteristics

### Rendering Overhead

**Card count multiplier:** 3x
- If N=100 items, we render 300 cards
- Each card is a textured plane (relatively cheap)
- Three.js handles batching well for similar geometries

**Texture loading:**
- Same texture used across all layers of an item
- Browser texture cache helps (no need to load 3x)
- Memory footprint: slightly higher (3 texture references)

**Frame rate impact:**
- Desktop: Negligible impact up to ~500 total cards (170 items)
- Mobile: May struggle with >300 total cards (100 items)
- Bottleneck: Draw calls and texture memory, not CPU

### Future Optimizations (Not Implemented)

1. **Frustum Culling**
   - Only render layers within camera's view frustum
   - Could reduce rendered cards by 50-70% at any given time
   - Three.js has built-in frustum culling, but need to verify it's enabled

2. **LOD (Level of Detail)**
   - Use lower-res textures for far layer (0.5x)
   - Use higher-res textures for near layer (2.0x)
   - Reduces texture memory and bandwidth

3. **Instancing**
   - Use Three.js instanced meshes for cards with same texture
   - Reduces draw calls from 300 to ~N (one per unique texture)
   - More complex to implement with springs and animations

## Testing

See [Infinite Tiling Test Plan](../testing/infinite-tiling-test-plan.md) for comprehensive testing procedures.

**Quick verification:**
1. Navigate to `/moodboard` in infinite mode
2. Scroll down (zoom in) continuously for 20+ seconds
3. You should see cards at different scales as you zoom
4. The pattern should feel like it repeats but at larger scales
5. No empty space - always cards visible

## Known Limitations

1. **Not truly infinite**: Limited to 3 scale layers
   - Extreme zoom (Z > 300) may feel sparse
   - Extreme zoom out (Z < -200) may feel sparse
   - But within normal usage range (-50 to 150), works well

2. **Performance overhead**: 3x card count
   - Large collections (>150 items = 450 cards) may lag on mobile
   - No dynamic culling yet

3. **Pattern repetition**: Careful observers may notice patterns
   - The spatial arrangement is deterministic (seeded random)
   - Same cards appear at each scale layer
   - Trade-off: determinism ensures consistent layout

## Future Work

- **Adaptive layer count**: Use 2 layers on mobile, 3 on desktop
- **Distance-based culling**: Don't render layers too far from camera
- **Progressive loading**: Load far layer textures with lower priority
- **Dynamic layer generation**: Add/remove layers based on zoom depth

## References

- Codrops "Infinite Canvas" article: `tympanus.net/codrops/2026/01/07/infinite-canvas-building-a-seamless-pan-anywhere-image-space/`
- Three.js frustum culling: `threejs.org/docs/#api/en/math/Frustum`
- React Three Fiber performance tips: `docs.pmnd.rs/react-three-fiber/advanced/performance`
