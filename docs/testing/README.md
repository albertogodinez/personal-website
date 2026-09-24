# Performance Testing Documentation

## Quick Reference

### Enable Performance Monitoring

Press **Shift+D** on the moodboard page.

### What You'll See

1. **FPS Counter** (top-left) - Frame rate from Stats.js
2. **Performance Stats** (bottom-right) - Custom metrics overlay

### Files in This Directory

1. **performance-monitoring-guide.md**
   - Complete guide for developers
   - How to interpret metrics
   - Debugging workflows
   - Troubleshooting tips

2. **performance-benchmark.md**
   - Test procedures and protocols
   - Recording templates
   - Performance thresholds
   - Stress testing instructions

3. **performance-monitoring-summary.md**
   - Implementation details
   - Architecture overview
   - File changes summary
   - Technical reference

## Quick Start Testing

```bash
# 1. Start dev server
pnpm dev

# 2. Navigate to moodboard page
open http://localhost:4321/moodboard

# 3. Enable debug mode
# Press Shift+D

# 4. Open browser console
# Press F12 (Chrome/Firefox) or Cmd+Option+I (Safari)

# 5. Test performance
# - Zoom in/out continuously
# - Pan left/right
# - Switch filters
# - Monitor FPS and card count
```

## Interpreting Results

### Good Performance
- FPS: 55-60 (desktop) or 45-55 (mobile)
- Cards: 300-500
- Smooth movement, no stuttering

### Poor Performance
- FPS: <30 (desktop) or <20 (mobile)
- Cards: >600 (culling issues)
- Visible stuttering or pop-in

## Common Issues

### Stats Not Showing
- Verify debug mode is enabled (Shift+D)
- Check browser console for errors
- Refresh the page

### Low FPS
- Reduce renderDistance in infinite.ts
- Check other browser tabs/apps
- Verify hardware acceleration is enabled

### Console Logs Missing
- Debug mode must be enabled
- Console must be open before navigating
- Logs only appear on chunk boundaries

## Performance Tuning

Quick adjustments in `/src/components/moodboard/layouts/infinite.ts`:

```typescript
// Reduce density (better performance)
const renderDistance = 1; // Was: 2
const ITEMS_PER_CHUNK = 3; // Was: 5

// Reduce chunk boundary crossings
const CHUNK_SIZE = 150; // Was: 110
```

## Support Resources

- **User Guide**: performance-monitoring-guide.md
- **Test Procedures**: performance-benchmark.md
- **Implementation Details**: performance-monitoring-summary.md
- **Remaining Work**: /.scratch/moodboard-canvas/spec.md

## Reporting Issues

When filing a performance issue, include:
1. Device and browser info
2. FPS measurements from benchmark tests
3. Screenshots of performance stats overlay
4. Console log output (with debug mode enabled)
5. Steps to reproduce

## Next Steps

After running performance tests:
1. Review benchmark results
2. Compare against thresholds
3. Identify bottlenecks
4. Apply optimizations if needed
5. Re-test and document improvements

---

**Last Updated**: 2026-04-22
**Status**: Performance monitoring system active and ready for testing
