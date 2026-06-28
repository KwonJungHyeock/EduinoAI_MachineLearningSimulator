import { loadLesson } from '../content/lessons/index.js';
import { lessonById } from '../content/curriculum.js';
import { Progress } from '../app/Progress.js';
import { go } from '../app/Router.js';
import { mountWidget } from '../sim/registry.js';

export function Lesson(root, id) {
  let cancelled = false;
  const host = document.createElement('div');
  host.className = 'lesson-screen';
  host.innerHTML = '<div class="loading">불러오는 중…</div>';
  root.appendChild(host);

  loadLesson(id).then((content) => {
    if (cancelled) return;
    if (!content) { host.innerHTML = `<div class="loading">이 레슨은 준비 중이에요. <a href="#/">← 홈</a></div>`; return; }
    render(host, content, id);
  });
  return () => { cancelled = true; host.__destroyAll?.(); };
}

const STEP_META = {
  concept: { icon: '📖', label: '개념' },
  try: { icon: '🎮', label: '체험' },
  sim: { icon: '🧪', label: '시뮬' },
  quiz: { icon: '❓', label: '퀴즈' },
  recap: { icon: '🏁', label: '정리' },
};

function render(host, content, id) {
  const meta = lessonById[id] || {};
  const color = meta.color || '#6fb7ff';
  const steps = [];
  if (content.concept) steps.push('concept');
  if (content.tryIt) steps.push('try');
  if (content.sim) steps.push('sim');
  if (content.quiz) steps.push('quiz');
  steps.push('recap');

  let cur = 0;
  const quiz = { answered: 0, score: 0, total: content.quiz?.length || 0 };

  host.innerHTML = `
    <div class="lab" style="--c:${color}">
      <header class="lab-top">
        <a class="lab-back" href="#/">← 홈</a>
        <div class="lab-id"><span class="lab-num">${content.id}</span>
          <div><div class="lab-title">${content.title}</div>${content.subtitle ? `<div class="lab-sub">${content.subtitle}</div>` : ''}</div>
        </div>
        <div class="lab-path" id="path"></div>
      </header>
      <main class="lab-stage" id="stage"></main>
      <footer class="lab-foot">
        <button class="btn ghost" id="prev">← 이전</button>
        <div class="foot-dots" id="dots"></div>
        <button class="btn primary" id="next">다음 →</button>
      </footer>
    </div>`;

  const pathEl = host.querySelector('#path');
  const stage = host.querySelector('#stage');
  const dots = host.querySelector('#dots');
  const prevBtn = host.querySelector('#prev');
  const nextBtn = host.querySelector('#next');

  let token = 0;
  let mounted = [];
  function destroyAll() { mounted.forEach((wt) => { try { wt.destroy?.(); } catch {} }); mounted = []; }
  host.__destroyAll = destroyAll;
  function mountW(spec, container) {
    if (!spec?.widget) { container.innerHTML = placeholder('준비 중'); return; }
    const my = token;
    mountWidget(spec.widget, container, spec)
      .then((inst) => { if (my !== token || !inst) { inst?.destroy?.(); return; } mounted.push(inst); })
      .catch(() => {});
  }

  function paintPath() {
    pathEl.innerHTML = steps.map((s, i) => {
      const m = STEP_META[s];
      const cls = i === cur ? 'on' : i < cur ? 'past' : '';
      return `<button class="node ${cls}" data-i="${i}"><span class="ic">${i < cur ? '✓' : m.icon}</span>${m.label}</button>`;
    }).join('<span class="node-link"></span>');
    pathEl.querySelectorAll('.node').forEach((b) => b.addEventListener('click', () => { cur = +b.dataset.i; paint(); }));
    dots.innerHTML = steps.map((_, i) => `<span class="dot ${i === cur ? 'on' : ''}"></span>`).join('');
  }

  function paint() {
    token++;
    destroyAll();
    paintPath();
    const s = steps[cur];
    stage.className = 'lab-stage';
    stage.innerHTML = '';
    if (s === 'concept') {
      stage.innerHTML = `<div class="stage-inner">${conceptHTML(content.concept)}</div>`;
      content.concept.forEach((sec, i) => {
        if (sec.visual) { const slot = stage.querySelector(`.c-visual-slot[data-i="${i}"]`); if (slot) mountW(sec.visual, slot); }
      });
    } else if (s === 'try' || s === 'sim') {
      stage.classList.add('full');
      const holder = document.createElement('div'); holder.className = 'sim-holder'; stage.appendChild(holder);
      mountW(s === 'try' ? content.tryIt : content.sim, holder);
    } else if (s === 'quiz') renderQuiz();
    else if (s === 'recap') renderRecap();
    // 전환 연출
    stage.classList.remove('enter'); void stage.offsetWidth; stage.classList.add('enter');

    prevBtn.style.visibility = cur === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = cur === steps.length - 1 ? '학습 완료 ✓' : '다음 →';
  }

  function renderQuiz() {
    const inner = document.createElement('div');
    inner.className = 'stage-inner quiz-stage';
    inner.innerHTML = `<div class="quiz-head">❓ 퀴즈 <span id="qscore">(0 / ${quiz.total})</span></div>`;
    content.quiz.forEach((item, qi) => {
      const block = document.createElement('div');
      block.className = 'q-block';
      block.innerHTML = `<div class="q-q">${qi + 1}. ${item.q}</div><div class="q-opts"></div><div class="q-explain"></div>`;
      const opts = block.querySelector('.q-opts');
      item.options.forEach((op, oi) => {
        const bb = document.createElement('button');
        bb.className = 'q-opt'; bb.textContent = op;
        bb.addEventListener('click', () => {
          if (block.classList.contains('answered')) return;
          block.classList.add('answered');
          const correct = oi === item.answer;
          bb.classList.add(correct ? 'correct' : 'wrong');
          if (!correct) opts.children[item.answer].classList.add('correct');
          block.querySelector('.q-explain').innerHTML = `${correct ? '✅ 정답!' : '❌ 오답'} — ${item.explain}`;
          quiz.answered++; if (correct) quiz.score++;
          const sc = host.querySelector('#qscore'); if (sc) sc.textContent = `(${quiz.score} / ${quiz.total})`;
          if (quiz.answered === quiz.total) Progress.setQuiz(id, quiz.score, quiz.total);
        });
        opts.appendChild(bb);
      });
      inner.appendChild(block);
    });
    stage.appendChild(inner);
  }

  function renderRecap() {
    stage.innerHTML = `<div class="stage-inner recap-stage">
      <div class="recap-badge" style="--c:${color}">🏁</div>
      <h2>레슨 정리</h2>
      <ul>${(content.recap || []).map((r) => `<li>${r}</li>`).join('')}</ul>
      ${quiz.total ? `<div class="recap-score">퀴즈 점수 <b>${quiz.score} / ${quiz.total}</b></div>` : ''}
      <p class="recap-msg">"학습 완료"를 누르면 진척에 저장돼요. 잘하셨어요! 👏</p>
    </div>`;
  }

  prevBtn.addEventListener('click', () => { if (cur > 0) { cur--; paint(); } });
  nextBtn.addEventListener('click', () => {
    if (cur < steps.length - 1) { cur++; paint(); }
    else { Progress.markDone(id); go('/'); }
  });

  paint();
}

function conceptHTML(sections) {
  return `<div class="concept">${sections.map((s, i) => {
    let inner = s.p ? `<p>${s.p}</p>` : '';
    if (s.list) inner += `<ul class="c-list">${s.list.map((li) => `<li>${li}</li>`).join('')}</ul>`;
    if (s.table) inner += tableHTML(s.table);
    if (s.visual) inner += `<div class="c-visual-slot" data-i="${i}"></div>`;
    return `<div class="c-card"><h3>${s.h}</h3>${inner}</div>`;
  }).join('')}</div>`;
}
function tableHTML(rows) {
  return `<table class="c-table"><thead><tr>${rows[0].map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
const placeholder = (t) => `<div class="placeholder">${t}</div>`;
