# Feature Map

Every visitor-facing feature: what it does and how a visitor reaches it. Routes come from `src/pages`; `pnpm verify:site routes` lists them.

All pages render inside `src/layouts/BaseLayout.astro`, which mounts `GradientBackground` (`client:only`) and the footer (unless `hideFooter`), and sets the theme from `localStorage.theme`, falling back to `prefers-color-scheme`. `--theme` in `verify-site` drives the fallback.

| Route          | Page                          | Features and how to reach them                                                                                                                                                                                                                                         |
| -------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/`            | `src/pages/index.astro`       | Landing. Sticky navbar with the dark-mode toggle (lamp icon, top right; persists to `localStorage.theme`). Experience list from the `experience` collection: click a row header to expand it. Footer links: email, LinkedIn, GitHub. Fades in on load. No site footer. |
| `/404`         | `src/pages/404.astro`         | Not-found page, also served for any unknown URL. Heading plus an autoplaying looped video (`/videos/ocean.mp4`).                                                                                                                                                       |
| `/memorabilia` | `src/pages/memorabilia.astro` | Favorites browser: `SelectionHandler` picks a category, `FavoritesCollectionHandler` shows the `favorites` collection. Slated for deletion in favour of `/moodboard`.                                                                                                  |
| `/moodboard`   | `src/pages/moodboard.astro`   | Aesthetic moodboard of the Raindrop collection, rendered by `RaindropWrapper.astro`. Prerendering fetches the Raindrop API, so building needs `RAINDROP_*` in `.env`.                                                                                                  |
