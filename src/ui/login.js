// 로그인 DOM 오버레이 — 콘솔 단말기 느낌의 접속코드 입력(6칸 분리형).
// 폼/입력은 네이티브 HTML이 정확·접근성↑ → Phaser 위에 오버레이.
// 백엔드 없음(서버리스): 검증은 자리표시자, 실제 검증은 기존 셸 포팅 시 교체.
const AUTH_KEY = 'eduino.auth.v1';
const LEN = 6;

export function mountLogin({ onSuccess, onGuest, align = 'right' } = {}) {
  const root = document.getElementById('overlay');
  const wrap = document.createElement('div');
  wrap.className = 'login' + (align === 'left' ? ' login--left' : '');
  wrap.innerHTML = `
    <form class="login__card" autocomplete="off" novalidate>
      <div class="login__eyebrow">▢ SYSTEM ACCESS</div>
      <h2 class="login__title">접속 코드 입력</h2>
      <p class="login__desc">시설 단말에 연결하려면 6자리 접속 코드를 입력하세요.</p>

      <div class="login__label">ACCESS CODE</div>
      <div class="login__code" role="group" aria-label="접속 코드 6자리">
        ${Array.from({ length: LEN })
          .map((_, i) => `<input class="login__cell" inputmode="latin" maxlength="1" data-i="${i}" aria-label="${i + 1}번째 자리" />`)
          .join('')}
      </div>

      <div class="login__err" id="login-err" role="alert"></div>

      <button type="submit" class="login__submit">시설 진입 ▸</button>

      <label class="login__remember">
        <input type="checkbox" id="login-remember" checked />
        <span>이 기기에서 코드 기억</span>
      </label>

      <button type="button" class="login__guest">체험 모드로 둘러보기</button>
      <div class="login__hint">코드는 구매 시 발급됩니다 · ESC로 타이틀</div>
    </form>
  `;
  root.appendChild(wrap);

  const card = wrap.querySelector('.login__card');
  const cells = [...wrap.querySelectorAll('.login__cell')];
  const err = wrap.querySelector('#login-err');
  const remember = wrap.querySelector('#login-remember');
  const submitBtn = wrap.querySelector('.login__submit');

  const value = () => cells.map((c) => c.value).join('');
  const norm = (s) => s.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // 기억된 코드 자동 채움
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (saved?.code) {
      norm(saved.code)
        .slice(0, LEN)
        .split('')
        .forEach((ch, i) => {
          cells[i].value = ch;
          cells[i].classList.add('is-filled');
        });
    }
  } catch {}

  requestAnimationFrame(() => card.classList.add('is-in'));
  setTimeout(() => cells[0].focus(), 440);

  function setError(msg) {
    err.textContent = msg || '';
    card.classList.toggle('is-error', !!msg);
    if (msg) {
      card.classList.remove('shake');
      void card.offsetWidth;
      card.classList.add('shake');
    }
  }

  // 입력: 한 칸 채우면 다음으로, 백스페이스는 이전으로, 붙여넣기 분배
  function onInput(e) {
    const cell = e.target;
    cell.value = norm(cell.value).slice(-1);
    cell.classList.toggle('is-filled', !!cell.value);
    setError('');
    const i = +cell.dataset.i;
    if (cell.value && i < LEN - 1) cells[i + 1].focus();
  }
  function onKeydown(e) {
    const cell = e.target;
    const i = +cell.dataset.i;
    if (e.key === 'Backspace' && !cell.value && i > 0) {
      cells[i - 1].focus();
      cells[i - 1].value = '';
      cells[i - 1].classList.remove('is-filled');
      e.preventDefault();
    } else if (e.key === 'ArrowLeft' && i > 0) {
      cells[i - 1].focus();
    } else if (e.key === 'ArrowRight' && i < LEN - 1) {
      cells[i + 1].focus();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    }
  }
  function onPaste(e) {
    e.preventDefault();
    const t = norm(e.clipboardData.getData('text')).slice(0, LEN);
    t.split('').forEach((ch, k) => (cells[k].value = ch));
    cells[Math.min(t.length, LEN - 1)].focus();
  }
  cells.forEach((c) => {
    c.addEventListener('input', onInput);
    c.addEventListener('keydown', onKeydown);
    c.addEventListener('paste', onPaste);
    c.addEventListener('focus', () => c.select());
  });

  function validate(code) {
    if (code.length === 0) return '코드를 입력하세요.';
    if (code.length < LEN) return 'ACCESS DENIED — 6자리를 모두 입력하세요.';
    return null; // 자리표시자
  }

  function enter(code, guest = false) {
    if (!guest && remember.checked) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ code, ts: Date.now() }));
    } else if (!remember.checked) {
      localStorage.removeItem(AUTH_KEY);
    }
    submitBtn.disabled = true;
    card.classList.add('is-granted');
    setError('');
    setTimeout(() => (guest ? onGuest?.() : onSuccess?.(code)), 560);
  }

  function onSubmit(e) {
    e?.preventDefault();
    const code = value();
    const problem = validate(code);
    if (problem) {
      setError(problem);
      (cells.find((c) => !c.value) || cells[0]).focus();
      return;
    }
    enter(code);
  }

  card.addEventListener('submit', onSubmit);
  wrap.querySelector('.login__guest').addEventListener('click', () => enter('GUEST', true));

  return {
    el: wrap,
    destroy() {
      card.removeEventListener('submit', onSubmit);
      wrap.remove();
    },
  };
}
