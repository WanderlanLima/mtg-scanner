import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

import { cloudflare } from "@cloudflare/vite-plugin";

// https://vitejs.dev/config/
export default defineConfig({
  // A linha 'base' foi deletada propositalmente para o Cloudflare Pages servir da Raiz
  plugins: [react(), tailwindcss(), cloudflare()],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers']
  }
});