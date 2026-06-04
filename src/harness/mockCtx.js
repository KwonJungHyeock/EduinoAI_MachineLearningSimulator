// 셸이 미니게임에 넘기는 GameContext(지침서 §4)를 하니스에서 재현한다.
// 콜백(onComplete/onProgress/onFail/onExit)은 실제 셸 동작을 흉내내 로그/진척에 반영한다.
import { mockProgress } from './mockProgress.js';

export function buildContext({ mission, board, sayEl, log, onProgressUI, onCompleteUI, onExitUI }) {
  let completed = false; // onComplete 중복 호출 가드(셸 책임이지만 하니스도 방어)

  return {
    mission,
    board,
    progress: {
      isCleared: mockProgress.isCleared,
    },

    say(text, x, y) {
      log('say', text);
      if (!sayEl) return;
      sayEl.textContent = text;
      sayEl.style.opacity = '1';
      if (x != null) sayEl.style.left = `${x}px`;
      if (y != null) sayEl.style.top = `${y}px`;
      clearTimeout(sayEl.__t);
      sayEl.__t = setTimeout(() => (sayEl.style.opacity = '0'), 4200);
    },

    onComplete(detail) {
      if (completed) {
        log('warn', 'onComplete 중복 호출 무시됨(가드)');
        return;
      }
      completed = true;
      mockProgress.mark(mission.id); // ← 셸 역할: progress.mark
      log('done', `onComplete${detail ? ' ' + JSON.stringify(detail) : ''} → progress.mark('${mission.id}')`);
      onCompleteUI?.(detail);
    },

    onProgress(ratio) {
      const r = Math.max(0, Math.min(1, Number(ratio) || 0));
      log('prog', `onProgress(${r.toFixed(2)})`);
      onProgressUI?.(r);
    },

    onFail(reason) {
      log('fail', `onFail(${reason ?? ''})`);
    },

    onExit() {
      log('exit', 'onExit() → 챕터로 복귀');
      onExitUI?.();
    },
  };
}
