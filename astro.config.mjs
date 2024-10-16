import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  integrations: [react()],
  output: 'static',
  adapter: netlify(),
  vite: {
    build: {
      sourcemap: true
    }
  }
});
