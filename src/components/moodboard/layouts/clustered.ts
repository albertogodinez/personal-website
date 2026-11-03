import type { ContentType, MoodboardItem } from '../../../types/moodboard';
import type { CardLayout } from './types';

export const CLUSTER_TYPES: ContentType[] = ['image', 'link', 'video', 'gif'];

const CLUSTER_RING_RADIUS = 40;
const SPREAD_RADIUS = 20;
const FOCUSED_SPREAD_RADIUS = 9;

export const clusterCenters = CLUSTER_TYPES.reduce((acc, type, i) => {
  const angle = (i / CLUSTER_TYPES.length) * Math.PI * 2 - Math.PI / 2;
  acc[type] = {
    x: Math.cos(angle) * CLUSTER_RING_RADIUS,
    y: Math.sin(angle) * CLUSTER_RING_RADIUS,
  };
  return acc;
}, {} as Record<string, { x: number; y: number }>);

function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

export function calculateClusteredLayout(
  items: MoodboardItem[],
  filter: string
): CardLayout[] {
  return items.map((item) => {
    const center = clusterCenters[item.contentType] ?? { x: 0, y: 0 };
    const match = filter === 'all' || item.contentType === filter;
    const focused = match && filter !== 'all';

    const angle = seededRandom(item.id) * Math.PI * 2;
    const spread = focused ? FOCUSED_SPREAD_RADIUS : SPREAD_RADIUS;
    const radius = Math.pow(seededRandom(item.id + 'r'), 0.8) * spread;

    const x = center.x + Math.cos(angle) * radius;
    const y = center.y + Math.sin(angle) * radius;

    return {
      id: item.id,
      x: match ? x : x * 1.5,
      y: match ? y : y * 1.5,
      z: 0,
      rotX: 0,
      rotY: 0,
      rotZ: (seededRandom(item.id + 'rot') - 0.5) * 0.15,
      scale: match ? 1 : 0.85,
      opacity: match ? 1 : 0.05,
      width: 16,
      height: 12,
    };
  });
}
