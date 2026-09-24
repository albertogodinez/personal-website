# 08 — Fold the gif cluster into video

Status: ready-for-agent

The `gif` content type holds 2 items, so clustered mode shows one tiny outlier
group beside clusters of dozens. Visually it reads as a mistake.

## Do

- Decide whether `gif` folds into `video` for clustering purposes only, or for
  filtering too. Prefer clustering-only if the filter bar's `gif` option is
  still worth offering — the two concerns are separable.
- Implement in `src/components/moodboard/layouts/clustered.ts` (cluster
  assignment) and/or `src/components/moodboard/data-adapter.ts` (content-type
  derivation), depending on that decision.
- Record the decision in the ticket comments; if it changes what content types
  mean repo-wide, it belongs in `CONTEXT.md` rather than only here.

## Done when

- Clustered mode has no two-item outlier group.
- The filter bar still behaves sensibly for whatever `gif` now means.
- Cluster assignment is covered by a test.
