// 로그인 DOM 오버레이 — 접속코드 입력 카드(오른쪽).
// 폼/입력은 네이티브 HTML이 정확·접근성↑ → Phaser 위에 오버레이로 띄운다.
// 백엔드 없음(서버리스): 검증은 자리표시자이며, 실제 코드 검증 로직은
// 기존 셸(KwonJungHyeock/Playino) 포팅 시 교체한다.
const AUTH_KEY = 'eduino.auth.v1';

export function mountLogin({ onSuccess, onGuest } = {}) {
  const root = document.getElementById('overlay');
  const wrap = document.createElement('div');
  wrap.className = 'login';
  wrap.innerHTML = `
    <form class="login__card" autocomplete="off" novalidate>
      <div class="login__eyebrow">SYSTEM ACCESS</div>
      <h2 class="login__title">접속 코드 입력</h2>
      <p class="login__desc">시설에 연결하려면 접속 코드를 입력하세요.</p>

      <label class="login__label" for="login-code">ACCESS CODE</label>
      <input id="login-code" class="login__input" type="text" inputmode="latin"
             maxlength="20" placeholder="● ● ● ● ● ●" aria-describedby="login-err" />

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
  const input = wrap.querySelector('#login-code');
  const err = wrap.querySelector('#login-err');
  const remember = wrap.querySelector('#login-remember');
  const submitBtn = wrap.querySelector('.login__submit');

  // 기억된 코드 자동 채움
  try {
    const saved = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null');
    if (saved?.code) {
      input.value = saved.code;
      remember.checked = true;
    }
  } catch {}

  // 살짝 등장(공포 톤: 깜빡이며 켜짐)
  requestAnimationFrame(() => card.classList.add('is-in'));
  setTimeout(() => input.focus(), 420);

  function setError(msg) {
    err.textContent = msg || '';
    card.classList.toggle('is-error', !!msg);
    if (msg) {
      card.classList.remove('shake');
      void card.offsetWidth; // 리플로우로 애니 리셋
      card.classList.add('shake');
    }
  }

  function validate(code) {
    const c = code.trim();
    if (!c) return '코드를 입력하세요.';
    if (c.length < 4) return 'ACCESS DENIED — 코드가 너무 짧습니다.';
    return null; // 자리표시자: 추후 실제 검증 로직으로 교체
  }

  function enter(code, guest = false) {
    if (!guest && remember.checked) {
      localStorage.setItem(AUTH_KEY, JSON.stringify({ code: code.trim(), ts: Date.now() }));
    } else if (!remember.checked) {
      localStorage.removeItem(AUTH_KEY);
    }
    submitBtn.disabled = true;
    card.classList.add('is-granted');
    setError('');
    setTimeout(() => (guest ? onGuest?.() : onSuccess?.(code.trim())), 520);
  }

  function onSubmit(e) {
    e?.preventDefault();
    const code = input.value;
    const problem = validate(code);
    if (problem) {
      setError(problem);
      input.focus();
      return;
    }
    enter(code);
  }

  card.addEventListener('submit', onSubmit);
  input.addEventListener('input', () => setError(''));
  wrap.querySelector('.login__guest').addEventListener('click', () => enter('GUEST', true));

  return {
    el: wrap,
    focus: () => input.focus(),
    destroy() {
      card.removeEventListener('submit', onSubmit);
      wrap.remove();
    },
  };
}
