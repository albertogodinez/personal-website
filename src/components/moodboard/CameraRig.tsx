import { useStore } from '@nanostores/react';
import { useFrame, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import { $cameraChunk, $cameraPosition, $mode } from './stores';
import type { LayoutMode } from './stores';

const CHUNK_SIZE = 110;
const MAX_VELOCITY = 3.2;
const VELOCITY_LERP = 0.16;
const VELOCITY_DECAY = 0.9;
const SCROLL_ACCUM_DECAY = 0.8;
const SCROLL_SENSITIVITY = 0.006;
const DRAG_SENSITIVITY = 0.025;
const TOUCH_DRAG_SENSITIVITY = 0.02;
const DRAG_REFERENCE_DISTANCE = 50;
const TRANSITION_LERP = 0.12;
const TRANSITION_EPSILON = 0.5;

const MODE_HOME: Record<LayoutMode, [number, number, number]> = {
  infinite: [0, 0, 50],
  clustered: [0, 0, 95],
  timeline: [0, 0, 45],
};

const MODE_Z_BOUNDS: Record<LayoutMode, [number, number] | null> = {
  infinite: null,
  clustered: [18, 220],
  timeline: [14, 160],
};

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export default function CameraRig() {
  const { camera, gl } = useThree();
  const mode = useStore($mode);

  const modeRef = useRef<LayoutMode>(mode);
  const velocity = useRef({ x: 0, y: 0, z: 0 });
  const targetVel = useRef({ x: 0, y: 0, z: 0 });
  const basePos = useRef({ x: 0, y: 0, z: MODE_HOME[mode][2] });
  const scrollAccum = useRef(0);
  const isDragging = useRef(false);
  const lastPointer = useRef({ x: 0, y: 0 });
  const lastTouchDist = useRef(0);
  const lastChunk = useRef({ cx: 0, cy: 0, cz: 0 });
  const transitionTo = useRef<[number, number, number] | null>(null);

  useEffect(() => {
    modeRef.current = mode;
    transitionTo.current = MODE_HOME[mode];
    velocity.current = { x: 0, y: 0, z: 0 };
    targetVel.current = { x: 0, y: 0, z: 0 };
    scrollAccum.current = 0;
  }, [mode]);

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.style.cursor = 'grab';

    const dragFactor = (base: number) => {
      if (modeRef.current === 'infinite') return base;
      return (base * Math.abs(basePos.current.z)) / DRAG_REFERENCE_DISTANCE;
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging.current) return;
      const factor = dragFactor(DRAG_SENSITIVITY);
      targetVel.current.x -= (e.clientX - lastPointer.current.x) * factor;
      targetVel.current.y += (e.clientY - lastPointer.current.y) * factor;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };

    const onPointerUp = () => {
      isDragging.current = false;
      canvas.style.cursor = 'grab';
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      scrollAccum.current += e.deltaY * SCROLL_SENSITIVITY;
    };

    const touchDistance = (touches: TouchList) => {
      if (touches.length < 2) return 0;
      return Math.hypot(
        touches[1].clientX - touches[0].clientX,
        touches[1].clientY - touches[0].clientY
      );
    };

    const onTouchStart = (e: TouchEvent) => {
      lastTouchDist.current = touchDistance(e.touches);
      if (e.touches.length === 1) {
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const factor = dragFactor(TOUCH_DRAG_SENSITIVITY);
        targetVel.current.x -= (touch.clientX - lastPointer.current.x) * factor;
        targetVel.current.y += (touch.clientY - lastPointer.current.y) * factor;
        lastPointer.current = { x: touch.clientX, y: touch.clientY };
      } else if (e.touches.length === 2 && lastTouchDist.current > 0) {
        const dist = touchDistance(e.touches);
        scrollAccum.current += (lastTouchDist.current - dist) * SCROLL_SENSITIVITY;
        lastTouchDist.current = dist;
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      lastTouchDist.current = touchDistance(e.touches);
      if (e.touches.length === 1) {
        lastPointer.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      }
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('touchstart', onTouchStart, { passive: true });
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd, { passive: true });

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('touchstart', onTouchStart);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [camera, gl]);

  useFrame(() => {
    const v = velocity.current;
    const tv = targetVel.current;
    const p = basePos.current;

    const home = transitionTo.current;
    if (home) {
      p.x = lerp(p.x, home[0], TRANSITION_LERP);
      p.y = lerp(p.y, home[1], TRANSITION_LERP);
      p.z = lerp(p.z, home[2], TRANSITION_LERP);
      const settled =
        Math.abs(p.x - home[0]) < TRANSITION_EPSILON &&
        Math.abs(p.y - home[1]) < TRANSITION_EPSILON &&
        Math.abs(p.z - home[2]) < TRANSITION_EPSILON;
      if (settled) {
        p.x = home[0];
        p.y = home[1];
        p.z = home[2];
        transitionTo.current = null;
      }
    } else {
      tv.z += scrollAccum.current;
      scrollAccum.current *= SCROLL_ACCUM_DECAY;

      tv.x = clamp(tv.x, -MAX_VELOCITY, MAX_VELOCITY);
      tv.y = clamp(tv.y, -MAX_VELOCITY, MAX_VELOCITY);
      tv.z = clamp(tv.z, -MAX_VELOCITY, MAX_VELOCITY);

      v.x = lerp(v.x, tv.x, VELOCITY_LERP);
      v.y = lerp(v.y, tv.y, VELOCITY_LERP);
      v.z = lerp(v.z, tv.z, VELOCITY_LERP);

      p.x += v.x;
      p.y += v.y;
      p.z += v.z;

      const bounds = MODE_Z_BOUNDS[modeRef.current];
      if (bounds) {
        const clamped = clamp(p.z, bounds[0], bounds[1]);
        if (clamped !== p.z) {
          p.z = clamped;
          v.z = 0;
          tv.z = 0;
        }
      }

      tv.x *= VELOCITY_DECAY;
      tv.y *= VELOCITY_DECAY;
      tv.z *= VELOCITY_DECAY;
    }

    camera.position.set(p.x, p.y, p.z);

    const cx = Math.floor(p.x / CHUNK_SIZE);
    const cy = Math.floor(p.y / CHUNK_SIZE);
    const cz = Math.floor(p.z / CHUNK_SIZE);

    if (cx !== lastChunk.current.cx || cy !== lastChunk.current.cy || cz !== lastChunk.current.cz) {
      lastChunk.current = { cx, cy, cz };
      $cameraChunk.set({ cx, cy, cz });
    }

    $cameraPosition.set({ x: p.x, y: p.y, z: p.z });
  });

  return null;
}
