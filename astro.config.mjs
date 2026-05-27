import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { siteConfig } from './site.config.mjs';

export default defineConfig({
  site: siteConfig.url,
  integrations: [
    mdx(),
  ],
  markdown: {
    shikiConfig: {
      theme: 'github-light',
      wrap: true,
    },
  },
  build: {
    inlineStylesheets: 'auto',
  },
});
