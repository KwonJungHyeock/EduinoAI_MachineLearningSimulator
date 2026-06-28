import { loadLesson } from '../content/lessons/index.js';
import { lessonById } from '../content/curriculum.js';
import { Progress } from '../app/Progress.js';
import { go } from '../app/Router.js';

export function Lesson(root, id) {
  let cancelled = false;
  const host = document.createElement('div');
  host.className = 'lesson-screen';
  host.innerHTML = '<div class="loading">불러오는 중…</div>';
  root.appendChild(host);

  loadLesson(id).then((content) => {
    if (cancelled) return;
    if (!content) {
      host.innerHTML = `<div class="loading">이 레슨은 아직 준비 중이에요. <a href="#/">← 홈으로</a></div>`;
      return;
    }
    render(host, content, id);
  });

  return () => { cancelled = true; };
}

function render(host, content, id) {
  const meta = lessonById[id] || {};
  const color = meta.color || '#6fb7ff';

  const steps = [];
  if (content.concept) steps.push({ key: 'concept', label: '개념', icon: '📖' });
  if (content.tryIt) steps.push({ key: 'try', label: '체험', icon: '🎮' });
  if (content.sim) steps.push({ key: 'sim', label: '시뮬', icon: '🧪' });
  if (content.quiz) steps.push({ key: 'quiz', label: '퀴즈', icon: '❓' });
  steps.push({ key: 'recap', label: '정리', icon: '✅' });

  let cur = 0;
  const quizState = { answered: 0, score: 0, total: content.quiz?.length || 0 };

  host.innerHTML = `
    <div class="lesson" style="--c:${color}">
      <div class="l-top">
        <a class="back" href="#/">← 홈</a>
        <div class="l-titles"><span class="l-num">${content.id}</span> ${content.title}
          ${content.subtitle ? `<div class="l-sub">${content.subtitle}</div>` : ''}
        </div>
      </div>
      <div class="stepper" id="stepper"></div>
      <div class="l-body" id="body"></div>
      <div class="l-nav">
        <button class="btn ghost" id="prev">← 이전</button>
        <button class="btn primary" id="next">다음 →</button>
      </div>
    </div>
  `;

  const stepper = host.querySelector('#stepper');
  const body = host.querySelector('#body');
  const prevBtn = host.querySelector('#prev');
  const nextBtn = host.querySelector('#next');

  function paintStepper() {
    stepper.innerHTML = steps
      .map((s, i) => `<button class="step ${i === cur ? 'on' : ''} ${i < cur ? 'past' : ''}" data-i="${i}"><span>${s.icon}</span>${s.label}</button>`)
      .join('<span class="step-sep"></span>');
    stepper.querySelectorAll('.step').forEach((b) =>
      b.addEventListener('click', () => { cur = +b.dataset.i; paint(); }),
    );
  }

  function paint() {
    paintStepper();
    const step = steps[cur];
    body.innerHTML = '';
    if (step.key === 'concept') body.innerHTML = conceptHTML(content.concept);
    else if (step.key === 'try') body.innerHTML = placeholder('🎮 체험은 곧 추가됩니다.');
    else if (step.key === 'sim') body.innerHTML = placeholder('🧪 시뮬레이터는 곧 추가됩니다.');
    else if (step.key === 'quiz') renderQuiz();
    else if (step.key === 'recap') renderRecap();

    prevBtn.style.visibility = cur === 0 ? 'hidden' : 'visible';
    nextBtn.textContent = cur === steps.length - 1 ? '학습 완료 ✓' : '다음 →';
  }

  function renderQuiz() {
    const q = content.quiz;
    body.innerHTML = `<div class="quiz" id="quiz">
      <div class="quiz-head">❓ 퀴즈 — 이해를 확인해요 <span id="qscore"></span></div>
    </div>`;
    const quiz = body.querySelector('#quiz');
    q.forEach((item, qi) => {
      const block = document.createElement('div');
      block.className = 'q-block';
      block.innerHTML = `<div class="q-q">${qi + 1}. ${item.q}</div><div class="q-opts"></div><div class="q-explain"></div>`;
      const opts = block.querySelector('.q-opts');
      item.options.forEach((op, oi) => {
        const b = document.createElement('button');
        b.className = 'q-opt';
        b.textContent = op;
        b.addEventListener('click', () => {
          if (block.classList.contains('answered')) return;
          block.classList.add('answered');
          const correct = oi === item.answer;
          b.classList.add(correct ? 'correct' : 'wrong');
          if (!correct) opts.children[item.answer].classList.add('correct');
          block.querySelector('.q-explain').innerHTML = `${correct ? '✅ 정답!' : '❌ 오답'} — ${item.explain}`;
          quizState.answered++;
          if (correct) quizState.score++;
          updateScore();
        });
        opts.appendChild(b);
      });
      quiz.appendChild(block);
    });
    updateScore();
  }
  function updateScore() {
    const s = host.querySelector('#qscore');
    if (s) s.textContent = `(${quizState.score} / ${quizState.total})`;
    if (quizState.answered === quizState.total && quizState.total) {
      Progress.setQuiz(id, quizState.score, quizState.total);
    }
  }

  function renderRecap() {
    body.innerHTML = `
      <div class="recap">
        <h3>✅ 이 레슨 정리</h3>
        <ul>${(content.recap || []).map((r) => `<li>${r}</li>`).join('')}</ul>
        ${quizState.total ? `<div class="recap-quiz">퀴즈 점수: <b>${quizState.score} / ${quizState.total}</b></div>` : ''}
        <p class="recap-msg">잘하셨어요! "학습 완료"를 누르면 진척에 저장됩니다.</p>
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
  return `<div class="concept">${sections.map((s) => {
    let inner = s.p ? `<p>${s.p}</p>` : '';
    if (s.list) inner += `<ul class="c-list">${s.list.map((li) => `<li>${li}</li>`).join('')}</ul>`;
    if (s.table) inner += tableHTML(s.table);
    return `<div class="c-sec"><h3>${s.h}</h3>${inner}</div>`;
  }).join('')}</div>`;
}
function tableHTML(rows) {
  return `<table class="c-table"><thead><tr>${rows[0].map((c) => `<th>${c}</th>`).join('')}</tr></thead>
    <tbody>${rows.slice(1).map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
}
function placeholder(t) {
  return `<div class="placeholder">${t}</div>`;
}
