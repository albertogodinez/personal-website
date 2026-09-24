# 04 — Remove the unreferenced placeholder card asset

Status: ready-for-agent

`public/placeholder-card.jpg` is not referenced anywhere. It became dead when
failed covers started skipping their mesh entirely rather than drawing a
placeholder — which is the behaviour we want.

## Do

- Confirm it is genuinely unreferenced (search source, styles and content JSON,
  not just component files).
- Delete it.

## Done when

- The asset is gone and the production build still succeeds.
- If the search turns up a reference, close this ticket as not-applicable and
  record where it is used instead of deleting.
