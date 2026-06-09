// 점수·최고기록(localStorage).
const KEY = 'shg.best.v1';

export default class Score {
  constructor() {
    this.points = 0;
    this.day = 1;
    this.best = this.loadBest();
  }
  loadBest() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{"points":0,"day":1}');
    } catch {
      return { points: 0, day: 1 };
    }
  }
  add(p) {
    this.points += p;
  }
  saveIfBest() {
    if (this.points > (this.best.points || 0)) {
      this.best = { points: this.points, day: this.day };
      localStorage.setItem(KEY, JSON.stringify(this.best));
      return true;
    }
    return false;
  }
}
