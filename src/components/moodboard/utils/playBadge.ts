import { CanvasTexture, SRGBColorSpace, type Texture } from 'three';

let cached: Texture | null = null;

export function getPlayBadgeTexture(): Texture | null {
  if (cached) return cached;
  if (typeof document === 'undefined') return null;

  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;

  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const center = size / 2;
  ctx.fillStyle = 'rgba(12, 12, 12, 0.72)';
  ctx.beginPath();
  ctx.arc(center, center, center * 0.9, 0, Math.PI * 2);
  ctx.fill();

  const tri = size * 0.26;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.moveTo(center - tri * 0.55, center - tri);
  ctx.lineTo(center - tri * 0.55, center + tri);
  ctx.lineTo(center + tri, center);
  ctx.closePath();
  ctx.fill();

  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.needsUpdate = true;
  cached = texture;
  return texture;
}
