// 셸의 src/app/progress.js 흉내(지침서 §4). 게임은 읽기 전용으로만 쓴다.
// 게임은 progress.mark를 직접 부르지 않는다 — onComplete만 호출(셸이 마킹).
const KEY = 'eduino.progress.v1';

function load() {
  try {
    return new Set(JSON.parse(localStorage.getItem(KEY) || '[]'));
  } catch {
    return new Set();
  }
}
function save(set) {
  localStorage.setItem(KEY, JSON.stringify([...set]));
}

export const mockProgress = {
  isCleared: (id) => load().has(id),
  mark(id) {
    const s = load();
    s.add(id);
    save(s);
  },
  unmark(id) {
    const s = load();
    s.delete(id);
    save(s);
  },
  reset() {
    localStorage.removeItem(KEY);
  },
  all: () => [...load()],
};
