// ───────────────────────────────────────────────────────────────────────────
// 개발용 하니스(셸 시뮬레이터)
// 실제 셸(KwonJungHyeock/Playino)이 하는 일을 흉내내, src/games/*.js 의
// mountGame(root, ctx) 계약을 단독으로 개발/테스트한다.
//  - 게임 선택 드롭다운(레지스트리)
//  - 보드 연결 토글(오프라인 클리어 가능 요건 검증, 지침서 §9)
//  - say 말풍선 / 진행률 바 / 콜백·시리얼 로그
//  - 진척 리셋, 방 재시작
// 이 파일은 셸로 옮기지 않는다(게임 모듈만 셸에 꽂는다).
// ───────────────────────────────────────────────────────────────────────────
import './styles/harness.css';
import { GAMES } from './games/registry.js';
import { createMockBoard } from './harness/mockBoard.js';
import { buildContext } from './harness/mockCtx.js';
import { mockProgress } from './harness/mockProgress.js';

const app = document.getElementById('harness');
app.innerHTML = `
  <div class="stage">
    <div class="stage__game" id="game-root"></div>
    <div class="say" id="say"></div>
    <div class="win" id="win">
      <div class="win__card">
        <h2>탈출 성공</h2>
        <p id="win-msg">방을 클리어했습니다.</p>
        <button id="win-again" class="ctrl" style="margin-top:12px;padding:8px 16px;border-radius:8px;border:1px solid #1d2740;background:#0d1320;color:#e6edf7;cursor:pointer;">다시 하기</button>
      </div>
    </div>
  </div>
  <aside class="panel">
    <div class="panel__head">
      <h1>🤖 PLAYINO · GAME HARNESS</h1>
      <p>mountGame(root, ctx) 계약 테스트 셸</p>
    </div>
    <div class="ctrl">
      <label for="game-sel">미션 방</label>
      <select id="game-sel"></select>
      <div class="toggle" id="board-toggle">
        <span>보드 연결 (실물 best-effort)</span>
        <span class="dot"></span>
      </div>
      <div>
        <label>진행률 (onProgress)</label>
        <div class="bar"><div class="bar__fill" id="prog"></div></div>
      </div>
      <div class="row">
        <button id="btn-restart">방 재시작</button>
        <button id="btn-reset">진척 리셋</button>
      </div>
    </div>
    <div class="log" id="log"></div>
  </aside>
`;

const els = {
  gameRoot: document.getElementById('game-root'),
  say: document.getElementById('say'),
  win: document.getElementById('win'),
  winMsg: document.getElementById('win-msg'),
  winAgain: document.getElementById('win-again'),
  sel: document.getElementById('game-sel'),
  boardToggle: document.getElementById('board-toggle'),
  prog: document.getElementById('prog'),
  log: document.getElementById('log'),
};

// 로그
function log(kind, text) {
  const div = document.createElement('div');
  div.className = 'l';
  const t = new Date().toLocaleTimeString('en-GB');
  div.innerHTML = `<span class="t">${t}</span> <span class="k-${kind}">${kind.toUpperCase()}</span> ${escapeHtml(text)}`;
  els.log.appendChild(div);
  els.log.scrollTop = els.log.scrollHeight;
}
const escapeHtml = (s) => String(s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

// 공유 mock 보드(싱글턴 — 셸과 동일)
const board = createMockBoard({ onLog: log });
function syncBoardToggle() {
  els.boardToggle.classList.toggle('on', board.connected);
}
els.boardToggle.addEventListener('click', () => {
  board.__setConnected(!board.connected);
  syncBoardToggle();
});

// 게임 드롭다운
GAMES.forEach((g, i) => {
  const opt = document.createElement('option');
  opt.value = String(i);
  opt.textContent = `${g.mission.icon} ${g.mission.name} (${g.mission.id})`;
  els.sel.appendChild(opt);
});

let current = null; // { destroy }
let activeIndex = 0;

async function mount(index) {
  await unmount();
  activeIndex = index;
  const entry = GAMES[index];
  els.win.classList.remove('show');
  els.prog.style.width = '0%';
  els.gameRoot.innerHTML = '';
  els.say.style.opacity = '0';
  log('sys', `방 진입: ${entry.mission.id} (cleared=${mockProgress.isCleared(entry.mission.id)})`);

  const ctx = buildContext({
    mission: entry.mission,
    board,
    sayEl: els.say,
    log,
    onProgressUI: (r) => (els.prog.style.width = `${Math.round(r * 100)}%`),
    onCompleteUI: (detail) => {
      els.winMsg.textContent = `${entry.mission.name} — ${entry.mission.reward || '클리어'}`;
      els.win.classList.add('show');
    },
    onExitUI: () => log('sys', '(하니스) 챕터 복귀 — 여기서는 동작 없음'),
  });

  try {
    const mod = await entry.load();
    if (activeIndex !== index) return; // 그 사이 다른 방으로 전환됨
    current = mod.mountGame(els.gameRoot, ctx);
  } catch (e) {
    log('fail', `로드 실패: ${e?.message || e}`);
    console.error(e);
  }
}

async function unmount() {
  if (current) {
    try {
      current.destroy?.();
    } catch (e) {
      log('warn', `destroy 오류: ${e?.message || e}`);
    }
    current = null;
  }
}

els.sel.addEventListener('change', (e) => mount(Number(e.target.value)));
document.getElementById('btn-restart').addEventListener('click', () => mount(activeIndex));
document.getElementById('btn-reset').addEventListener('click', () => {
  mockProgress.reset();
  log('sys', '진척 전체 리셋');
});
els.winAgain.addEventListener('click', () => mount(activeIndex));

// 방 떠날 때 정리(누수 방지)
window.addEventListener('beforeunload', unmount);

syncBoardToggle();
mount(0);
