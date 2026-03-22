import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  // A linha 'base' foi deletada propositalmente para o Cloudflare Pages servir da Raiz
  plugins: [
    react(),
    tailwindcss(),
  ],
  worker: {
    format: 'es'
  },
  optimizeDeps: {
    exclude: ['@xenova/transformers']
  }
});
