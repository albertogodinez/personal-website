# 03 — Serve full-resolution images to the detail overlay

Status: ready-for-agent

`src/pages/api/proxy-image.ts` resizes every image to 512px wide. That cap is
correct for canvas textures — it was the load-bearing fix for the p99 texture
decode tail — but `src/components/moodboard/DetailOverlay.tsx` reuses the same
proxied URL, so opening a card shows a soft, upscaled image.

## Do

- Add an opt-out to the proxy so a caller can request an uncapped variant
  (e.g. a query parameter), keeping 512px as the default so canvas behaviour
  is unchanged by omission.
- Request the uncapped variant from `DetailOverlay` only.
- Keep the existing transparent-pixel fallback and `X-Proxy-Fallback` header
  behaviour on both paths.
- Keep the `sharp` failure fallback (animated GIFs and SVGs fall through to the
  original buffer) intact for both variants.

## Done when

- The overlay shows a full-resolution image; the canvas still receives 512px.
- Omitting the new parameter yields exactly today's behaviour.
- Proxy behaviour is covered by tests for both variants, the fallback pixel,
  and the resize-skip path.
