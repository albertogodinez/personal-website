# 19 — Migrate the detail overlay to a native `<dialog>`

Status: ready-for-agent

`src/components/moodboard/DetailOverlay.tsx` currently builds a modal by hand:
a `position: fixed` backdrop `div` with `role="presentation"` and a click
handler, an inner `div` carrying `role="dialog"` / `aria-modal` /
`aria-labelledby`, and a `useEffect` that adds a `keydown` listener to
`window` to handle Escape.

A native `<dialog>` opened with `showModal()` provides the focus trap, the
Escape handling, the inert backdrop, and the `dialog` role for free. This is
the only reason `jsx-a11y/prefer-tag-over-role` is suppressed in the codebase;
the suppression at `DetailOverlay.tsx` points here.

## Why it wasn't done as part of the lint work

It is a behaviour change, not a lint fix:

- `<dialog>` is imperative. The component currently returns `null` when no card
  is selected; it would need to always render the element and drive
  `showModal()` / `close()` from an effect on `selectedCardId`.
- The backdrop styling moves from `.detail-overlay` to `::backdrop`, which is a
  different cascade with no access to the page's custom properties in the same
  way.
- Native backdrop click does not light-dismiss; that behaviour has to be
  reimplemented against the dialog's own bounding box.

All three are visual/interaction changes, which means this needs pre-push steps
3 and 4 (prod-vs-dev browser comparison) rather than just a green `pnpm lint`.

## Do

- Render a `<dialog ref>` unconditionally; drive `showModal()`/`close()` from
  `selectedCardId`.
- Delete the `keydown`/Escape effect — `<dialog>` handles Escape natively. Keep
  `$selectedCard.set(null)` wired to the dialog's `close` event so the store
  stays in sync when Escape is used.
- Move `.detail-overlay`'s backdrop styling to `dialog::backdrop` in
  `src/styles/moodboard-canvas.css`.
- Reimplement light-dismiss on backdrop click.
- Remove the `oxlint-disable-next-line jsx-a11y/prefer-tag-over-role` comment
  and the now-redundant `role`/`aria-modal` attributes.

## Done when

- The overlay opens, traps focus, closes on Escape, closes on backdrop click,
  and closes via the × button.
- `pnpm lint` passes with no `prefer-tag-over-role` suppression anywhere.
- The overlay is visually unchanged against the current build, verified in a
  browser per pre-push steps 3 and 4.
