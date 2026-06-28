// 학습 진척 + 게이미피케이션(XP·뱃지) — localStorage.
const KEY = 'eduinoai.ml.progress.v1';

function load() {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { done: d.done || [], quiz: d.quiz || {}, xp: d.xp || 0, badges: d.badges || [] };
  } catch {
    return { done: [], quiz: {}, xp: 0, badges: [] };
  }
}
function save(d) { localStorage.setItem(KEY, JSON.stringify(d)); }

export const Progress = {
  isDone: (id) => load().done.includes(id),
  markDone(id, xp = 50) {
    const d = load();
    if (!d.done.includes(id)) { d.done.push(id); d.xp += xp; save(d); return xp; }
    save(d); return 0;
  },
  setQuiz(id, score, total) { const d = load(); d.quiz[id] = { score, total }; save(d); },
  getQuiz: (id) => load().quiz[id] || null,
  doneCount: () => load().done.length,
  getXP: () => load().xp,
  addBadge(id, label) {
    const d = load();
    if (!d.badges.some((b) => b.id === id)) { d.badges.push({ id, label }); save(d); return true; }
    return false;
  },
  hasBadge: (id) => load().badges.some((b) => b.id === id),
  getBadges: () => load().badges,
  reset() { localStorage.removeItem(KEY); },
};
