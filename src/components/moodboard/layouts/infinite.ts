import type { MoodboardItem } from '../../../types/moodboard';
import type { CardLayout } from './types';

// Core constants for chunk-based positioning
const CHUNK_SIZE = 110; // Units per chunk
const ITEMS_PER_CHUNK = 5; // Items to generate per chunk

/**
 * Seeded random function for deterministic positioning.
 * Uses sine-based approach from Codrops implementation.
 */
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/**
 * Hash chunk coordinates into a single seed value.
 * Uses prime number mixing to ensure good distribution.
 */
function hashChunkCoords(cx: number, cy: number, cz: number): number {
  return ((cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791)) & 0x7FFFFFFF;
}

/**
 * Generate chunk key for stable Map-based storage.
 */
export function chunkKey(cx: number, cy: number, cz: number): string {
  return `${cx},${cy},${cz}`;
}

/**
 * Generate layouts for a single chunk.
 * Returns an array of ITEMS_PER_CHUNK CardLayouts with filter-independent opacity/scale.
 * Filter opacity is applied at render time, not baked into layouts.
 */
export function generateChunkLayouts(
  cx: number,
  cy: number,
  cz: number,
  items: MoodboardItem[]
): CardLayout[] {
  if (items.length === 0) {
    return [];
  }

  const chunkLayouts: CardLayout[] = [];
  const chunkSeed = hashChunkCoords(cx, cy, cz);

  for (let i = 0; i < ITEMS_PER_CHUNK; i++) {
    const itemSeed = chunkSeed + i * 1000;
    const r = (offset: number) => seededRandom(itemSeed + offset);

    const itemIndex = Math.floor(r(5) * 1000000) % items.length;
    const item = items[itemIndex];

    if (!item) continue;

    // Generate position within chunk
    const x = cx * CHUNK_SIZE + r(0) * CHUNK_SIZE;
    const y = cy * CHUNK_SIZE + r(1) * CHUNK_SIZE;
    const z = cz * CHUNK_SIZE + r(2) * CHUNK_SIZE;

    // Generate rotation
    const rotationRange = 0.15;
    const rotX = (r(3) - 0.5) * rotationRange;
    const rotY = (r(4) - 0.5) * rotationRange;
    const rotZ = (r(6) - 0.5) * rotationRange;

    // Generate size
    const size = 12 + r(7) * 8;
    const aspectRatio = 4 / 3;
    const width = size;
    const height = size / aspectRatio;

    // DO NOT bake filter opacity/scale — leave at 1.0
    // Filter is applied at render time in CardMesh
    chunkLayouts.push({
      id: `${item.id}-chunk-${cx}-${cy}-${cz}-${i}`,
      chunk: { cx, cy, cz },
      x,
      y,
      z,
      rotX,
      rotY,
      rotZ,
      scale: 1.0,
      opacity: 1.0,
      width,
      height,
    });
  }

  return chunkLayouts;
}
