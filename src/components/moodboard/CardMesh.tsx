import { animated, useSpring } from '@react-spring/three';
import { Suspense, useEffect, useEffectEvent, useMemo, useRef, useState } from 'react';
import { CanvasTexture, SRGBColorSpace, Texture } from 'three';
import type * as THREE from 'three';
import type { CardLayout, ChunkCoords } from './layouts/types';
import { getPlayBadgeTexture } from './utils/playBadge';

export type CardEntry = {
  layoutId: string;
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  badgeMaterial: THREE.MeshBasicMaterial | null;
  opacity: number;
  chunkCoords: ChunkCoords;
  layout: CardLayout;
  filterMatch: boolean;
};

interface CardMeshProps {
  layout: CardLayout;
  imageUrl: string;
  onClick: () => void;
  filterMatch: boolean;
  layoutId: string;
  registry: Map<string, CardEntry>;
  youtubeId?: string;
}

// Global texture cache to share textures across cards with same image
const ORIGIN_CHUNK: ChunkCoords = { cx: 0, cy: 0, cz: 0 };

const textureCache = new Map<string, Texture>();
const loadingCache = new Set<string>();
const errorCache = new Set<string>();

async function loadTextureOffthread(url: string): Promise<Texture> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`proxy ${res.status}`);
  const fallback = res.headers.get('X-Proxy-Fallback');
  if (fallback) throw new Error(`proxy fallback: ${fallback}`);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob, { imageOrientation: 'flipY' });
  const texture = new CanvasTexture(bitmap);
  texture.flipY = false;
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function CardMeshInner({
  layout,
  imageUrl,
  onClick,
  filterMatch,
  layoutId,
  registry,
  youtubeId,
}: CardMeshProps) {
  const [texture, setTexture] = useState<Texture | null>(() => textureCache.get(imageUrl) || null);
  const [hasError, setHasError] = useState(() => errorCache.has(imageUrl));
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const badgeMaterialRef = useRef<THREE.MeshBasicMaterial>(null);

  useEffect(() => {
    // Cached and failed URLs were already resolved by the useState
    // initializers above. CardMesh keys this component by imageUrl, so a new
    // URL remounts it and re-runs those initializers.
    if (textureCache.has(imageUrl) || errorCache.has(imageUrl)) return;

    // `cancelled` guards every setState below. The previous cleanup was an
    // empty function, so an unmount mid-load still fired setState.
    let cancelled = false;

    // Avoid loading the same image multiple times concurrently
    if (loadingCache.has(imageUrl)) {
      // Wait for the other load to complete and check cache again
      const checkInterval = setInterval(() => {
        const ready = textureCache.get(imageUrl);
        if (ready) {
          setTexture(ready);
          clearInterval(checkInterval);
        } else if (errorCache.has(imageUrl)) {
          setHasError(true);
          clearInterval(checkInterval);
        }
      }, 50);
      return () => clearInterval(checkInterval);
    }

    // Load texture off-thread. async/await rather than .then(): the chain's
    // then() returned nothing, which promise/always-return flags, and the
    // callback's parameter shadowed the `texture` state above.
    loadingCache.add(imageUrl);
    const load = async () => {
      try {
        const loaded = await loadTextureOffthread(imageUrl);
        if (cancelled) {
          loadingCache.delete(imageUrl);
          return;
        }
        const apply = () => {
          if (cancelled) return;
          textureCache.set(imageUrl, loaded);
          loadingCache.delete(imageUrl);
          setTexture(loaded);
          setHasError(false);
        };
        // Defer GPU upload to idle time when supported
        if (typeof requestIdleCallback === 'undefined') {
          setTimeout(apply, 0);
        } else {
          requestIdleCallback(apply, { timeout: 50 });
        }
      } catch {
        errorCache.add(imageUrl);
        loadingCache.delete(imageUrl);
        if (!cancelled) setHasError(true);
      }
    };
    void load();

    // Textures are NOT disposed here: they are shared across cards via
    // textureCache and persist for reuse.
    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  const chunkCoords = layout.chunk ?? ORIGIN_CHUNK;

  const finalScale = filterMatch ? layout.scale : layout.scale * 0.8;

  // Memoize spring config to avoid retargeting when values haven't changed
  const springConfig = useMemo(() => ({
    position: [layout.x, layout.y, layout.z] as [number, number, number],
    // Scalars, not a tuple: a tuple spring doesn't type-check as an Euler.
    rotX: layout.rotX,
    rotY: layout.rotY,
    rotZ: layout.rotZ,
    scale: finalScale,
    config: { tension: 170, friction: 26, precision: 0.01 },
  }), [layout.x, layout.y, layout.z, layout.rotX, layout.rotY, layout.rotZ, finalScale]);

  const spring = useSpring(springConfig);

  // Reads the latest props without making them dependencies: re-registering
  // on every layout or filter change would reset the entry's opacity. The
  // effect below keeps those fields current instead.
  const currentFields = useEffectEvent(() => ({ chunkCoords, layout, filterMatch }));

  useEffect(() => {
    if (!meshRef.current || !materialRef.current) return;

    registry.set(layoutId, {
      layoutId,
      mesh: meshRef.current,
      material: materialRef.current,
      badgeMaterial: badgeMaterialRef.current,
      opacity: registry.get(layoutId)?.opacity ?? 0,
      ...currentFields(),
    });

    return () => {
      registry.delete(layoutId);
    };
    // `texture` is load-bearing: the mesh only mounts once its texture has
    // loaded (the component renders null before), so refs are null until then.
  }, [layoutId, registry, texture]);

  useEffect(() => {
    const entry = registry.get(layoutId);
    if (entry) {
      entry.filterMatch = filterMatch;
      entry.layout = layout;
      entry.chunkCoords = chunkCoords;
    }
  }, [filterMatch, layout, chunkCoords, layoutId, registry]);

  if (hasError || !texture) {
    return null;
  }

  const badgeTexture = youtubeId ? getPlayBadgeTexture() : null;
  const badgeSize = Math.min(layout.width, layout.height) * 0.28;

  return (
    <animated.mesh
      ref={meshRef}
      position={spring.position}
      rotation-x={spring.rotX}
      rotation-y={spring.rotY}
      rotation-z={spring.rotZ}
      scale={spring.scale}
      onClick={onClick}
      onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
      onPointerOut={() => { document.body.style.cursor = 'default'; }}
    >
      <planeGeometry args={[layout.width, layout.height]} />
      <meshBasicMaterial
        ref={materialRef}
        map={texture}
        transparent
        opacity={0}
        depthWrite={false}
      />
      {badgeTexture && (
        <mesh position={[0, 0, 0.01]}>
          <planeGeometry args={[badgeSize, badgeSize]} />
          <meshBasicMaterial
            ref={badgeMaterialRef}
            map={badgeTexture}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      )}
    </animated.mesh>
  );
}

export default function CardMesh(props: CardMeshProps) {
  return (
    <Suspense fallback={null}>
      <CardMeshInner key={props.imageUrl} {...props} />
    </Suspense>
  );
}
