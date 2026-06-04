// Playino : Escape Room — 엔트리.
// 웹폰트 로드를 기다린 뒤 Phaser 게임을 부팅한다(타이틀 폰트 깨짐 방지).
import './styles/app.css';
import { startGame } from './game/config.js';

async function boot() {
  // Google Fonts 로드 보장(Orbitron/Space Grotesk)
  try {
    await Promise.race([
      Promise.all([
        document.fonts.load('700 64px Orbitron'),
        document.fonts.load('500 16px "Space Grotesk"'),
      ]),
      new Promise((r) => setTimeout(r, 2500)), // 폰트 지연 시 최대 2.5s 후 진행
    ]);
    await document.fonts.ready;
  } catch {
    /* 폰트 로드 실패해도 기본 폰트로 진행 */
  }
  startGame(document.getElementById('app'));
}

boot();
