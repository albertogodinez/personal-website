import { Canvas, useFrame } from '@react-three/fiber';
import { Stats } from '@react-three/drei';
import { useStore } from '@nanostores/react';
import React, { useMemo, useEffect, useRef, memo, useCallback, useState } from 'react';
import CameraRig from './CameraRig';
import CardMesh, { type CardEntry } from './CardMesh';
import { getMoodboardItems } from './data-adapter';
import { $mode, $activeFilter, $selectedCard, $debugMode, $cameraChunk, $cardsRendered, $activeChunks } from './stores';
import { generateChunkLayouts, chunkKey } from './layouts/infinite';
import { calculateClusteredLayout } from './layouts/clustered';
import { calculateTimelineLayout } from './layouts/timeline';
import { calculateItemOpacity } from './utils/fading';
import type { MoodboardItem } from '../../types/moodboard';
import type { CardLayout } from './layouts/types';

const OPACITY_LERP = 0.18;
const INVIS_THRESHOLD = 0.01;
const FILTERED_OUT_OPACITY = 0.08;

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
  layout: any;
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
  const renderedCountRef = useRef(0);
  const cardRegistry = useRef(new Map<string, CardEntry>()).current;

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

    // Update stats once per frame
    if (renderedCountRef.current > 0) {
      $cardsRendered.set(renderedCountRef.current);
      renderedCountRef.current = 0; // Reset for next frame
    }
  });

  return (
    <>
      {layouts.map((layout) => {
        const baseItemId = mode === 'infinite'
          ? layout.id.split('-chunk-')[0]
          : layout.id;
        const item = itemsByLayoutId.get(baseItemId);
        if (!item) return null;

        const filterMatch = activeFilter === 'all' || item.contentType === activeFilter;
        renderedCountRef.current++;

        return (
          <MemoizedCard
            key={layout.id}
            layoutId={layout.id}
            layout={layout}
            item={item}
            filterMatch={filterMatch}
            handleCardClick={handleCardClick}
            registry={cardRegistry}
          />
        );
      })}
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

  // Throttled camera chunk to prevent layout thrashing during fast zoom
  const [throttledCameraChunk, setThrottledCameraChunk] = React.useState(cameraChunk);
  const lastChunkUpdateRef = useRef(Date.now());

  useEffect(() => {
    // Throttle chunk updates: 100ms when idle, 400ms when rapidly changing (zooming fast)
    const now = Date.now();
    const timeSinceLastUpdate = now - lastChunkUpdateRef.current;

    // If chunk changed recently (< 200ms), we're likely zooming fast — use longer throttle
    const throttleMs = timeSinceLastUpdate < 200 ? 400 : 100;

    const timeoutId = setTimeout(() => {
      setThrottledCameraChunk(cameraChunk);
      lastChunkUpdateRef.current = Date.now();
    }, throttleMs);

    return () => clearTimeout(timeoutId);
  }, [cameraChunk]);

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

  const items = useMemo(() => getMoodboardItems(), []);

  // For infinite mode: use Map-based chunk storage with incremental delta updates
  const layoutChunksMapRef = useRef<Map<string, CardLayout[]>>(new Map());

  // For clustered/timeline modes: flat array
  const [flatLayouts, setFlatLayouts] = useState<CardLayout[]>([]);

  // Incremental chunk-delta updates for infinite mode (synchronous in useMemo)
  const infiniteLayouts = useMemo(() => {
    if (mode !== 'infinite') {
      return [];
    }

    const renderDistance = 2; // Must match infinite.ts
    const hysteresisBuffer = 1; // Keep 1 extra chunk beyond render distance

    // Compute required chunk keys (5x5x5 grid around camera)
    const requiredKeys = new Set<string>();
    for (let dx = -renderDistance; dx <= renderDistance; dx++) {
      for (let dy = -renderDistance; dy <= renderDistance; dy++) {
        for (let dz = -renderDistance; dz <= renderDistance; dz++) {
          const cx = throttledCameraChunk.cx + dx;
          const cy = throttledCameraChunk.cy + dy;
          const cz = throttledCameraChunk.cz + dz;
          requiredKeys.add(chunkKey(cx, cy, cz));
        }
      }
    }

    const currentMap = layoutChunksMapRef.current;

    // Find chunks to add
    for (const key of requiredKeys) {
      if (!currentMap.has(key)) {
        const [cx, cy, cz] = key.split(',').map(Number);
        const chunkLayouts = generateChunkLayouts(cx, cy, cz, items);
        currentMap.set(key, chunkLayouts);
      }
    }

    // Find chunks to remove (with hysteresis buffer)
    const keysToRemove: string[] = [];
    for (const key of currentMap.keys()) {
      const [cx, cy, cz] = key.split(',').map(Number);
      const dx = Math.abs(cx - throttledCameraChunk.cx);
      const dy = Math.abs(cy - throttledCameraChunk.cy);
      const dz = Math.abs(cz - throttledCameraChunk.cz);
      const maxDist = Math.max(dx, dy, dz);

      if (maxDist > renderDistance + hysteresisBuffer) {
        keysToRemove.push(key);
      }
    }

    for (const key of keysToRemove) {
      currentMap.delete(key);
    }

    $activeChunks.set(currentMap.size);

    // Flatten to array
    const flat: CardLayout[] = [];
    for (const chunkLayouts of currentMap.values()) {
      flat.push(...chunkLayouts);
    }
    return flat;
  }, [mode, throttledCameraChunk, items]);

  // Handle mode transitions
  useEffect(() => {
    if (mode !== 'infinite') {
      layoutChunksMapRef.current.clear();
      $activeChunks.set(0);

      // Compute flat layouts for clustered/timeline
      if (mode === 'clustered') {
        setFlatLayouts(calculateClusteredLayout(items, activeFilter));
      } else {
        setFlatLayouts(calculateTimelineLayout(items, activeFilter));
      }
    }
    // When entering infinite mode, the incremental effect above will populate the map
  }, [mode, items, activeFilter]);

  // Update flat layouts when filter changes in clustered/timeline modes
  useEffect(() => {
    if (mode === 'clustered') {
      setFlatLayouts(calculateClusteredLayout(items, activeFilter));
    } else if (mode === 'timeline') {
      setFlatLayouts(calculateTimelineLayout(items, activeFilter));
    }
  }, [mode, activeFilter, items]);

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
    const map = new Map<string, MoodboardItem>();
    if (mode === 'infinite') {
      // In infinite mode, chunk-based IDs: "itemId-chunk-cx-cy-cz-i"
      // We need to map all possible layout IDs to their items
      // Since we don't know all chunk coords ahead of time, we'll do lookup on-demand
      // Store by item ID prefix for now
      items.forEach(item => {
        map.set(item.id, item);
      });
    } else {
      // In other modes, 1:1 mapping
      items.forEach(item => {
        map.set(item.id, item);
      });
    }
    return map;
  }, [items, mode]);

  return (
    <Canvas
      camera={{ position: [0, 0, 10], fov: 75 }}
      style={{ width: '100vw', height: '100vh' }}
    >
      <ambientLight intensity={0.5} />
      <directionalLight position={[10, 10, 5]} intensity={1} />

      <CameraRig />

      {debugMode && <Stats />}

      <SceneContent
        mode={mode}
        layouts={mode === 'infinite' ? infiniteLayouts : flatLayouts}
        itemsByLayoutId={itemsByLayoutId}
        activeFilter={activeFilter}
        handleCardClick={handleCardClick}
      />
    </Canvas>
  );
}
