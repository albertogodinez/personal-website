# 09 — Improve how link items read on the board

Status: ready-for-agent

`link` items show the source page's social preview image, which is often a
generic site logo. Next to real imagery these read as low-quality or broken
cards.

## Do

- Decide the treatment. Options, roughly in increasing cost: exclude logo-ish
  covers from the board; render link cards with a distinct treatment that makes
  the logo intentional (a framed card with the title); or select a better image
  from the item's `media[]` array where one exists.
- Prefer the `media[]` selection if the data supports it, since it keeps real
  imagery on the board rather than removing or restyling cards.
- Implement cover selection in `src/components/moodboard/data-adapter.ts`; any
  distinct rendering belongs in `src/components/moodboard/CardMesh.tsx`.

## Done when

- Link cards no longer read as broken beside image cards.
- Whatever heuristic is chosen is expressed as a testable function over item
  data, not inline in the mesh component.
