// 부저 — "경보 해제" (CH2). 멜로디 시퀀스(사이먼 says) 재현.
// 학습 개념: tone/주파수. 핀: [8] (실물 부저, best-effort).
//
// 계약(지침서 §4): mountGame(root, ctx) → { destroy() }
//  - 오프라인(board 미연결)에서도 끝까지 클리어 가능.
//  - 클리어 시 ctx.onComplete() 정확히 1회(가드 포함).
//  - destroy()에서 Phaser/AudioContext/타이머 전부 해제.
import { COLORS, CSS, FONT } from '../shared/theme.js';

const BASE_W = 960;
const BASE_H = 600;

// 4개 패드: [밝은 색(점등), 어두운 색(평소), 주파수(Hz), 키]
const PADS = [
  { lit: 0xff5a3c, dim: 0x5a1f17, hz: 261.63, key: '1' }, // C4  레드
  { lit: 0xffb020, dim: 0x5a3f10, hz: 329.63, key: '2' }, // E4  앰버
  { lit: 0x3ddc91, dim: 0x144a33, hz: 392.0, key: '3' }, // G4  그린
  { lit: 0x6fb7ff, dim: 0x163450, hz: 523.25, key: '4' }, // C5  블루
];

export function mountGame(root, ctx) {
  let game = null;
  let destroyed = false;
  let audio = null; // AudioContext (사용자 제스처에서 생성)
  let muted = false;
  const timers = new Set();

  const m = ctx.mission || {};
  const learning = m.learning || {};
  const targetRounds = learning.targetRounds ?? 4;
  const startLen = learning.startLen ?? 2;
  const buzzerPin = (m.pins && m.pins[0]) ?? 8;

  const later = (fn, ms) => {
    const id = setTimeout(() => {
      timers.delete(id);
      if (!destroyed) fn();
    }, ms);
    timers.add(id);
    return id;
  };

  function ensureAudio() {
    if (muted) return null;
    if (!audio) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audio = new AC();
    }
    if (audio?.state === 'suspended') audio.resume();
    return audio;
  }

  function tone(hz, dur = 0.32) {
    const ac = ensureAudio();
    if (!ac) return;
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = 'triangle';
    osc.frequency.value = hz;
    const t = ac.currentTime;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.18, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  const ready = import('phaser').then(({ default: Phaser }) => {
    if (destroyed) return;

    class BuzzerScene extends Phaser.Scene {
      create() {
        this.cameras.main.setBackgroundColor(CSS.bg);
        this.sequence = [];
        this.inputIdx = 0;
        this.successes = 0;
        this.locked = true; // 시퀀스 재생 중엔 입력 잠금

        // 헤더(학습 라벨 메인 + 탈출 서사 서브)
        this.add
          .text(BASE_W / 2, 56, `${m.icon || '🔊'}  ${m.name || '부저'}`, {
            fontFamily: FONT.display,
            fontSize: '34px',
            color: CSS.text,
          })
          .setOrigin(0.5);
        this.add
          .text(BASE_W / 2, 92, `경보 해제 — 울리는 경보를 멈춰라 · ${m.concept || 'tone/주파수'}`, {
            fontFamily: FONT.body,
            fontSize: '16px',
            color: CSS.muted,
          })
          .setOrigin(0.5);

        // 비상등(경보) — 미해결 동안 깜빡임
        this.alarm = this.add.circle(BASE_W / 2, 150, 9, COLORS.red).setAlpha(0.9);
        this.alarmTween = this.tweens.add({
          targets: this.alarm,
          alpha: 0.15,
          duration: 520,
          yoyo: true,
          repeat: -1,
        });

        // 패드 2x2
        this.pads = [];
        const cx = BASE_W / 2;
        const cy = 360;
        const gap = 18;
        const size = 170;
        const offs = [
          [-1, -1],
          [1, -1],
          [-1, 1],
          [1, 1],
        ];
        PADS.forEach((spec, i) => {
          const px = cx + offs[i][0] * (size / 2 + gap / 2);
          const py = cy + offs[i][1] * (size / 2 + gap / 2);
          const rect = this.add
            .rectangle(px, py, size, size, spec.dim)
            .setStrokeStyle(2, COLORS.dim)
            .setInteractive({ useHandCursor: true });
          this.add
            .text(px, py + size / 2 - 22, spec.key, {
              fontFamily: FONT.display,
              fontSize: '18px',
              color: '#cdd6e6',
            })
            .setOrigin(0.5)
            .setAlpha(0.5);
          rect.on('pointerdown', () => this.activate(i, true));
          this.pads.push({ rect, spec });
        });

        // 진행 표시
        this.roundText = this.add
          .text(BASE_W / 2, 500, '', {
            fontFamily: FONT.body,
            fontSize: '16px',
            color: CSS.muted,
          })
          .setOrigin(0.5);

        // 음소거 토글
        this.muteBtn = this.add
          .text(BASE_W - 24, 24, '🔊 소리', {
            fontFamily: FONT.body,
            fontSize: '15px',
            color: CSS.muted,
          })
          .setOrigin(1, 0)
          .setInteractive({ useHandCursor: true });
        this.muteBtn.on('pointerup', () => {
          muted = !muted;
          this.muteBtn.setText(muted ? '🔇 음소거' : '🔊 소리');
        });

        // 키보드 1~4
        this.input.keyboard?.on('keydown', (e) => {
          const idx = PADS.findIndex((p) => p.key === e.key);
          if (idx >= 0) this.activate(idx, true);
        });

        ctx.say?.('경보 패턴을 듣고 같은 순서로 눌러 멈춰라. (마우스 또는 키 1~4)');
        this.updateRound();
        later(() => this.nextRound(), 900);
      }

      updateRound() {
        this.roundText.setText(`해제 진행  ${this.successes} / ${targetRounds}`);
      }

      nextRound() {
        // 시퀀스 성장: 첫 라운드는 startLen, 이후 +1
        if (this.sequence.length === 0) {
          for (let i = 0; i < startLen; i++) this.sequence.push(Phaser.Math.Between(0, 3));
        } else {
          this.sequence.push(Phaser.Math.Between(0, 3));
        }
        this.inputIdx = 0;
        this.playSequence();
      }

      playSequence() {
        this.locked = true;
        let delay = 420;
        this.sequence.forEach((idx) => {
          later(() => this.flash(idx, false), delay);
          delay += 520;
        });
        later(() => {
          this.locked = false;
          ctx.say?.('이제 같은 순서로!');
        }, delay);
      }

      // 패드 점등 + 소리 + (연결 시) 실물 부저
      flash(idx, fromUser) {
        const pad = this.pads[idx];
        if (!pad) return;
        pad.rect.setFillStyle(pad.spec.lit);
        tone(pad.spec.hz, fromUser ? 0.22 : 0.3);
        // 실물 부저 best-effort — 미연결이면 화면만(진행 막지 않음)
        if (ctx.board?.connected) {
          ctx.board.digital(buzzerPin, true).catch(() => {});
          later(() => ctx.board.digital(buzzerPin, false).catch(() => {}), 160);
        }
        later(() => pad.rect.setFillStyle(pad.spec.dim), 220);
      }

      activate(idx, fromUser) {
        if (this.locked || destroyed) return;
        this.flash(idx, fromUser);

        if (idx === this.sequence[this.inputIdx]) {
          this.inputIdx++;
          if (this.inputIdx >= this.sequence.length) {
            // 라운드 성공
            this.locked = true;
            this.successes++;
            this.updateRound();
            ctx.onProgress?.(this.successes / targetRounds);
            if (this.successes >= targetRounds) {
              later(() => this.win(), 380);
            } else {
              ctx.say?.('좋아! 다음 패턴...');
              later(() => this.nextRound(), 900);
            }
          }
        } else {
          // 틀림 — 치명적 아님, 같은 시퀀스 재시도
          this.locked = true;
          ctx.onFail?.('wrong-step');
          this.cameras.main.shake(180, 0.006);
          ctx.say?.('순서가 달라. 다시 들어보자.');
          this.inputIdx = 0;
          later(() => this.playSequence(), 800);
        }
      }

      win() {
        if (this.alarmTween) this.alarmTween.stop();
        this.alarm.setFillStyle(COLORS.green).setAlpha(1);
        // 구역 점등 연출(전력/정적 회복)
        this.cameras.main.flash(420, 61, 220, 145);
        ctx.say?.(`${m.reward || '정적 회복'} — 경보가 멈췄다.`);
        ctx.onComplete?.({ rounds: this.successes }); // 1회 — ctx 내부 가드
      }
    }

    game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: root,
      backgroundColor: CSS.bg,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: BASE_W,
        height: BASE_H,
      },
      scene: [BuzzerScene],
    });
  });

  return {
    destroy() {
      destroyed = true;
      for (const id of timers) clearTimeout(id);
      timers.clear();
      ready.finally(() => {
        game?.destroy(true);
        game = null;
        if (audio) {
          audio.close().catch(() => {});
          audio = null;
        }
      });
    },
  };
}
