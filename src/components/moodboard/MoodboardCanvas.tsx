import { Canvas, useFrame } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { useStore } from '@nanostores/react';
import { useMemo, useEffect, useRef, memo, useCallback, useState, type CSSProperties } from 'react';
import CameraRig from './CameraRig';
import CardMesh, { type CardEntry } from './CardMesh';
import { getMoodboardItems } from './data-adapter';
import { $mode, $activeFilter, $selectedCard, $debugMode, $cameraChunk, $cardsRendered, $activeChunks } from './stores';
import { generateChunkLayouts, chunkKey } from './layouts/infinite';
import { calculateClusteredLayout } from './layouts/clustered';
import { calculateTimelineLayout } from './layouts/timeline';
import { calculateItemOpacity } from './utils/fading';
import type { MoodboardItem } from '../../types/moodboard';
import type { CardLayout, ChunkCoords } from './layouts/types';

const OPACITY_LERP = 0.18;
const INVIS_THRESHOLD = 0.01;
const FILTERED_OUT_OPACITY = 0.08;

const RENDER_DISTANCE = 2; // Must match infinite.ts
const HYSTERESIS_BUFFER = 1; // Keep 1 extra chunk beyond render distance

const CAMERA = { position: [0, 0, 10] as [number, number, number], fov: 75 };
// `grab` is the resting cursor; CameraRig swaps it to `grabbing` mid-drag.
const CANVAS_STYLE: CSSProperties = { width: '100vw', height: '100vh', cursor: 'grab' };

type ChunkMap = ReadonlyMap<string, CardLayout[]>;

/**
 * Applies the add/remove delta for a camera chunk to an existing chunk map.
 * Surviving chunks keep their layout arrays (object identity), so their cards
 * don't remount — see CODING_STANDARDS.md "React Three Fiber". Returns `prev`
 * itself when nothing changed, so React skips the re-render.
 */
function applyChunkDelta(prev: ChunkMap, camera: ChunkCoords, items: MoodboardItem[]): ChunkMap {
  const next = new Map(prev);

  for (let dx = -RENDER_DISTANCE; dx <= RENDER_DISTANCE; dx++) {
    for (let dy = -RENDER_DISTANCE; dy <= RENDER_DISTANCE; dy++) {
      for (let dz = -RENDER_DISTANCE; dz <= RENDER_DISTANCE; dz++) {
        const cx = camera.cx + dx;
        const cy = camera.cy + dy;
        const cz = camera.cz + dz;
        const key = chunkKey(cx, cy, cz);
        if (!next.has(key)) next.set(key, generateChunkLayouts(cx, cy, cz, items));
      }
    }
  }

  for (const key of next.keys()) {
    const [cx, cy, cz] = key.split(',').map(Number);
    const maxDist = Math.max(Math.abs(cx - camera.cx), Math.abs(cy - camera.cy), Math.abs(cz - camera.cz));
    if (maxDist > RENDER_DISTANCE + HYSTERESIS_BUFFER) next.delete(key);
  }

  const unchanged = next.size === prev.size && [...next.keys()].every((key) => prev.has(key));
  return unchanged ? prev : next;
}

/**
 * Memoized card component to avoid re-rendering when props don't change
 */
const MemoizedCard = memo(function MemoizedCard({
  layoutId,
  layout,
  item,
  filterMatch,
  handleCardClick,
  registry,
}: {
  layoutId: string;
  layout: CardLayout;
  item: MoodboardItem;
  filterMatch: boolean;
  handleCardClick: (id: string) => void;
  registry: Map<string, CardEntry>;
}) {
  // Memoize proxiedUrl to avoid rebuilding URL string every render
  const proxiedUrl = useMemo(
    () => `/api/proxy-image?url=${encodeURIComponent(item.mediaUrl)}`,
    [item.mediaUrl]
  );

  return (
    <CardMesh
      key={layoutId}
      layout={layout}
      imageUrl={proxiedUrl}
      onClick={() => handleCardClick(layoutId)}
      filterMatch={filterMatch}
      layoutId={layoutId}
      registry={registry}
      youtubeId={item.youtubeId}
    />
  );
});

/**
 * Scene content component that has access to Three.js context
 */
function SceneContent({
  mode,
  layouts,
  itemsByLayoutId,
  activeFilter,
  handleCardClick,
}: {
  mode: string;
  layouts: CardLayout[];
  itemsByLayoutId: Map<string, MoodboardItem>;
  activeFilter: string;
  handleCardClick: (id: string) => void;
}) {
  const [cardRegistry] = useState(() => new Map<string, CardEntry>());

  useFrame((state) => {
    const cameraZ = state.camera.position.z;
    const cameraChunk = $cameraChunk.get();
    const isInfinite = mode === 'infinite';

    for (const entry of cardRegistry.values()) {
      const base = isInfinite
        ? calculateItemOpacity(entry.chunkCoords, entry.layout.z, cameraChunk, cameraZ, 1.0)
        : 1;
      const target = entry.filterMatch ? base : FILTERED_OUT_OPACITY;

      entry.opacity =
        target < INVIS_THRESHOLD && entry.opacity < INVIS_THRESHOLD
          ? 0
          : entry.opacity + (target - entry.opacity) * OPACITY_LERP;

      const fullyOpaque = entry.opacity > 0.99;
      const applied = fullyOpaque ? 1 : entry.opacity;

      entry.material.opacity = applied;
      entry.material.depthWrite = fullyOpaque;
      if (entry.badgeMaterial) entry.badgeMaterial.opacity = applied;
      entry.mesh.visible = entry.opacity > INVIS_THRESHOLD;
    }
  });

  const cards = layouts.flatMap((layout) => {
    const baseItemId = mode === 'infinite' ? layout.id.split('-chunk-')[0] : layout.id;
    const item = itemsByLayoutId.get(baseItemId);
    return item ? [{ layout, item, filterMatch: activeFilter === 'all' || item.contentType === activeFilter }] : [];
  });

  useEffect(() => {
    $cardsRendered.set(cards.length);
  }, [cards.length]);

  return (
    <>
      {cards.map(({ layout, item, filterMatch }) => (
        <MemoizedCard
          key={layout.id}
          layoutId={layout.id}
          layout={layout}
          item={item}
          filterMatch={filterMatch}
          handleCardClick={handleCardClick}
          registry={cardRegistry}
        />
      ))}
    </>
  );
}

/**
 * Main R3F canvas component for the moodboard.
 * Renders a 3D scene with camera controls and cards.
 */
export default function MoodboardCanvas() {
  const mode = useStore($mode);
  const activeFilter = useStore($activeFilter);
  const debugMode = useStore($debugMode);
  const cameraChunk = useStore($cameraChunk);

  const items = useMemo(() => getMoodboardItems(), []);

  // Infinite mode's chunk map. Kept up to date in every mode, so switching
  // back to infinite renders the right chunks immediately.
  const [chunkMap, setChunkMap] = useState(() => applyChunkDelta(new Map(), cameraChunk, items));
  const lastChunkUpdateRef = useRef(0);

  useEffect(() => {
    // Throttle chunk updates: 100ms when idle, 400ms when rapidly changing (zooming fast)
    const timeSinceLastUpdate = Date.now() - lastChunkUpdateRef.current;

    // If chunk changed recently (< 200ms), we're likely zooming fast — use longer throttle
    const throttleMs = timeSinceLastUpdate < 200 ? 400 : 100;

    const timeoutId = setTimeout(() => {
      setChunkMap((prev) => applyChunkDelta(prev, cameraChunk, items));
      lastChunkUpdateRef.current = Date.now();
    }, throttleMs);

    return () => clearTimeout(timeoutId);
  }, [cameraChunk, items]);

  // Keyboard shortcut for debug mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.shiftKey && e.key === 'D') {
        $debugMode.set(!$debugMode.get());
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    $activeChunks.set(mode === 'infinite' ? chunkMap.size : 0);
  }, [mode, chunkMap]);

  const layouts = useMemo(() => {
    if (mode === 'clustered') return calculateClusteredLayout(items, activeFilter);
    if (mode === 'timeline') return calculateTimelineLayout(items, activeFilter);
    return [...chunkMap.values()].flat();
  }, [mode, items, activeFilter, chunkMap]);

  const handleCardClick = useCallback((id: string) => {
    // Extract original item ID from layout ID
    // Formats: "itemId-chunk-cx-cy-cz-i" (infinite) or "itemId" (other modes)
    const originalId = mode === 'infinite'
      ? id.split('-chunk-')[0]
      : id;
    $selectedCard.set(originalId);
  }, [mode]);

  // Create a map for efficient item lookup by layout ID
  const itemsByLayoutId = useMemo(() => {
    // Keyed by item ID. Infinite-mode layout IDs ("itemId-chunk-cx-cy-cz-i")
    // are reduced to their item ID by SceneContent before lookup.
    const map = new Map<string, MoodboardItem>();
    for (const item of items) map.set(item.id, item);
    return map;
  }, [items]);

  return (
    <Canvas camera={CAMERA} style={CANVAS_STYLE}>
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <CameraRig />

      {debugMode && <Stats />}

      <SceneContent
        mode={mode}
        layouts={layouts}
        itemsByLayoutId={itemsByLayoutId}
        activeFilter={activeFilter}
        handleCardClick={handleCardClick}
      />
    </Canvas>
  );
}
