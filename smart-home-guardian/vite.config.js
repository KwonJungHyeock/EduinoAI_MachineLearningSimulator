import { defineConfig } from 'vite';

// SMART HOME GUARDIAN — Vite 6, Vercel 정적 배포(상대 경로).
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    chunkSizeWarningLimit: 1200, // three는 별도 청크
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three')) return 'three';
        },
      },
    },
  },
});
