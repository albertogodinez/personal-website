---
title: WebGL Texture CORS Blocked by External CDN Redirects
date: 2026-04-22
category: runtime-errors
module: moodboard-canvas
problem_type: runtime_error
component: frontend_stimulus
symptoms:
  - "WebGL texture loading failed with CORS policy errors when loading external images"
  - "Canvas rendered blank or showed missing textures despite images loading correctly in HTML img tags"
  - "Browser console showed: Access to image has been blocked by CORS policy"
root_cause: wrong_api
resolution_type: code_fix
severity: high
tags:
  - webgl
  - cors
  - react-three-fiber
  - texture-loading
  - netlify-edge-functions
  - image-proxy
related_components:
  - netlify-edge-functions
  - react-three-fiber
---

# WebGL Texture CORS Blocked by External CDN Redirects

## Problem

Images from Raindrop CDN URLs failed to load as WebGL textures in React Three Fiber due to missing CORS headers on redirect destinations (Instagram CDN, S3). The 3D moodboard canvas rendered blank despite the same image URLs working perfectly in standard HTML `<img>` tags.

## Symptoms

- CORS errors in browser console when R3F attempts to create textures from Raindrop image URLs
- Textures appear black or fail to render in the 3D canvas
- Images work correctly in standard HTML `<img>` tags but fail when used with `useTexture()` or Three.js texture loaders
- Error messages like "Cross-origin image load denied by CORS policy: No 'Access-Control-Allow-Origin' header is present"
- Canvas lights up correctly (proving R3F renders) but image planes show no texture

## What Didn't Work

- **Adding `crossOrigin="anonymous"` to texture loader** - Failed because the destination CDN servers (Instagram, S3) don't send CORS headers in response. The attribute only requests CORS, it doesn't force servers to comply.
- **Using Raindrop `rdl.ink/render/...` URLs directly** - These redirect to CDNs (Instagram, AWS S3) that don't include `Access-Control-Allow-Origin` headers. While `rdl.ink` itself has CORS headers, the redirect destinations don't.
- **Client-side fetch wrappers or workarounds** - Browser enforces CORS at the WebGL API level, not at the fetch level. No amount of JavaScript wrapping bypasses this security restriction.
- **Switching to `output: 'hybrid'` in Astro config** - Astro 6 removed hybrid mode. The correct approach is `output: 'static'` with `prerender: false` on specific endpoints.

## Solution

### 1. Create server-side proxy endpoint

Create `/src/pages/api/proxy-image.ts` that runs as a Netlify Edge Function:

```typescript
import type { APIRoute } from 'astro';

export const prerender = false; // Forces this endpoint to run server-side

export const GET: APIRoute = async ({ url }) => {
  const imageUrl = url.searchParams.get('url');
  
  if (!imageUrl) {
    return new Response('Missing url parameter', { status: 400 });
  }

  // Decode once - Raindrop URLs come pre-encoded from JSON
  const decodedUrl = decodeURIComponent(imageUrl);

  try {
    const response = await fetch(decodedUrl);

    if (!response.ok) {
      return new Response(`Failed to fetch image: ${response.status}`, { 
        status: response.status 
      });
    }

    const arrayBuffer = await response.arrayBuffer();
    
    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': response.headers.get('Content-Type') || 'image/jpeg',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    return new Response(`Proxy error: ${error}`, { status: 500 });
  }
};
```

### 2. Astro configuration

No special adapter flag is needed. `@astrojs/netlify` (v7) has no `edgeFunctions` option — routes with `prerender: false` are bundled into the Netlify Node SSR function automatically, which is what we want here since the route uses `sharp` (Node-only, can't run in Netlify's Deno-based edge runtime).

```javascript
import netlify from '@astrojs/netlify';
import { defineConfig } from 'astro/config';

export default defineConfig({
  output: 'static',
  adapter: netlify({
    cacheOnDemandPages: true,
  }),
  // ... rest of config
});
```

### 3. Mark moodboard page as prerendered

In `src/pages/moodboard.astro`, add:

```typescript
---
// ... imports
export const prerender = true; // Static page
---
```

### 4. Use proxy URLs in R3F components

```typescript
// In MoodboardCanvas.tsx or CardMesh.tsx:

// Instead of direct URLs:
// const texture = useTexture(item.mediaUrl);

// Use proxy (URLs are already encoded in JSON, so encode once more for query param):
const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(item.mediaUrl)}`;
const texture = useTexture(proxiedUrl);
```

## Why This Works

### Root Cause: Different Security Models

HTML `<img>` tags and WebGL texture loading have different security models:

**HTML img tags:**
- Can load cross-origin images without CORS headers
- Browser renders the image without exposing pixel data to JavaScript
- Use case: display-only, no programmatic access to pixel values

**WebGL textures:**
- WebGL can read individual pixel values via `readPixels()`, canvas operations, shader sampling
- This allows extracting image data that the user may not intend to share
- To prevent unauthorized data exfiltration, browsers require explicit CORS headers (`Access-Control-Allow-Origin`) when loading cross-origin images as textures
- Without CORS headers, browser blocks texture creation to prevent security vulnerabilities

When Raindrop URLs redirect to CDNs that don't send CORS headers, the browser blocks WebGL texture creation.

### Why the Proxy Works

1. **Server-side fetch bypasses CORS** - Same-origin policy doesn't apply to server-to-server requests. The Netlify SSR function can fetch from any origin.
2. **Same-origin serving** - The proxy endpoint serves images from the same origin as the application (`localhost:4321` in dev, your domain in prod).
3. **Explicit CORS permission** - By adding `Access-Control-Allow-Origin: *`, the proxy permits WebGL texture usage.
4. **Browser sees same-origin** - From the browser's perspective, images come from your domain, eliminating CORS restrictions.

### Netlify Runtime Context

- **Why not `edgeFunctions: true`?** - That option doesn't exist on `@astrojs/netlify` v7; routes with `prerender: false` are bundled into the Node SSR function automatically, with no adapter flag needed.
- **Why not `output: 'hybrid'`?** - Astro 6 removed hybrid mode; static output with selective SSR via `prerender: false` is the new pattern
- **Why Node SSR, not Edge?** - The route uses `sharp` for resizing, which requires Node-native bindings unavailable in Netlify's Deno-based edge runtime

## Prevention

### Understanding When CORS Matters

| Use Case | CORS Required? | Why |
|----------|---------------|-----|
| **Regular image display** (`<img>`, CSS backgrounds) | ❌ No | Display-only, no pixel access |
| **Canvas `drawImage()`** | ✅ Yes (to read pixels) | Need CORS to call `getImageData()` |
| **WebGL textures** | ✅ Always | WebGL can always read pixel data |
| **Video/audio with canvas** | ✅ Yes | Same pixel access concerns |

### Best Practices for WebGL/Three.js Projects

1. **Verify CORS early** - When building features with WebGL, Three.js, or R3F, test with production CDN URLs early in development, not just local assets
2. **Plan for proxy upfront** - If using user-generated or third-party image content, implement image proxying as a standard pattern from the start
3. **Document requirements** - Add comments to components: "Requires CORS-enabled URLs or proxy"
4. **Test redirect chains** - URLs like `rdl.ink/render/...` may redirect to non-CORS destinations. Test the final destination, not just the initial URL
5. **Cache aggressively** - Add long cache headers (`max-age=31536000`) to proxy responses to reduce origin requests

### Astro 6 + Netlify Pattern

```typescript
// For any Astro 6 project needing selective SSR:

// 1. Keep output: 'static' in astro.config.mjs
// 2. Enable edgeFunctions: true in adapter config
// 3. Mark pages as prerender: true (default for static)
// 4. Mark API routes as prerender: false (forces SSR)
```

### Alternative Long-term Solutions

- **Migrate to same-origin storage** - The content pipeline plan will eventually move images to Cloudflare R2, eliminating CORS issues entirely
- **Use Raindrop API file endpoint** - `https://api.raindrop.io/v2/raindrop/{id}/file` serves files directly, but requires authentication
- **CDN with CORS** - If hosting your own images, configure CDN (CloudFlare, Fastly) to send CORS headers

## Related Issues

- Decision record: `docs/adr/0001-same-origin-image-proxy-for-webgl-textures.md`
- Future migration: `.scratch/content-pipeline/spec.md` (owned storage eliminates the CORS concern)

## Related Commits

- `1ef5cd2` - R3F canvas foundation (April 22, 00:08)
- `5ba93df` - Image proxy endpoint for CORS workaround (April 22, 00:27)
- `afe4ae7` - Enable server-side proxy with Netlify edge functions (April 22, 12:14)
