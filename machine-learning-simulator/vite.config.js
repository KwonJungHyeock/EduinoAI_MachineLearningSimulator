import { defineConfig } from 'vite';

// EduinoAI ML Simulator — Vite 6, Vercel 정적 배포.
// 해시 라우팅이라 서버 rewrite 불필요. base './' 로 어떤 경로에서도 동작.
export default defineConfig({
  base: './',
  build: { target: 'es2020' },
});
