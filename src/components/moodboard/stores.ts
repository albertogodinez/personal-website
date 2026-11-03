import { atom } from 'nanostores';

export type LayoutMode = 'infinite' | 'clustered' | 'timeline';

export type FilterValue = 'all' | 'image' | 'gif' | 'video' | 'link';

export const $mode = atom<LayoutMode>('infinite');

export const $activeFilter = atom<FilterValue>('all');

// Selected card for detail overlay (null when overlay is closed)
export const $selectedCard = atom<string | null>(null);

// Debug mode (FPS overlay, toggled via Shift+D)
export const $debugMode = atom<boolean>(false);

// Camera chunk coordinates (updated by CameraRig)
export const $cameraChunk = atom<{ cx: number; cy: number; cz: number }>({
  cx: 0,
  cy: 0,
  cz: 0
});

// Camera position (updated by CameraRig, for performance monitoring)
export const $cameraPosition = atom<{ x: number; y: number; z: number }>({
  x: 0,
  y: 0,
  z: 10
});

// Performance stats (updated by MoodboardCanvas)
export const $cardsRendered = atom<number>(0);
export const $activeChunks = atom<number>(0);
