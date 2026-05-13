// @ts-check
import { defineConfig, passthroughImageService } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  adapter: vercel(),
  image: {
    service: passthroughImageService()
  },
  vite: {
    plugins: [tailwindcss()]
  }
});