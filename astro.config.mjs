import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://ilyayakub.github.io',
  markdown: {
    shikiConfig: { themes: { light: 'vitesse-light', dark: 'vitesse-dark' }, defaultColor: false },
  },
});
