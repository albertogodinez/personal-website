/**
 * Dual opacity fading system for moodboard items
 * - Grid fade: based on chunk distance from camera
 * - Depth fade: based on Z-axis distance from camera
 */

const RENDER_DISTANCE = 2;  // Chunks
const CHUNK_FADE_MARGIN = 1;  // Fade zone
const DEPTH_FADE_START = 140;  // Units
const DEPTH_FADE_END = 260;  // Units

/**
 * Calculate opacity fade based on chunk distance (grid fade)
 * Uses Chebyshev distance (max of absolute differences)
 */
export function calculateGridFade(
  chunkCoords: { cx: number; cy: number; cz: number },
  cameraChunk: { cx: number; cy: number; cz: number }
): number {
  // Chebyshev distance (max of absolute differences)
  const dist = Math.max(
    Math.abs(chunkCoords.cx - cameraChunk.cx),
    Math.abs(chunkCoords.cy - cameraChunk.cy),
    Math.abs(chunkCoords.cz - cameraChunk.cz)
  );

  if (dist <= RENDER_DISTANCE) return 1.0;

  return Math.max(0, 1 - (dist - RENDER_DISTANCE) / CHUNK_FADE_MARGIN);
}

/**
 * Calculate opacity fade based on Z-axis distance (depth fade)
 * Uses squared falloff for non-linear transition
 */
export function calculateDepthFade(
  itemZ: number,
  cameraZ: number
): number {
  const absDepth = Math.abs(itemZ - cameraZ);

  if (absDepth <= DEPTH_FADE_START) return 1.0;

  const fade = Math.max(
    0,
    1 - (absDepth - DEPTH_FADE_START) / (DEPTH_FADE_END - DEPTH_FADE_START)
  );

  return fade * fade;  // Squared for non-linear falloff
}

/**
 * Calculate final item opacity combining all fade factors
 * @param chunkCoords - Item's chunk coordinates
 * @param itemZ - Item's Z position
 * @param cameraChunk - Camera's chunk coordinates
 * @param cameraZ - Camera's Z position
 * @param filterOpacity - Filter-based opacity (1.0 if matches filter, 0.1 if not)
 * @returns Final opacity value [0, 1]
 */
export function calculateItemOpacity(
  chunkCoords: { cx: number; cy: number; cz: number },
  itemZ: number,
  cameraChunk: { cx: number; cy: number; cz: number },
  cameraZ: number,
  filterOpacity: number  // 1.0 if matches filter, 0.1 if not
): number {
  const gridFade = calculateGridFade(chunkCoords, cameraChunk);
  const depthFade = calculateDepthFade(itemZ, cameraZ);

  return Math.min(gridFade, depthFade) * filterOpacity;
}
