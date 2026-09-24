# Performance Monitoring Guide

## Quick Start

### Enable Debug Mode

Press **Shift+D** while on the moodboard page to toggle debug mode.

When enabled, you will see:
1. **FPS counter** (top-left) - Real-time frame rate from Stats.js
2. **Performance stats overlay** (bottom-right) - Custom metrics

### Performance Stats Overlay

Located in the bottom-right corner, displays:

```
Performance Stats
Cards: 625
Chunks: 125
Camera: (0.0, 0.0, 10.0)
Chunk: (0, 0, 0)
```

**Metrics explained**:

- **Cards**: Number of cards actually rendered in the current frame
  - Total layouts generated: 625 (for renderDistance=2)
  - Cards rendered: Usually 300-500 (after opacity culling)
  - Lower number is better for performance
  - Culled due to: opacity < 0.01, filter mismatch, or off-screen

- **Chunks**: Number of active chunks being generated
  - Should show 125 for infinite mode (renderDistance=2)
  - This is a constant based on render distance
  - Formula: (2 × renderDistance + 1)³

- **Camera**: Current camera position in 3D space
  - X, Y: Pan position (changes with drag)
  - Z: Zoom level (changes with scroll)
  - Default starting position: (0.0, 0.0, 10.0)

- **Chunk**: Current camera chunk coordinates
  - Chunks are 110 units each (CHUNK_SIZE)
  - Changes as you move through space
  - Example: Camera Z=-220 → Chunk Z=-2

## Console Logging

When debug mode is enabled, additional logs appear in the browser console:

### Chunk Generation Log

```javascript
[infinite.ts] Layout generation: {
  cameraChunk: { cx: 0, cy: 0, cz: 0 },
  renderDistance: 2,
  chunksGenerated: 125,
  itemsGenerated: 625,
  filter: "all"
}
```

This log appears whenever the layout is recalculated (typically when crossing chunk boundaries or changing filters).

### Layout Calculation Log

```javascript
[MoodboardCanvas] Layout calculation: {
  mode: "infinite",
  totalLayouts: 625
}
```

This log appears on every layout recalculation, showing the total number of layout entries generated.

### Reading the Logs

**Normal operation**:
- Logs appear only when camera crosses chunk boundaries
- `chunksGenerated` matches expected value (125)
- `itemsGenerated` = chunksGenerated × 5
- `totalLayouts` matches `itemsGenerated`

**Performance issues**:
- Excessive logging (multiple per second) may indicate:
  - Camera movement causing frequent recalculations
  - Dependencies in useMemo are too sensitive
  - Chunk boundaries are crossed too frequently

## Interpreting Performance

### Good Performance

- FPS: 55-60 (desktop) or 45-55 (mobile)
- Cards rendered: 300-500
- Frame time: <16.7ms (60 FPS)
- Smooth camera movement
- Seamless chunk transitions
- No visible stuttering

### Poor Performance

- FPS: <30 (desktop) or <20 (mobile)
- Cards rendered: >600 (culling not working)
- Frame time: >33ms
- Stuttering during zoom/pan
- Visible pop-in when chunks load
- Console logs appearing constantly

## Common Scenarios

### Scenario 1: High FPS but Low Cards

```
Cards: 150
Chunks: 125
FPS: 60
```

**Interpretation**: Excellent performance. Most cards are culled due to:
- Camera looking at empty space
- Most cards have opacity < 0.01
- Filter is active (reducing visible cards)

**Action**: Normal operation, no issues.

### Scenario 2: Low FPS with High Cards

```
Cards: 625
Chunks: 125
FPS: 25
```

**Interpretation**: Performance bottleneck. All cards are being rendered without culling.

**Possible causes**:
- Opacity culling not working
- Camera positioned where all cards are visible
- Large images causing texture memory issues
- GPU struggling with draw calls

**Action**: Check opacity calculation logic or reduce renderDistance.

### Scenario 3: Stuttering During Movement

```
FPS fluctuating between 30-60
Console shows frequent logs
```

**Interpretation**: Layout recalculation happening too often.

**Possible causes**:
- Camera crossing chunk boundaries rapidly
- useMemo dependencies triggering unnecessarily
- Chunk size too small for camera speed

**Action**: Review useMemo dependencies or increase CHUNK_SIZE.

### Scenario 4: High FPS but Visible Pop-in

```
FPS: 60
Cards smoothly changing
But cards "pop" into view
```

**Interpretation**: Performance is good but visual quality issue.

**Possible causes**:
- renderDistance too small
- Opacity fading not gradual enough
- RENDER_DISTANCE mismatch between infinite.ts and fading.ts

**Action**: Increase renderDistance to 3 (if FPS allows) or adjust fading curve.

## Debugging Workflow

### Step 1: Enable and Observe

1. Press Shift+D
2. Move around the canvas
3. Note FPS, cards, and chunk values
4. Watch for patterns

### Step 2: Check Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for [infinite.ts] and [MoodboardCanvas] logs
4. Check frequency and values

### Step 3: Test Scenarios

Run the benchmark tests from `performance-benchmark.md`:
- Initial load test
- Continuous zoom test
- Pan performance test
- Filter switch test

### Step 4: Profile (Advanced)

If issues persist:
1. Open Chrome DevTools
2. Go to Performance tab
3. Click Record
4. Perform problematic action (zoom, pan, etc.)
5. Stop recording
6. Analyze flame graph for bottlenecks

Look for:
- Long JavaScript execution (layout calculation)
- GPU time (rendering)
- Memory allocation (garbage collection)

## Performance Tuning

### Reduce renderDistance

In `/src/components/moodboard/layouts/infinite.ts`:

```typescript
const renderDistance = 2; // Change to 1 for better performance
```

- renderDistance=1: 27 chunks, ~135 cards
- renderDistance=2: 125 chunks, ~625 cards
- renderDistance=3: 343 chunks, ~1715 cards

### Adjust Opacity Culling

In `/src/components/moodboard/MoodboardCanvas.tsx`:

```typescript
// Skip rendering if too transparent (performance optimization)
if (finalOpacity < 0.01) return null; // Increase to 0.05 for more aggressive culling
```

### Modify Chunk Size

In `/src/components/moodboard/layouts/infinite.ts`:

```typescript
const CHUNK_SIZE = 110; // Increase to 150 to reduce chunk boundary crossings
```

Larger chunks = fewer layout recalculations but less granular density.

### Reduce Items Per Chunk

In `/src/components/moodboard/layouts/infinite.ts`:

```typescript
const ITEMS_PER_CHUNK = 5; // Reduce to 3 for better performance
```

Fewer items = better performance but less content density.

## Troubleshooting

### Stats Overlay Not Appearing

**Check**:
1. Is debug mode enabled? (Press Shift+D)
2. Check browser console for errors
3. Verify PerformanceStats component is loaded

### Incorrect Card Count

**Check**:
1. Verify onRenderStats callback is being called
2. Check opacity culling logic
3. Ensure $cardsRendered store is updating

### Console Logs Not Appearing

**Check**:
1. Debug mode must be enabled
2. Browser console must be open
3. Verify debugMode is passed to calculateInfiniteLayout

### Performance Stats Positioning Conflict

If stats overlay conflicts with hints text:

**Solution**: Adjust positioning in PerformanceStats.tsx:

```typescript
style={{
  bottom: '80px', // Move up to avoid hints
  right: '24px',
  // ...
}}
```

## Best Practices

1. **Always test with debug mode enabled** during development
2. **Disable debug mode** before production screenshots/demos
3. **Record metrics** before making performance optimizations
4. **Test on multiple devices** (desktop, tablet, mobile)
5. **Monitor console logs** for unusual patterns
6. **Use Chrome DevTools Performance tab** for deep analysis
7. **Compare results** with benchmark thresholds

## Additional Resources

- See `performance-benchmark.md` for full test procedures
- Check Three.js documentation for rendering optimizations
- Review React Three Fiber performance guide
- Profile with Chrome DevTools for detailed analysis
