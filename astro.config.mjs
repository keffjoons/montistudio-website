// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://montistudio.co.uk',
  devToolbar: { enabled: false },
  vite: {
    plugins: [tailwindcss()]
  },
  fonts: [{
    provider: fontProviders.google(),
    name: 'Cormorant Garamond',
    weights: [400, 600],
    cssVariable: '--font-cormorant',
    fallbacks: ['Georgia', 'serif'],
  }, {
    provider: fontProviders.google(),
    name: 'Poiret One',
    cssVariable: '--font-display',
    fallbacks: ['Helvetica Neue', 'sans-serif'],
  }],
});
