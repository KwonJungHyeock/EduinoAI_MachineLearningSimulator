// author: eduino
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// 웹 플랫폼 어디에 올려도 되도록 상대 경로로 빌드. 외부 CDN 없이 전부 번들.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: { target: 'es2020', assetsInlineLimit: 0 }
});
