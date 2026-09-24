---
date: 2026-04-19
topic: moodboard-canvas
---

# Moodboard Canvas Page

## Problem Frame

The current moodboard page is a flat masonry grid that statically renders images from a Raindrop.io JSON dump. It lacks interactivity, spatial richness, and the ability to display diverse content types (video, markdown, mixed media). The goal is to replace it with an immersive canvas experience that supports three distinct layout modes — including a 3D fly-through — and handles images, videos (YouTube embeds, GIFs), and markdown content.

## Requirements

**Rendering & Scene**

- R1. The moodboard's 3D scene renders inside a single React Three Fiber canvas, mounted as an Astro `client:only="react"` island. UI chrome (mode switcher, filter bar, zoom indicator) are sibling DOM elements styled from the Astro layout, not rendered inside the canvas.
- R2. drei is used for camera controls, `<Html>` overlays (markdown cards, video embeds), and scene utilities.
- R3. Cards are the primary scene objects. Each card displays an image, video, or rendered markdown depending on its content type.

**Layout Modes**

- R4. Three layout modes with user-facing labels: **Infinite** (3D fly-through), **Clustered** (2D grouping), **Timeline** (2D chronological). These names are displayed in the mode switcher UI.
- R5. **Infinite mode** uses a perspective camera. Cards float at varying Z-depths in 3D space. The user moves the camera *through* the space. Parallax between depth layers.
- R6. **Clustered mode** uses an orthographic camera. Cards group by category/tag on a flat plane with connecting lines between related items. Supports filtering to focus on a single cluster.
- R7. **Timeline mode** uses an orthographic camera. Cards arrange chronologically along a horizontal spine with alternating vertical offset.
- R8. Switching modes animates the camera (perspective ↔ orthographic) and card positions with smooth transitions (spring or eased).

**Navigation & Interaction**

- R9. Pan (drag), zoom (scroll/pinch), and inertia-based momentum across all modes.
- R10. Clicking a card opens a detail overlay showing full media, title, date, category, description, and tags.
- R11. Filter bar allows filtering by category/tag. Filtered-out cards fade and shrink; filtered-in cards highlight.

**Content Types**

- R13. Image cards render the image as a texture on a plane (or via `<Html>` for complex cases).
- R14. Video cards support YouTube embeds and GIFs. Default state shows a static thumbnail. Hovering activates a lite-youtube-embed preview overlay. Clicking opens the detail overlay with full playback.
- R15. Markdown cards render `.md` content inside a drei `<Html>` overlay within the scene.

**Data Contract**

- R16. A shared TypeScript interface defines the shape of a moodboard item (id, title, description, date, category, tags, content type, media URL, source metadata). This interface is the contract between the moodboard page and whatever data source backs it.
- R17. The moodboard page reads from this interface and is agnostic to whether the backing source is a local JSON file, an API, or Cloudflare R2.
- R18. Initial development uses the existing Raindrop JSON (`src/content/moodboard/raindrop-collection.json`) or static mock data behind the shared interface.

**UI Chrome**

- R19. Glass-morphism UI controls (mode switcher, filter bar) overlaid on the canvas: frosted glass background (`backdrop-filter: blur`), subtle borders, pill-shaped buttons with the accent color for active states.
- R20. Globe SVG icon in the top-left corner as visual branding.
- R21. Hint text for navigation (drag to pan, scroll to zoom, click to inspect).
- R22. FPS/performance debug overlay toggled via keyboard shortcut for development and performance monitoring.

## Success Criteria

- All three layout modes render and transition smoothly between each other.
- The infinite mode delivers a distinct 3D fly-through feel with visible parallax and depth.
- Images, videos, and markdown cards all render correctly within the scene.
- Performance is acceptable with the expected content volume (low hundreds of items).
- The page works against any data source that implements the shared TypeScript interface.

## Scope Boundaries

- No content management or editing UI — this is a read-only display page.
- No search functionality — filtering by category/tag only.
- No server-side rendering of the R3F canvas — `client:only` is expected.
- The content pipeline and data migration are separate workstreams.

## Key Decisions

- **All-in-R3F over hybrid DOM/WebGL:** Avoids hard-cut transitions between modes. Text is minimal enough that drei's `<Html>` handles the occasional markdown card without issues.
- **R3F over vanilla Three.js:** Declarative scene management makes mode transitions and state management significantly simpler. React is already in the stack, so no new framework cost.
- **Shared TypeScript interface:** Decouples the page from any specific data source, allowing parallel development with the content pipeline.
- **"Scatter" renamed to "Infinite":** Better communicates the 3D fly-through experience.

## Dependencies / Assumptions

- New dependencies: `@react-three/fiber`, `@react-three/drei`, `@react-spring/three` for in-scene animations, `lite-youtube-embed` for performant YouTube previews.
- UI chrome animations use CSS transitions — no additional animation library needed for DOM elements.
- CSS for the R3F component must be imported from the Astro layout, not from inside the `client:only` component (per CLAUDE.md).
- Assumes content volume stays in the low hundreds. Chunk-based virtualization is not needed at this scale but could be added later.
- Mobile performance is a first-class requirement — touch controls, responsive layouts, and 60fps target on mobile devices.

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Needs research] What camera control scheme works best for the fly-through? (OrbitControls, custom rig, bounded drag with spring damping)
- [Affects R8][Needs research] Best approach for animating between perspective and orthographic cameras in R3F (camera swap vs. single camera with FOV interpolation).
- [Affects R14][Technical] How should YouTube embeds behave in WebGL? (drei `<Html>` iframe vs. video texture vs. thumbnail-only with external link)
- [Affects R13][Technical] Card rendering strategy: textured planes for images vs. `<Html>` for everything. Performance tradeoffs at scale.

## Next Steps

-> `/ce:plan` for structured implementation planning
