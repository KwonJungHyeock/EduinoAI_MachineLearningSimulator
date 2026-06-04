import { defineConfig } from 'vite';

// 미니게임은 셸에서 동적 import 되는 독립 ES 모듈이다(지침서 §4·§8).
// 이 리포는 그 게임들을 단독 개발/테스트하기 위한 하니스 + 빌드 환경.
export default defineConfig({
  // 상대 경로 배포(정적 호스팅 어디든 안전)
  base: './',
  build: {
    target: 'es2020',
    // Phaser는 무거우므로 별도 청크로 분리(셸에서도 동적 import로 스플리팅됨).
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/phaser')) return 'phaser';
        },
      },
    },
  },
});
