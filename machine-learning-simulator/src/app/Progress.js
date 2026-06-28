// 학습 진척(localStorage) — 완료 레슨·퀴즈 점수.
const KEY = 'eduinoai.ml.progress.v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '{"done":[],"quiz":{}}');
  } catch {
    return { done: [], quiz: {} };
  }
}
function save(d) {
  localStorage.setItem(KEY, JSON.stringify(d));
}

export const Progress = {
  isDone: (id) => load().done.includes(id),
  markDone(id) {
    const d = load();
    if (!d.done.includes(id)) d.done.push(id);
    save(d);
  },
  setQuiz(id, score, total) {
    const d = load();
    d.quiz[id] = { score, total };
    save(d);
  },
  getQuiz: (id) => load().quiz[id] || null,
  doneCount: () => load().done.length,
  reset() {
    localStorage.removeItem(KEY);
  },
};
