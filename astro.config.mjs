import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import keystatic from '@keystatic/astro';
import vercel from '@astrojs/vercel';

// Your live site URL. Used for SEO canonical tags, the sitemap, and the RSS feed.
// Change this to your real domain once you own it.
export default defineConfig({
  site: 'https://nhungluong.info',
  output: 'static',
  adapter: vercel(),
  integrations: [mdx(), react(), keystatic(), sitemap()],
  markdown: {
    shikiConfig: {
      theme: 'github-dark-dimmed',
      wrap: false,
    },
  },
});
