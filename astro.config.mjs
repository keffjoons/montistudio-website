// @ts-check
import { defineConfig, fontProviders } from 'astro/config';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  site: 'https://montistudio.co.uk',
  vite: {
    plugins: [tailwindcss()]
  },
  fonts: [{
    provider: fontProviders.google(),
    name: 'Cormorant Garamond',
    cssVariable: '--font-cormorant',
    fallbacks: ['Georgia', 'serif'],
  }],
});
