import { CURRICULUM, ALL_LESSONS, totalLessons } from '../content/curriculum.js';
import { Progress } from '../app/Progress.js';
import { go } from '../app/Router.js';

export function Home(root) {
  const done = Progress.doneCount();
  const pct = Math.round((done / totalLessons) * 100);
  const firstReady = ALL_LESSONS.find((l) => l.status === 'ready' && !Progress.isDone(l.id))
    || ALL_LESSONS.find((l) => l.status === 'ready');

  const el = document.createElement('div');
  el.className = 'home';
  el.innerHTML = `
    <header class="hero">
      <div class="brand">EduinoAI · MACHINE LEARNING LAB</div>
      <h1>머신러닝, <span class="hl">만지면서</span> 이해하기</h1>
      <p class="lead">개념 설명 → 간단 체험 → 시뮬레이터 → 퀴즈.<br/>데이터와 조건을 직접 바꾸며 머신러닝을 쉽고 재미있게 배웁니다.</p>
      <div class="hero-actions">
        <button class="btn primary" id="start">${done ? '이어서 학습 ▸' : '학습 시작 ▸'}</button>
        <div class="overall">
          <div class="overall-top"><span>전체 진행</span><span>${done} / ${totalLessons}</span></div>
          <div class="pbar"><div class="pfill" style="width:${pct}%"></div></div>
        </div>
        <div class="hero-stats">
          <span class="chip-xp">⭐ ${Progress.getXP()} XP</span>
          <span class="chip-badge">🏅 뱃지 ${Progress.getBadges().length}</span>
        </div>
      </div>
    </header>
    <section class="chapters" id="chapters"></section>
    <footer class="foot">EduinoAI · 머신러닝 학습 프로그램 — 바닐라 JS로 제작 · 무료</footer>
  `;
  root.appendChild(el);

  const wrap = el.querySelector('#chapters');
  CURRICULUM.forEach((ch, i) => {
    const card = document.createElement('div');
    card.className = 'chapter';
    card.style.setProperty('--c', ch.color);
    const doneInCh = ch.lessons.filter((l) => Progress.isDone(l.id)).length;
    card.innerHTML = `
      <div class="ch-head">
        <div class="ch-emoji">${ch.emoji}</div>
        <div>
          <div class="ch-title">CH${i}. ${ch.title}</div>
          <div class="ch-desc">${ch.desc}</div>
        </div>
        <div class="ch-prog">${doneInCh}/${ch.lessons.length}</div>
      </div>
      <ul class="lessons"></ul>
    `;
    const ul = card.querySelector('.lessons');
    ch.lessons.forEach((l) => {
      const li = document.createElement('li');
      const ready = l.status === 'ready';
      const isDone = Progress.isDone(l.id);
      li.className = 'lesson' + (ready ? '' : ' soon') + (isDone ? ' done' : '');
      li.innerHTML = `
        <span class="l-check">${isDone ? '✓' : ''}</span>
        <span class="l-id">${l.id}</span>
        <span class="l-title">${l.title}</span>
        <span class="l-tag">${l.tag}</span>
        <span class="l-status">${ready ? '▸' : '준비 중'}</span>
      `;
      if (ready) li.addEventListener('click', () => go(`/lesson/${l.id}`));
      ul.appendChild(li);
    });
    wrap.appendChild(card);
  });

  el.querySelector('#start').addEventListener('click', () => {
    if (firstReady) go(`/lesson/${firstReady.id}`);
  });

  return () => {};
}
