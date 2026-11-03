import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'static',
  // verify-site's dev server runs without the toolbar: it lazy-loads on idle,
  // and Vite discovering it late full-reloads pages mid-screenshot.
  devToolbar: { enabled: process.env.VERIFY_SITE !== '1' },
  adapter: netlify({
    cacheOnDemandPages: true
  })
});
