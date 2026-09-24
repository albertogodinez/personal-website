# Moodboard Canvas Performance Benchmark

## Purpose

This benchmark tests the performance of the infinite moodboard canvas under typical usage scenarios, ensuring smooth 3D navigation and acceptable frame rates.

## Test Environment Requirements

- Browser: Latest Chrome/Firefox/Safari
- Screen resolution: 1920x1080 or higher
- Network: Stable connection for image loading
- No other heavy applications running

## Debug Mode Activation

Enable performance monitoring:
1. Navigate to the moodboard page
2. Press **Shift+D** to toggle debug mode
3. You should see:
   - FPS counter (top-left, from Stats.js)
   - Performance stats overlay (bottom-right)

## Performance Stats Display

The overlay shows:
- **Cards**: Number of cards rendered in current frame (after opacity culling)
- **Chunks**: Number of active chunks being generated (125 for renderDistance=2)
- **Camera**: Current camera position (x, y, z)
- **Chunk**: Current camera chunk coordinates (cx, cy, cz)

## Test Procedures

### Test 1: Initial Load Performance

**Goal**: Verify acceptable performance on first render

**Steps**:
1. Clear browser cache
2. Navigate to moodboard page
3. Enable debug mode (Shift+D)
4. Wait 5 seconds for initial load
5. Record FPS and card count

**Expected Results**:
- FPS: 50+ (desktop), 30+ (mobile)
- Cards rendered: ~625 (125 chunks × 5 items)
- Actual cards visible: Varies based on opacity culling

### Test 2: Continuous Zoom Test

**Goal**: Test performance during infinite zoom

**Steps**:
1. Start at default position (0, 0, 10)
2. Enable debug mode (Shift+D)
3. Continuously scroll/zoom in one direction for 30 seconds
4. Record FPS at 10-second intervals
5. Record card count at each interval
6. Note any frame drops or stuttering

**Sample Recording Table**:

| Time (s) | FPS  | Cards | Camera Z | Chunk Z | Notes |
|----------|------|-------|----------|---------|-------|
| 0        | 60   | 625   | 10.0     | 0       | Start |
| 10       | 58   | 625   | -50.2    | -1      |       |
| 20       | 55   | 625   | -120.5   | -2      |       |
| 30       | 56   | 625   | -210.8   | -3      |       |

**Expected Results**:
- FPS remains above 30 (desktop) or 20 (mobile)
- Card count stays consistent (~625)
- No sustained frame drops
- Smooth chunk transitions

### Test 3: Pan Performance Test

**Goal**: Test performance during lateral movement

**Steps**:
1. Start at default position
2. Enable debug mode (Shift+D)
3. Drag continuously left/right for 20 seconds
4. Record minimum FPS
5. Record chunk transitions

**Expected Results**:
- FPS: 40+ (desktop), 25+ (mobile)
- Smooth chunk loading when crossing boundaries
- No visible pop-in or stuttering

### Test 4: Filter Switch Test

**Goal**: Test performance when switching filters

**Steps**:
1. Enable debug mode (Shift+D)
2. Start at default position
3. Record FPS and card count
4. Switch to "web" filter
5. Record FPS and card count after 2 seconds
6. Switch to "photography" filter
7. Record FPS and card count after 2 seconds

**Expected Results**:
- FPS remains stable during filter changes
- Card count updates appropriately
- No frame drops during transition
- Opacity transitions are smooth

### Test 5: Stress Test (Optional)

**Goal**: Test maximum performance limits

**Steps**:
1. Modify renderDistance in `/src/components/moodboard/layouts/infinite.ts` to 3 (7x7x7 = 343 chunks)
2. Rebuild application
3. Enable debug mode
4. Record FPS and card count

**Expected Results**:
- Document maximum renderDistance before FPS drops below 30
- Note approximate card count limit for acceptable performance

## Performance Thresholds

### Desktop (60 Hz Display)

| Metric | Excellent | Acceptable | Poor |
|--------|-----------|------------|------|
| FPS | 55-60 | 30-54 | <30 |
| Cards | 600-700 | 400-600 | <400 |
| Frame Time | <16.7ms | 16.7-33ms | >33ms |

### Mobile (60 Hz Display)

| Metric | Excellent | Acceptable | Poor |
|--------|-----------|------------|------|
| FPS | 50-60 | 20-49 | <20 |
| Cards | 500-700 | 300-500 | <300 |
| Frame Time | <16.7ms | 20-50ms | >50ms |

## Interpreting Results

### Console Logs

When debug mode is enabled, check browser console for:

```
[infinite.ts] Layout generation: {
  cameraChunk: { cx: 0, cy: 0, cz: 0 },
  renderDistance: 2,
  chunksGenerated: 125,
  itemsGenerated: 625,
  filter: "all"
}

[MoodboardCanvas] Layout calculation: {
  mode: "infinite",
  totalLayouts: 625
}
```

**What to look for**:
- `chunksGenerated` should match expected value (125 for renderDistance=2)
- `itemsGenerated` should be chunksGenerated × 5
- `totalLayouts` should match `itemsGenerated`
- Logs should only appear when camera crosses chunk boundaries

### Performance Stats Overlay

**Cards Rendered vs. Total Layouts**:
- Total layouts generated: 625 (125 chunks × 5)
- Cards rendered: Typically 300-500 (after opacity culling)
- The difference is due to:
  - Items outside camera frustum
  - Items with opacity < 0.01 (culled for performance)
  - Filter-based opacity reduction

**Chunk Count**:
- Should always show 125 for renderDistance=2
- This is the number of chunks being generated, not rendered

**Camera Chunk Transitions**:
- Watch chunk coordinates change as you move
- Each chunk is 110 units (CHUNK_SIZE constant)
- Chunk boundary crossings should be seamless

## Troubleshooting

### Low FPS

**Possible causes**:
1. Too many cards rendered (check overlay)
2. Large images not loading efficiently
3. Browser hardware acceleration disabled
4. Other tabs/apps consuming resources

**Solutions**:
- Reduce renderDistance (edit infinite.ts)
- Implement image size limits
- Check browser GPU settings
- Close other applications

### Frame Stuttering

**Possible causes**:
1. Chunk generation on main thread
2. Layout recalculation too frequent
3. Garbage collection pauses

**Solutions**:
- Verify useMemo dependencies
- Check console for excessive logs
- Profile with Chrome DevTools Performance tab

### Card Pop-in

**Possible causes**:
1. Opacity fading not working correctly
2. renderDistance too small
3. RENDER_DISTANCE mismatch in fading.ts

**Solutions**:
- Check fading.ts RENDER_DISTANCE matches infinite.ts
- Increase renderDistance (trades performance for smoother fading)
- Verify calculateItemOpacity logic

## Performance Optimization History

### Current Configuration (2026-04-22)

- renderDistance: 2 (125 chunks)
- ITEMS_PER_CHUNK: 5
- Total layouts: 625
- Opacity culling threshold: 0.01
- Chunk size: 110 units

### Known Performance Characteristics

- Desktop (MacBook Pro M1): 55-60 FPS
- Mobile (iPhone 14): 45-55 FPS
- Chunk transitions: Seamless at all tested zoom speeds
- Memory usage: Stable at ~150MB

## Future Improvements

Potential optimizations to consider:
1. Frustum culling for off-screen cards
2. LOD (Level of Detail) system for distant cards
3. Texture resolution scaling based on distance
4. Web Worker for chunk generation
5. Instanced rendering for repeated geometries
6. Virtual texturing for large images

## Reporting Issues

When reporting performance issues, include:
1. Device/browser information
2. FPS measurements from all test scenarios
3. Console log output (if debug mode enabled)
3. Screenshots of performance stats overlay
4. Chrome DevTools Performance profile (if possible)
