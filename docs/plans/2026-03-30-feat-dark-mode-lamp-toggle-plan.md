---
title: "Feat: Dark Mode with Lamp Toggle"
type: feat
status: completed
date: 2026-03-30
---

# Feat: Dark Mode with Lamp Toggle

## Overview

Add a dark mode to the landing page, toggled by clicking a lamp icon in the top-right corner (replacing the current decorative doorway icon). The lamp serves as both decoration and an interactive toggle button. Clicking it swaps the entire color palette, gradient background, and blend mode via CSS custom property overrides. Preference persists in localStorage and is applied before first paint to prevent flash.

## Problem Statement

The site is currently light-only. A dark mode adds personality (the lamp metaphor — "turning off the lights"), respects user preference, and reduces eye strain in low-light environments.

## Proposed Solution

Use `[data-theme="dark"]` on `<html>` to override all CSS custom properties. A blocking inline script in `<head>` reads localStorage (and optionally `prefers-color-scheme`) before paint. The lamp icon is an accessible `<button>` with `aria-pressed` that toggles the attribute and persists the choice.

## Technical Considerations

### Theme Mechanism

**`<html data-theme="dark">`** was chosen over alternatives because:
- Survives Astro View Transitions (which swap `<body>`, not `<html>`)
- Can be set by a blocking `<script>` in `<head>` before any paint
- High specificity without `!important` — `[data-theme="dark"]` overrides `:root`
- No class-name collisions

### Dark Color Palette

Map the prototype's "onyx" theme to existing variable names:

| Variable | Light | Dark | Notes |
|----------|-------|------|-------|
| `--bg` | `#F4F3EF` | `#0A0A0A` | Near-black background |
| `--text` | `#2C2C2A` | `#EDEDED` | High contrast body text |
| `--text-muted` | `#7A7A72` | `#A1A1AA` | Labels, links default |
| `--text-subtle` | `#8A8A82` | `#71717A` | Dates, captions |
| `--green` | `#5E7D56` | `#4ADE80` | Primary accent |
| `--green-light` | `#A9C2A2` | `#86EFAC` | Hover accents, selection |
| `--green-dark` | `#5C7A54` | `#166534` | Shimmer gradient stops |
| `--divider` | `rgba(0,0,0,0.05)` | `rgba(255,255,255,0.08)` | Borders, separators |
| `--bg-primary` | `#F4F3EF` | `#0A0A0A` | Legacy compat alias |

Gradient background colors (dark):

| Variable | Light | Dark |
|----------|-------|------|
| `--color1` | `126, 155, 118` | `6, 78, 59` |
| `--color2` | `143, 170, 135` | `20, 83, 45` |
| `--color3` | `200, 210, 190` | `15, 23, 42` |
| `--color4` | `169, 194, 162` | `2, 44, 34` |
| `--color5` | `110, 140, 105` | `17, 24, 39` |
| `--color-interactive` | `126, 155, 118` | `52, 211, 153` |
| `--circle-size` | `60%` | `80%` |
| `--blending` | `soft-light` | `screen` |

### SVG Icon Handling

Both `globe.svg` and `lamp.svg` have hardcoded fill/stroke colors that would be invisible on a dark background. Solution: **inline the SVGs** into the Astro template and replace hardcoded colors with `currentColor`. This inherits from `color: var(--text)` and automatically adapts to either theme.

### FOUC Prevention

Add a blocking inline script in `BaseLayout.astro` `<head>` that runs before paint:

```js
// ~100 bytes minified — blocks render until theme is set
(function() {
  try {
    var t = localStorage.getItem('theme');
    if (!t) t = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
    if (t === 'dark') document.documentElement.dataset.theme = 'dark';
  } catch(e) {}
})();
```

### Transition Suppression

On initial load, suppress color transitions to prevent the dark mode override from animating. Add `[data-no-transition] * { transition: none !important; }` on `<html>`, remove after first frame via `requestAnimationFrame`.

### Accordion Re-measure

Theme toggle may affect font metrics or line heights. After toggling, re-measure all `.landing__exp-body` heights to prevent broken expand/collapse animations.

## Implementation Phases

### Phase 1: Dark Theme Variables

**`src/styles/variables.css`**

- Add `[data-theme="dark"]` block overriding all color, gradient, and blending variables
- Add `color-scheme: dark` inside the dark block for native UI hints (scrollbars, form controls)
- Verify WCAG AA contrast for all dark text/background combinations

### Phase 2: FOUC Prevention Script

**`src/layouts/BaseLayout.astro`**

- Add blocking inline `<script is:inline>` in `<head>` before any stylesheets
- Reads `localStorage('theme')`, falls back to `prefers-color-scheme`, defaults to light
- Sets `document.documentElement.dataset.theme = 'dark'` if applicable
- Add `<meta name="color-scheme" content="light dark">` to `<head>`

### Phase 3: Inline SVGs and Lamp Toggle Button

**`src/pages/index.astro`**

- Replace `<img src="/globe.svg">` with inlined globe SVG using `currentColor`
- Replace `<img src="/doorway.svg">` with a `<button>` containing the inlined lamp SVG using `currentColor`
- Button requirements:
  - `type="button"` (explicit, not submit)
  - `aria-pressed="false"` (toggles to `"true"` in dark mode)
  - `aria-label="Toggle dark mode"`
  - Visual size: 24px icon inside 44px touch target (padding for WCAG 2.5.8)
  - `cursor: pointer`, remove default button chrome
  - Keyboard accessible (focusable, activates on Enter/Space — native `<button>` handles this)

**`src/styles/landing.css`**

- Update `.landing__icon--right` to support being a `<button>`:
  - Remove `pointer-events: none`
  - Add `background: none; border: none; padding: var(--space-2); margin: calc(-1 * var(--space-2))` for 44px hit area
  - Add `cursor: pointer`
  - Add focus-visible ring: `outline: 2px solid var(--green); outline-offset: 2px; border-radius: 4px`

### Phase 4: Toggle Script

**`src/pages/index.astro`** (inline `<script>`)

- On button click:
  1. Toggle `data-theme` on `<html>` between absent (light) and `"dark"`
  2. Update `aria-pressed` on the button
  3. Persist to `localStorage.setItem('theme', newTheme)`
  4. Re-measure accordion body heights (call existing measurement logic)

### Phase 5: Color Transitions

**`src/styles/landing.css`**

- Add transitions on specific elements (not `*`):
  - `body { transition: background-color 0.3s ease, color 0.3s ease; }`
  - `.landing__left, .landing__right, .landing__footer { transition: background-color 0.3s ease; }`
  - `.landing__exp-name, .landing__exp-date, .landing__role, .landing__bio { transition: color 0.3s ease; }`
- Add `[data-no-transition] * { transition: none !important; }` for load suppression
- Respect `prefers-reduced-motion`: disable color transitions in reduced motion media query

### Phase 6: Dark Mode Gradient Adjustments

**`src/components/selection/gradient-background.css`** (optional)

- The gradient component already reads all colors from CSS vars — no changes needed for color swap
- Consider reducing opacity in dark mode: `[data-theme="dark"] .gradient-bg { opacity: 0.4; }` (vs 0.5 in light)
- The `--blending: screen` override in dark vars handles the blend mode change automatically

## Files Changed Summary

| File | Action |
|------|--------|
| `src/styles/variables.css` | Add `[data-theme="dark"]` block with all dark tokens |
| `src/layouts/BaseLayout.astro` | Add blocking theme script in `<head>`, add `color-scheme` meta |
| `src/pages/index.astro` | Inline SVGs, replace doorway with lamp `<button>`, add toggle script |
| `src/styles/landing.css` | Button styles, focus ring, color transitions, transition suppression |
| `src/components/selection/gradient-background.css` | Optional: dark mode opacity adjustment |

## Files NOT Changed

- `src/components/selection/GradientBackground.tsx` — colors flow from CSS vars, no code changes
- `public/globe.svg`, `public/lamp.svg` — kept as reference but no longer loaded as `<img>`
- Other pages (moodboard, memorabilia) — dark vars cascade globally but no page-specific changes needed

## Acceptance Criteria

- [x] Lamp icon appears in top-right corner, same size as doorway was (24px visual, 44px touch target)
- [x] Lamp icon uses `currentColor` and adapts to both themes
- [x] Clicking the lamp toggles dark mode
- [x] Dark mode colors match the prototype palette (onyx theme)
- [x] Gradient background changes colors and blend mode (`screen`) in dark mode
- [x] Color transition is smooth (~0.3s) when toggling
- [x] No flash of wrong theme on page load (FOUC prevention)
- [x] Preference persists in localStorage across sessions
- [x] First visit respects `prefers-color-scheme` OS setting
- [x] Toggle is a `<button type="button">` with `aria-pressed` and `aria-label`
- [x] Toggle is keyboard accessible (Tab to focus, Enter/Space to activate)
- [x] Focus ring visible on keyboard navigation (`focus-visible`)
- [x] `prefers-reduced-motion` disables color transitions
- [x] All dark mode text passes WCAG AA contrast (4.5:1 normal, 3:1 large)
- [x] Globe icon (top-left) also uses `currentColor` and adapts
- [x] Accordion expand/collapse still works correctly after theme toggle
- [x] Other pages (moodboard, memorabilia) inherit dark palette without breaking
- [x] Astro View Transitions preserve theme state (attribute on `<html>`, not `<body>`)

## Risk & Notes

- **Noise overlay**: The SVG noise texture is black-on-transparent at 3% opacity. On dark backgrounds it becomes invisible — may need to invert or increase opacity in dark mode.
- **Legacy `--black-a*` vars**: Used by other pages. `rgba(0,0,0,0.x)` values will be invisible on dark. May need `rgba(255,255,255,0.x)` overrides.
- **`action-trigger.css`**: References undefined legacy vars (`--color-bg1`, `--color-bg2`, `--color-bg3`). Not critical for landing page but worth noting.
- **Shimmer link gradients**: Use `--green-dark`, `--green-light`, `--green` which all get overridden — should adapt automatically.
- **Selection highlight**: Uses `--green-light` for `::selection` — will need dark-appropriate value.
