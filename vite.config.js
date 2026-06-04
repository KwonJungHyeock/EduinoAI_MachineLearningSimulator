import { defineConfig } from 'vite';

// Playino : Escape Room — Phaser 3 게임 앱(전면 리빌드).
// Vercel 정적 호스팅 배포.
export default defineConfig({
  // 상대 경로 배포(정적 호스팅 어디든 안전)
  base: './',
  build: {
    target: 'es2020',
    // Phaser는 코어 엔진이라 별도 벤더 청크로 분리(브라우저 캐시 효율).
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
        },
      },
    },
  },
});
