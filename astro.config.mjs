// @ts-check
// Force reload 2
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import icon from 'astro-icon';
import sitemap from '@astrojs/sitemap';
import node from '@astrojs/node';

// https://astro.build/config
export default defineConfig({
  site: 'https://logicandlines.com/',
  output: 'server',
  prefetch: true,
  adapter: node({
    mode: 'standalone'
  }),
  server: {
    allowedHosts: ['slimy-rooms-hammer.loca.lt']
  },
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [
    icon(),
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: {
          en: 'en',
          es: 'es'
        }
      }
    })
  ],
  // Add i18n routing
  i18n: {
    defaultLocale: 'es',
    locales: ['en', 'es'],
    routing: {
      prefixDefaultLocale: false
    }
  }
});