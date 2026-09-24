# 13 — Verify touch, pinch and 60fps on a real device

Status: ready-for-agent

Original build Unit 8. Mobile touch and pinch are implemented in
`src/components/moodboard/CameraRig.tsx` but have never been run on a physical
device, and the 60fps-on-mobile target from the requirements has never been
measured.

This ticket needs a human with a phone. It cannot be satisfied by browser
device emulation, which does not reproduce real touch behaviour or real GPU
limits.

## Do

1. Serve the dev server on the local network and open the board on a real
   phone.
2. Verify single-finger drag pans, two-finger pinch zooms, tap opens the detail
   overlay, and the filter bar and mode switch are usable at that size.
3. Measure frame rate during drag and pinch using the stats overlay (Shift+D)
   or remote device profiling, following
   `docs/testing/performance-monitoring-guide.md`.
4. Record the device, OS version, browser and the measured numbers in the
   ticket comments.

## Done when

- Drag, pinch and tap are confirmed working on at least one real phone.
- A frame-rate number is recorded against the 60fps target — including if it
  misses, in which case open a follow-up ticket rather than fixing it here.
