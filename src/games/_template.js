// ┌─────────────────────────────────────────────────────────────────┐
// │ 미니게임 모듈 템플릿 — 새 방을 만들 때 이 파일을 복사해 시작한다.   │
// │ 계약(지침서 §4): export function mountGame(root, ctx) → { destroy } │
// └─────────────────────────────────────────────────────────────────┘
//
// 규칙 요약:
//  - 성공 판정은 게임이 한다. 성공 시 ctx.onComplete()를 "정확히 1회" 호출.
//  - 보드 미연결(ctx.board.connected === false)이어도 끝까지 클리어 가능해야 함.
//  - root 밖 DOM을 만들지 않는다. destroy()에서 rAF/타이머/리스너/Phaser 인스턴스 전부 해제.
//  - Phaser는 모듈 내부에서 동적 import → 셸 초기 번들 보호(코드 스플리팅).
import { COLORS, FONT } from '../shared/theme.js';

export function mountGame(root, ctx) {
  let game = null;
  let destroyed = false;

  // Phaser를 동적 import: 이 게임 청크를 열 때만 엔진 로드
  const ready = import('phaser').then(({ default: Phaser }) => {
    if (destroyed) return;

    class TemplateScene extends Phaser.Scene {
      create() {
        const { width, height } = this.scale;
        this.cameras.main.setBackgroundColor(COLORS.bgCss);

        this.add
          .text(width / 2, height / 2 - 30, `${ctx.mission.icon} ${ctx.mission.name}`, {
            fontFamily: FONT.display,
            fontSize: '28px',
            color: '#e6edf7',
          })
          .setOrigin(0.5);

        const btn = this.add
          .text(width / 2, height / 2 + 30, '[ 탈출 (데모 클리어) ]', {
            fontFamily: FONT.body,
            fontSize: '20px',
            color: '#3ddc91',
          })
          .setOrigin(0.5)
          .setInteractive({ useHandCursor: true });

        btn.on('pointerup', () => ctx.onComplete?.({ via: 'template' }));
        this.input.keyboard?.on('keydown-ENTER', () => ctx.onComplete?.({ via: 'template' }));

        ctx.say?.(`${ctx.mission.escape}: 데모 방입니다. 버튼/Enter로 클리어.`);
      }
    }

    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: root,
      backgroundColor: COLORS.bgCss,
      scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH },
      scene: [TemplateScene],
    });
  });

  return {
    destroy() {
      destroyed = true;
      ready.finally(() => {
        game?.destroy(true);
        game = null;
      });
    },
  };
}
