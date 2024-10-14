import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'static',
  adapter: netlify(),
  build: {
    inlineStylesheets: 'auto'
  },
  vite: {
    build: {
      sourcemap: true
    }
  }
});
