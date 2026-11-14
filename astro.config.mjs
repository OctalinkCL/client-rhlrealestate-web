// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import vercel from '@astrojs/vercel';

export default defineConfig({
  output: 'server',
  // En producción las imágenes se optimizan con Vercel Image Optimization
  // (WebP/AVIF + redimensionado); en desarrollo se usa sharp.
  adapter: vercel({ imageService: true }),
  image: {
    // Las fotos de EasyBroker llegan como PNG de ~2 MB: hay que autorizar
    // el dominio para poder optimizarlas.
    domains: ['assets.easybroker.com']
  },
  vite: {
    plugins: [tailwindcss()]
  }
});
