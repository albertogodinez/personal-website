import type { MoodboardItem } from '../../../types/moodboard';
import type { CardLayout } from './types';

// Seeded random
function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

/**
 * Timeline mode layout calculator.
 * Arranges cards chronologically along a horizontal spine.
 */
export function calculateTimelineLayout(
  items: MoodboardItem[],
  filter: string
): CardLayout[] {
  // Sort by date
  const sorted = items.toSorted((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return sorted.map((item, i) => {
    const match = filter === 'all' || item.contentType === filter;

    // Space cards along X-axis
    const x = (i - sorted.length / 2) * 8;

    // Alternate above/below spine with jitter
    const baseY = (i % 2 === 0 ? -6 : 6);
    const jitter = (seededRandom(item.id + 'y') - 0.5) * 2;
    const y = baseY + jitter;

    return {
      id: item.id,
      x,
      y,
      z: 0, // Flat plane
      rotX: 0,
      rotY: 0,
      rotZ: (seededRandom(item.id + 'rot') - 0.5) * 0.06,
      scale: match ? 1 : 0.9,
      opacity: match ? 1 : 0.1,
      width: 16, // Medium size for timeline mode
      height: 12,
    };
  });
}
