// Playino : Escape Room — 엔트리.
// 웹폰트 로드를 기다린 뒤 Phaser 게임을 부팅한다(타이틀 폰트 깨짐 방지).
import './styles/app.css';
import { startGame } from './game/config.js';

// ── 전역 에러 표시(검은 화면 디버깅용) ────────────────────────
// 어떤 런타임 에러든 화면에 빨갛게 띄워, 개발자도구 없이도 원인 확인.
function showError(label, detail) {
  let box = document.getElementById('fatal');
  if (!box) {
    box = document.createElement('div');
    box.id = 'fatal';
    box.style.cssText =
      'position:fixed;inset:0;z-index:9999;padding:24px;overflow:auto;' +
      'background:rgba(8,4,6,0.96);color:#ff7a66;font:13px ui-monospace,monospace;white-space:pre-wrap;';
    document.body.appendChild(box);
  }
  box.textContent += `\n● ${label}\n${detail}\n`;
}
window.addEventListener('error', (e) =>
  showError('ERROR: ' + (e.message || ''), (e.error && e.error.stack) || e.filename || ''),
);
window.addEventListener('unhandledrejection', (e) =>
  showError('PROMISE REJECTION', (e.reason && (e.reason.stack || e.reason.message)) || String(e.reason)),
);

async function boot() {
  // Google Fonts 로드 보장(Orbitron/Space Grotesk). 실패/지연해도 진행.
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 64px Orbitron'),
        document.fonts.load('500 16px "Space Grotesk"'),
        // Pretendard(한글) — Phaser 캔버스는 1회 렌더라 부팅 전 로드 필수
        document.fonts.load('400 16px Pretendard'),
        document.fonts.load('700 32px Pretendard'),
        document.fonts.load('900 32px Pretendard'),
      ]).catch(() => {}),
      new Promise((r) => setTimeout(r, 2500)),
    ]);
  } catch {
    /* 무시하고 기본 폰트로 진행 */
  }
  try {
    startGame(document.getElementById('app'));
  } catch (err) {
    showError('GAME BOOT FAILED', (err && err.stack) || String(err));
  }
}

boot();
