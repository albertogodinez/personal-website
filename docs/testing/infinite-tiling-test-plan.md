# Infinite Tiling Test Plan

## Feature Overview

The infinite tiling feature creates the illusion of infinite zoom by rendering moodboard cards at multiple scale levels simultaneously. This is inspired by the Codrops "infinite canvas" technique.

## Implementation Summary

### Multi-Scale Layering Approach

The implementation uses a **multi-scale layering** technique:

1. **Three Scale Layers**: Each card is rendered 3 times at different scales:
   - Layer 0: 0.5x scale (far layer, furthest from camera)
   - Layer 1: 1.0x scale (mid layer, baseline depth)
   - Layer 2: 2.0x scale (near layer, closest to camera)

2. **Z-Depth Positioning**: Layers are positioned at different depths:
   - Layer 0 (0.5x): Z = -100 (plus offset)
   - Layer 1 (1.0x): Z = 0 (plus offset)
   - Layer 2 (2.0x): Z = +100 (plus offset)

3. **Scaled Positioning**: X and Y positions are multiplied by the scale factor:
   - This creates the tiling/repeating pattern effect
   - As you zoom through layers, similar patterns emerge at different scales

4. **Performance**: This triples the number of rendered cards (N items × 3 layers)

## Test Procedure

### 1. Visual Verification

**Navigate to the moodboard in infinite mode:**

1. Start the dev server: `pnpm dev`
2. Navigate to `/moodboard`
3. Ensure "Infinite" mode is selected (should be default)

**Test continuous zoom in:**

1. Scroll down (zoom in) continuously for 10-20 seconds
2. **Expected behavior**:
   - You should see cards at different scales as you zoom
   - Small cards in the distance should become visible as medium cards
   - Medium cards should become large cards as you pass through them
   - The pattern should feel like it "repeats" but at different scales
   - **You should NOT hit empty space** - there should always be cards at some scale

**Test continuous zoom out:**

1. Scroll up (zoom out) continuously for 10-20 seconds
2. **Expected behavior**:
   - Large cards should shrink and recede into the distance
   - Medium cards should become small cards
   - The pattern should contract but remain visible
   - Again, should feel infinite and continuous

### 2. Pattern Recognition Test

**Look for the tiling effect:**

1. Zoom to a comfortable viewing depth (Z ≈ 10)
2. Memorize the position of 2-3 distinctive cards
3. Zoom in deeply (Z ≈ 100+)
4. **Expected behavior**:
   - You should see cards at similar relative positions but at a larger scale
   - The pattern should feel "familiar" but magnified
   - This is the tiling effect - the same spatial arrangement repeats at different scales

### 3. Performance Test

**Check frame rate during zoom:**

1. Enable debug mode: Press `Shift+D` to show FPS counter
2. Zoom in and out continuously while watching FPS
3. **Expected behavior**:
   - FPS should remain above 30 (ideally 60) on desktop
   - FPS should remain above 20 on mobile
   - If FPS drops significantly below these thresholds, the number of layers may need optimization

**Check texture loading:**

1. Zoom in quickly to reveal new layers
2. Watch for texture pop-in or loading delays
3. **Expected behavior**:
   - Textures should load smoothly
   - No flickering or missing textures
   - All three layers should show images consistently

### 4. Interaction Test

**Test card clicking across layers:**

1. Click on a small card (far layer)
2. Click on a medium card (mid layer)
3. Click on a large card (near layer)
4. **Expected behavior**:
   - All clicks should work and open the detail overlay
   - The same card clicked at different scales should open the same detail view
   - Detail overlay shows the original item ID (without the layer suffix)

**Test filter interaction:**

1. Select a category filter (e.g., "Web", "Typography")
2. Zoom in and out
3. **Expected behavior**:
   - Filtered cards should remain at full opacity across all layers
   - Non-matching cards should be dimmed (0.1 opacity) across all layers
   - Filtering should work consistently regardless of zoom depth

### 5. Edge Cases

**Test extreme zoom levels:**

1. Zoom out as far as possible (scroll up for 30+ seconds)
2. Zoom in as far as possible (scroll down for 30+ seconds)
3. **Expected behavior**:
   - No errors in console
   - Cards should remain visible (though potentially very small or very large)
   - No visual artifacts or rendering issues

**Test rapid mode switching:**

1. Switch from Infinite → Clustered → Timeline → Infinite
2. **Expected behavior**:
   - No errors in console
   - Smooth transitions between modes
   - Correct number of cards in each mode (Infinite should show 3x cards)

## Success Criteria

✅ **Pass**: The feature passes if:
- Continuous zoom reveals cards at different scales seamlessly
- The pattern appears to repeat at different scale levels
- No significant performance degradation (FPS remains acceptable)
- Card interactions work correctly across all layers
- No console errors during normal use

❌ **Fail**: The feature fails if:
- Zooming reveals empty space with no cards
- Performance drops significantly (FPS < 20 on desktop)
- Cards don't render at different scales
- Clicking cards doesn't work or opens wrong items
- Console shows errors during zoom/interaction

## Known Limitations

1. **Performance overhead**: The feature triples the number of rendered cards. On lower-end devices or with very large card collections, this may impact performance.

2. **Memory usage**: Three texture instances per card image (one per layer). The browser's texture cache helps, but memory usage is higher.

3. **No dynamic culling**: All layers are always rendered, even when far from the camera. Adding frustum culling could improve performance.

## Future Optimizations (Not Implemented)

- **Frustum culling**: Only render cards visible in the camera's view frustum
- **LOD (Level of Detail)**: Use lower resolution textures for distant layers
- **Dynamic layer generation**: Generate layers on-demand based on camera position
- **Instancing**: Use Three.js instancing to reduce draw calls for repeated cards

## Files Modified

- `/src/components/moodboard/layouts/infinite.ts` - Multi-scale layout calculator
- `/src/components/moodboard/MoodboardCanvas.tsx` - Layer-aware rendering and item mapping
