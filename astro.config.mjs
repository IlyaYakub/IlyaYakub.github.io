import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ilyayakub.github.io',
  markdown: {
    shikiConfig: { theme: 'vitesse-dark' },
  },
});
