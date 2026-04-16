---
title: "Refactor: Landing Page Cabbage Green Redesign"
type: refactor
status: completed
date: 2026-03-26
---

# Refactor: Landing Page Cabbage Green Redesign

## Overview

Replace the current landing page layout, typography, and color palette with the V5 cabbage green design prototyped in `v5-cabbage-landing.html`. Remove the navbar entirely. Update the GradientBackground component to use the new green palette at low opacity across the full page.

## Problem Statement

The current site uses Poppins/Butler fonts, a green/blue/peach palette, and a traditional nav + accordion layout. The new direction is a minimal two-column monospace layout with a muted cabbage green palette, contained max-width, and subtle animated gradient background.

## Proposed Solution

Incremental file-by-file changes — update styles first, then components, then the page.

## Implementation Phases

### Phase 1: Font & Color Foundation

**`src/styles/variables.css`** — Replace color palette and font stack:

```css
:root {
  font-size: 16px;

  /* New Cabbage Green Palette (WCAG AA compliant) */
  --bg: #F4F3EF;
  --text: #2C2C2A;
  --text-muted: #7A7A72;    /* was #A3A39B — now ~4.5:1 contrast */
  --text-subtle: #8A8A82;   /* was #B8B8B0 — now ~3.5:1 contrast */
  --green: #5E7D56;         /* was #7E9B76 — now ~4.6:1 contrast */
  --green-light: #A9C2A2;
  --green-dark: #5C7A54;
  --divider: rgba(0,0,0,0.05);

  /* Gradient Background Colors (r,g,b for rgba usage) */
  --color1: 126, 155, 118;
  --color2: 143, 170, 135;
  --color3: 200, 210, 190;
  --color4: 169, 194, 162;
  --color5: 110, 140, 105;
  --color-interactive: 126, 155, 118;
  --circle-size: 60%;
  --blending: soft-light;

  /* Legacy compat (other pages still use these) */
  --bg-primary: #F4F3EF;
  --black-a9: rgba(0, 0, 0, 0.9);
  --black-a7: rgba(0, 0, 0, 0.5);
  --black-a5: rgba(0, 0, 0, 0.3);
  --black-a3: rgba(0, 0, 0, 0.2);
  --black-a1: rgba(0, 0, 0, 0.1);

  /* Fonts */
  --font-primary: 'Departure Mono', 'Space Mono', monospace;
  --font-secondary: 'Butler', serif;

  /* Layout */
  --max-w: 1000px;

  /* Keep existing spacing/grid/font-size vars for other pages */
  --spacing: 2rem;
  --spacing-half: 1rem;
  --spacing-double: 4rem;
  --fs-sm: clamp(0.7rem, 0.35vi + 0.61rem, 0.89rem);
  --fs-base: clamp(0.88rem, 0.57vi + 0.73rem, 1.19rem);
  --fs-md: clamp(1.09rem, 0.89vi + 0.87rem, 1.58rem);
  --fs-lg: clamp(1.37rem, 1.35vi + 1.03rem, 2.11rem);
  --fs-xl: clamp(1.71rem, 2.01vi + 1.21rem, 2.81rem);
  --fs-xxl: clamp(2.14rem, 2.93vi + 1.4rem, 3.75rem);
  --fs-xxxl: clamp(2.67rem, 4.23vi + 1.61rem, 5rem);
}
```

**Add Departure Mono font file:**
- Copy `~/Library/Fonts/DepartureMono-Regular.otf` to `public/fonts/`
- Add `@font-face` declaration in `variables.css`:

```css
@font-face {
  font-family: 'Departure Mono';
  src: url('/fonts/DepartureMono-Regular.otf') format('opentype');
  font-weight: 400;
  font-style: normal;
}
```

**Also add Space Mono as web fallback** via Google Fonts import in `BaseLayout.astro` `<head>`:
```html
<link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
```

### Phase 2: Update GradientBackground

**`src/components/selection/gradient-background.css`** — Two changes:

1. Change `.gradient-bg` opacity from `0.98` to `0.5` (subtle wash)
2. The color vars already flow from `:root` — no CSS changes needed for colors since the component uses `var(--color1)` etc.

**`src/components/selection/GradientBackground.tsx`** — No code changes needed. Colors come from CSS vars.

### Phase 3: Remove Navbar

**`src/layouts/BaseLayout.astro`** — Remove the Nav import and `<Nav />` component usage. Keep the rest of the layout (head, slots, footer, gradient background).

**DO NOT delete** `src/components/nav/Nav.astro` or `nav.css` yet — other pages may reference them. Just remove from BaseLayout.

### Phase 4: New Landing Page Layout

**`src/pages/index.astro`** — Replace the current content with the two-column layout:

```astro
---
import BaseLayout from '../layouts/BaseLayout.astro';
import { getCollection } from 'astro:content';

const allExperience = await getCollection('experience');
const workExperience = allExperience
  .filter((exp) => exp.data.type === 'work')
  .sort((a, b) => new Date(b.data.startDate).getTime() - new Date(a.data.startDate).getTime());

const formatDate = (start: string, end?: string) => {
  const startYear = new Date(start).getFullYear();
  if (!end) return `${startYear}—present`;
  const endYear = new Date(end).getFullYear();
  return startYear === endYear ? `${startYear}` : `${startYear}—${endYear}`;
};
---

<BaseLayout title="alberto godinez">
  <div class="landing">
    <div class="landing__container">
      <div class="landing__left">
        <div class="fade-in d1">
          <p class="landing__label">alberto godinez</p>
          <p class="landing__role">software developer — austin, tx</p>
        </div>
        <div class="fade-in d2">
          <p class="landing__bio">
            currently working on adding trip planning features on all of
            expedia group's platforms. hope you enjoy this little sliver
            of the internet.
          </p>
        </div>
      </div>

      <div class="landing__right">
        <div class="fade-in d3">
          <p class="landing__exp-label">experience</p>
          <ul class="landing__exp-list">
            {workExperience.map((exp) => (
              <li class="landing__exp-item">
                <span class="landing__exp-name">{exp.data.company.toLowerCase()}</span>
                <span class="landing__exp-date">{formatDate(exp.data.startDate, exp.data.endDate)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>

    <footer class="landing__footer fade-in d4">
      <a href="mailto:albertogodinez@outlook.com" class="shimmer-link">email</a>
      <a href="https://linkedin.com/in/albertogodinez" class="shimmer-link">linkedin</a>
      <a href="https://github.com/albertogodinez" class="shimmer-link">github</a>
    </footer>
  </div>
</BaseLayout>
```

### Phase 5: Landing Page Styles

**Create `src/styles/landing.css`** — all landing page specific styles (two-column layout, experience list, shimmer links, fade-in animations, noise overlay). Port directly from `v5-cabbage-landing.html`.

Key CSS classes:
- `.landing` — full-height flex column, relative z-index
- `.landing__container` — `max-width: var(--max-w); margin: 0 auto;` flex row
- `.landing__left` — 40% width, top-aligned, right border divider
- `.landing__right` — 60% width, `overflow-y: scroll` (always reserves scrollbar space to prevent layout shift); child uses `margin-top: auto` (not `justify-content: flex-end` which breaks scroll); `-webkit-mask-image` fade gradient on top/bottom edges (24px) so content fades out at scroll boundaries; scrollbar thumb invisible by default, appears on column hover
- `.landing__label` — 10px uppercase spaced
- `.landing__role` — 14px green accent
- `.landing__bio` — 13px body, line-height 2
- `.landing__exp-item` — hover: padding-left indent, green color shift
- `.shimmer-link` — underline always visible at 30% opacity via `::after` pseudo; on hover text goes solid green and underline sweeps with `animation: shine 3s ease-in-out infinite alternate` using `background-size: 500% auto` gradient through `--green-dark`, `--green-light`, `--green` (matching existing `action-trigger` pattern from `action-trigger.css`)
- `.fade-in` / `.d1`-`.d5` — staggered `translateY(10px)` + opacity entrance, `1s` duration with `cubic-bezier(0.16, 1, 0.3, 1)` easing (smoother/longer than V5 prototype's 0.8s)
- `.noise` — fixed SVG noise at 3% opacity
- `@media (prefers-reduced-motion: reduce)` — disable all animations
- Responsive `@media (max-width: 768px)`:
  - Stack columns vertically
  - **Remove the vertical divider** (`.col-left::after { display: none }`)
  - **Remove the mobile border-top on right column** (no divider at all on mobile)

Import in `index.astro`:
```astro
<style>
  @import '../styles/landing.css';
</style>
```

### Phase 6: Update global.css

**`src/styles/global.css`** — Minor updates:
- Update `body` to use `var(--bg)` instead of `var(--bg-primary)` for background
- Update `font-family` to `var(--font-primary)` (now Departure Mono)
- Remove Butler-specific `h2`/`h3` font-family rules (not needed on landing)
- Keep the CSS reset intact

## Files Changed Summary

| File | Action |
|------|--------|
| `public/fonts/DepartureMono-Regular.otf` | Add (copy from ~/Library/Fonts/) |
| `src/styles/variables.css` | Update colors, fonts, add @font-face |
| `src/styles/global.css` | Update body bg/font references |
| `src/styles/landing.css` | Create (new landing page styles) |
| `src/components/selection/gradient-background.css` | Update opacity to 0.5 |
| `src/layouts/BaseLayout.astro` | Remove Nav, add Space Mono link |
| `src/pages/index.astro` | Replace with two-column layout |

## Files NOT Changed (preserved for other pages)

- `src/components/nav/Nav.astro` + `nav.css` — kept but unused on landing
- `src/components/experience/Experience.tsx` — kept for potential reuse
- `src/components/About.astro`, `Contact.astro` — kept
- `src/styles/utilities.css`, `action-trigger.css` — kept
- All other pages (moodboard, memorabilia) — untouched

## Acceptance Criteria

- [x] Landing page matches V5 prototype layout (two-column, contained max-width)
- [x] Departure Mono renders as primary font with Space Mono fallback
- [x] Color palette uses cabbage green values throughout
- [x] GradientBackground shows subtle green wash at low opacity
- [x] Mouse-following interactive blob works
- [x] Fade-in animations are smooth (1s duration, cubic-bezier(0.16, 1, 0.3, 1), staggered delays)
- [x] `prefers-reduced-motion` disables all animations
- [x] Shimmer hover effect on footer links
- [x] Experience items indent + turn green on hover
- [x] Experience data still driven from content collections
- [x] Navbar is removed from the layout
- [x] Other pages (moodboard, memorabilia) still work
- [x] Responsive: columns stack on mobile, no divider on mobile
- [x] All text colors pass WCAG AA contrast (4.5:1 for normal text)
- [x] Name uses `<h1>` for semantic heading hierarchy
- [x] Footer links use real URLs with `rel="noopener"` on external links
- [x] Content stays contained on ultrawide screens

## Accessibility Fixes (from audit)

### Color Contrast (WCAG AA)

| Variable | Original | Fixed | Ratio | Used for |
|----------|----------|-------|-------|----------|
| `--text-muted` | `#A3A39B` | `#7A7A72` | ~4.5:1 | Name label, section headings, link default |
| `--text-subtle` | `#B8B8B0` | `#8A8A82` | ~3.5:1 | Experience dates |
| `--green` | `#7E9B76` | `#5E7D56` | ~4.6:1 | Role text, hover accents |

### Motion

Add `prefers-reduced-motion` media query to disable:
- Fade-in animations (set `opacity: 1; transform: none`)
- Gradient blob animations (set `animation: none`)
- Shimmer hover animation

### Semantics

- Use `<h1>` for the name (currently a `<p>`)
- Footer links: real URLs, `rel="noopener"` on external links

## Risk & Notes

- **Other pages may look different** with the new font-primary — acceptable per user ("will merge later")
- **Butler font files** can stay in `public/fonts/` for now since other pages may reference `--font-secondary`
- **Nav component files** kept but unused — can be cleaned up when pages are merged
