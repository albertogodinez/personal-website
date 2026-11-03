import type { APIRoute } from 'astro';
import sharp from 'sharp';

export const prerender = false;

const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=',
  'base64'
);

const UPSTREAM_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
};

function fallbackResponse(reason: string) {
  return new Response(new Uint8Array(TRANSPARENT_PNG).buffer, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*',
      'X-Proxy-Fallback': reason,
    },
  });
}

export const GET: APIRoute = async ({ url }) => {
  const imageUrl = url.searchParams.get('url');

  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  try {
    const response = await fetch(imageUrl, { headers: UPSTREAM_HEADERS });

    if (!response.ok) {
      return fallbackResponse(`upstream-${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();

    try {
      const buffer = Buffer.from(arrayBuffer);
      const image = sharp(buffer);
      const metadata = await image.metadata();
      const needsResize = (metadata.width ?? 0) > 512;

      if (!needsResize) {
        return new Response(new Uint8Array(buffer).buffer, {
          headers: {
            'Content-Type': response.headers.get('content-type') ?? 'image/jpeg',
            'Cache-Control': 'public, max-age=604800',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      const resized = await image
        .resize({ width: 512, withoutEnlargement: true })
        .jpeg({ quality: 82 })
        .toBuffer();

      return new Response(new Uint8Array(resized).buffer, {
        headers: {
          'Content-Type': 'image/jpeg',
          'Cache-Control': 'public, max-age=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } catch {
      return new Response(arrayBuffer, {
        headers: {
          'Content-Type': response.headers.get('content-type') ?? 'image/jpeg',
          'Cache-Control': 'public, max-age=604800',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  } catch {
    return fallbackResponse('fetch-failed');
  }
};
