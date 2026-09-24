# 18 — Markdown cards

Status: ready-for-agent

Blocked on the content-pipeline workstream at `.scratch/content-pipeline/`,
not on any ticket in this directory.

Original build Unit 4, requirement R15. Video cards are done (in-scene play
badge plus autoplaying `youtube-nocookie` playback in the detail overlay).
Markdown cards remain unbuilt and have no backing data — nothing in the
Raindrop collection is markdown today.

Gated on data, not effort: building against no data risks designing for the
wrong content shape.

## Do

- Once the content pipeline produces markdown items, render them as cards:
  decide whether the card face shows rendered markdown as a texture or a
  styled title treatment, and what the detail overlay shows.
- Add `markdown` to content-type derivation in
  `src/components/moodboard/data-adapter.ts`, to the filter bar, and to cluster
  assignment in `src/components/moodboard/layouts/clustered.ts`.
- Check the cluster size before adding a cluster for it — see ticket 08, which
  exists because a two-item cluster reads as a mistake.

## Done when

- Markdown items render as cards in all three layout modes.
- They are filterable, and their cluster (if any) is large enough to not read
  as an outlier.
- Content-type derivation for markdown is covered by a test.
