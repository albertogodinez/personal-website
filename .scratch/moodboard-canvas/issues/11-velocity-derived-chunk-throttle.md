# 11 — Derive the chunk throttle from camera velocity

Status: ready-for-agent

Chunk layout updates are throttled by elapsed time in
`src/components/moodboard/MoodboardCanvas.tsx`: 100ms when idle, 400ms when a
chunk changed within the last 200ms (treated as "zooming fast"). It works, but
the thresholds are tuned by feel and the proxy for speed is indirect.

Note this is a refactor of working behaviour. The bar is that it stays at least
as smooth, not merely that it is tidier.

## Do

- Replace the elapsed-time heuristic with a throttle derived from the camera
  velocity the rig already tracks.
- Keep the hysteresis that prevents chunk thrash at boundaries — the existing
  `+1` chunk retention radius exists for this reason and should not change.
- Measure before and after with the stats overlay (Shift+D) and the procedure
  in `docs/testing/performance-benchmark.md`.

## Done when

- p95 during drag and zoom is no worse than the documented baseline
  (median p95 9.8ms, steady-state p99 ~10ms).
- Before/after numbers are recorded in the ticket comments.
- If the velocity-derived version cannot match the current numbers, close this
  as rejected and record why — the existing behaviour is acceptable.
