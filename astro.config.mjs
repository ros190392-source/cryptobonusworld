import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://cryptobonusworld.com',
  output: 'static',
  build: {
    format: 'directory',
  },
});
