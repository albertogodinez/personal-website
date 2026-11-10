# Personal Website

A personal site whose main feature is the moodboard: a 3D canvas that renders a saved media collection as a pannable, zoomable field of cards.

## Language

### Content

**Item**:
A single saved piece of content, sourced from Raindrop or Are.na, carrying its own title, date, tags and media URL.
_Avoid_: bookmark, entry, raindrop, post

**Content type**:
The kind of media an Item holds: `image`, `gif`, `video`, `link` or `markdown`.
_Avoid_: media type, kind, format

**Manifest**:
The checked-in JSON snapshot of all Items, stamped with the time it was last synced from upstream.
_Avoid_: collection, feed, dataset, database

**Media rot**:
The condition of an Item whose upstream media URL no longer resolves, usually an expired signed CDN URL or a deleted post.
_Avoid_: broken link, dead image, stale media

**Image proxy**:
The same-origin endpoint that refetches an Item's media server-side and downscales it, so WebGL can use it as a texture.
_Avoid_: CDN, image service, image API

### Canvas

**Card**:
The textured 3D plane that renders one Item in the canvas.
_Avoid_: tile, panel, thumbnail

**Chunk**:
One cell of the infinite canvas, addressed by integer coordinates, and the unit in which Card positions are generated and discarded.
_Avoid_: tile, cell, sector, region

**Layout mode**:
The arrangement the canvas is currently in: `infinite`, `clustered` or `timeline`.
_Avoid_: view, layout, arrangement

**Card layout**:
The computed transform — position, rotation, scale, size — for one Card within a Chunk.
_Avoid_: position, placement, transform

**Card registry**:
The ref-held map of live Cards that the canvas's single per-frame loop iterates in order to mutate them directly, bypassing React.
_Avoid_: store, cache, pool
