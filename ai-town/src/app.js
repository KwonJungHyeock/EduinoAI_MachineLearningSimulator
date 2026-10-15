/* author: eduino */
(function () {
  'use strict';

  // 데이터: build.py 가 페이지에 끼워 넣은 값 (file:// 에서 fetch 불가하므로)
  var DATA = window.__TOWN__ || {};
  var MAP = DATA.map_hot || { image: {}, hotspots: [] };
  var LAB = DATA.lab_hot || { image: {}, hotspots: [] };
  var UNITS = (DATA.units && DATA.units.units) || [];
  var UNIT = {}; UNITS.forEach(function (u) { UNIT[u.id] = u; });

  var app = document.getElementById('app');

  // ────────────────────────────────────────────────────────────
  // 저장 어댑터 (한 곳). 지금은 브라우저 저장소. 서버 연결 자리만 남김.
  // 하드삭제 없음 — 소프트삭제만(지울 땐 _deleted 표시).
  // ────────────────────────────────────────────────────────────
  var SaveAdapter = (function () {
    var KEY = 'ai_town_save_v1';
    var mem = null; // 저장소를 못 쓰는 환경(일부 file://) 대비 메모리 폴백
    function read() {
      try { var raw = window.localStorage.getItem(KEY); return raw ? JSON.parse(raw) : mem; }
      catch (e) { return mem; }
    }
    function write(obj) {
      mem = obj;
      try { window.localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* 메모리 폴백 유지 */ }
      // [서버 연결 자리] 나중에 여기서 서버로 보냄(비동기). 실패해도 로컬은 유지.
    }
    return {
      load: read,
      save: write,
      softDelete: function (obj, key) { if (obj && obj[key]) { obj[key]._deleted = true; write(obj); } }
    };
  })();

  function freshState() {
    return { v: 1, visited: false, robot: { base: false, parts: [] }, units: {} };
  }
  var state = SaveAdapter.load() || freshState();

  function unitDone(id) { var u = state.units[id]; return !!(u && u.status === 'done' && !u._deleted); }
  // 건물 불 켜짐 — hot.json 이 아니라 저장값에서 계산 (그 건물 단원 중 하나라도 완료)
  function isLit(buildingId) {
    for (var i = 0; i < UNITS.length; i++) if (UNITS[i].building === buildingId && unitDone(UNITS[i].id)) return true;
    return false;
  }
  function completedCount() { var n = 0; for (var k in state.units) if (unitDone(k)) n++; return n; }
  function openUnitCount() { var n = 0; (LAB.hotspots || []).forEach(function (h) { if (h.status === 'open') n++; }); return n; }

  // ────────────────────────────────────────────────────────────
  // 작은 도우미
  // ────────────────────────────────────────────────────────────
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function baseName(p) { return String(p || '').split('/').pop(); }
  // 에셋 슬롯: 파일이 있으면 그림, 없으면 빈 슬롯에 파일명만 (코드로 그림 금지)
  // variant: 'corner'(큰 슬롯, 이름표와 겹치지 않게 모서리) · 'mini'(작은 슬롯, 파일 이름만)
  function assetSlot(src, w, h, tag, variant) {
    var box = el('div', 'slot' + (variant ? ' ' + variant : ''));
    if (tag && variant !== 'mini') box.appendChild(el('span', 'slot-tag', tag));
    box.appendChild(el('span', 'slot-name', '🖼 ' + (variant === 'mini' ? baseName(src) : src)));
    if (w && h && variant !== 'mini') box.appendChild(el('span', 'slot-dim', w + '×' + h));
    if (src && /\.(webp|png|jpg|jpeg)$/i.test(src)) {
      var img = new Image();
      img.alt = '';
      img.onload = function () { box.className = 'slot has-img'; box.innerHTML = ''; box.appendChild(img); };
      img.src = src; // 실패하면 빈 슬롯 그대로
    }
    return box;
  }

  var toastEl = el('div', 'toast');
  document.body.appendChild(toastEl);
  var toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1800);
  }

  // 이름표 (지도 · 작업대 공통)
  function makePlate(h, labelHTML, onClick) {
    var p = el('div', 'plate ' + (h.status === 'open' ? 'open' : 'soon'));
    p.style.left = (h.x * 100) + '%';
    p.style.top = (h.y * 100) + '%';
    p.appendChild(el('div', 'pin'));
    p.appendChild(el('div', 'tag', labelHTML));
    p.addEventListener('click', onClick);
    return p;
  }

  // 이미지 비율(w×h)을 지키며 장면 안에 꽉 차게
  function fitScene(stage, box, w, h) {
    function fit() {
      var sw = stage.clientWidth, sh = stage.clientHeight, r = w / h;
      if (!sw || !sh) return;
      if (sw / sh > r) { box.style.height = sh + 'px'; box.style.width = Math.round(sh * r) + 'px'; }
      else { box.style.width = sw + 'px'; box.style.height = Math.round(sw / r) + 'px'; }
    }
    if (window.ResizeObserver) new ResizeObserver(fit).observe(stage);
    window.addEventListener('resize', fit);
    setTimeout(fit, 0);
  }

  // ────────────────────────────────────────────────────────────
  // 화면 라우터 (지도 · 건물 안 · 미션 · 차고)
  // ────────────────────────────────────────────────────────────
  var screens = {};
  var onShow = {};
  function show(name) {
    for (var k in screens) screens[k].classList.toggle('on', k === name);
    if (onShow[name]) onShow[name]();
    updateProg();
  }

  function topbar(where, withBack) {
    var bar = el('div', 'topbar');
    bar.appendChild(el('div', 'brand', 'AI 로봇 타운'));
    if (where) bar.appendChild(el('div', 'where', '· ' + where));
    bar.appendChild(el('div', 'spacer'));
    var prog = el('div', 'prog'); prog.dataset.role = 'prog';
    bar.appendChild(prog);
    if (withBack) {
      var back = el('button', 'btn ghost', '← 타운 지도');
      back.onclick = function () { show('map'); };
      bar.appendChild(back);
    }
    return bar;
  }
  function updateProg() {
    var all = document.querySelectorAll('[data-role="prog"]');
    for (var i = 0; i < all.length; i++) all[i].innerHTML = '완료 단원 <b>' + completedCount() + '</b> / ' + openUnitCount();
  }

  // ────────────────────────────────────────────────────────────
  // 지도 화면
  // ────────────────────────────────────────────────────────────
  var mapView, mapWorld, mapSlotName, mapPlates = {};
  var tx = 0, ty = 0, zoom = 1;
  var ZMIN = 1, ZMAX = 4;

  function buildMapScreen() {
    var s = el('div', 'screen');
    s.appendChild(topbar('타운 지도', false));

    mapView = el('div', 'map-viewport');
    mapWorld = el('div', 'map-world');
    var mapImg = el('div', 'map-img');
    var slot = assetSlot(MAP.image.day, MAP.image.w, MAP.image.h, '지도', 'corner');
    mapSlotName = slot.querySelector('.slot-name');
    mapImg.appendChild(slot);
    mapImg.appendChild(el('div', 'night-veil'));
    var layer = el('div', 'plate-layer');
    mapImg.appendChild(layer);
    mapWorld.appendChild(mapImg);
    mapView.appendChild(mapWorld);

    (MAP.hotspots || []).forEach(function (h) {
      var label = h.status === 'open' ? h.name : '🔒 ' + h.name;
      var p = makePlate(h, label, function () {
        if (mapView._moved && mapView._moved()) return; // 드래그였으면 무시
        onMapPlate(h);
      });
      layer.appendChild(p);
      mapPlates[h.id] = p;
    });

    var dn = el('div', 'daynight');
    var dnBtn = el('button', 'btn', '🌙 밤으로');
    dnBtn.onclick = function () {
      var night = mapView.classList.toggle('night');
      dnBtn.textContent = night ? '☀️ 낮으로' : '🌙 밤으로';
      if (mapSlotName) mapSlotName.textContent = '🖼 ' + (night ? MAP.image.night : MAP.image.day);
    };
    dn.appendChild(dnBtn);
    mapView.appendChild(dn);

    var ctrls = el('div', 'map-ctrls');
    var zout = el('button', 'btn', '−'), zin = el('button', 'btn', '+'), zreset = el('button', 'btn', '처음 크기');
    zout.onclick = function () { setZoom(zoom - 0.5); };
    zin.onclick = function () { setZoom(zoom + 0.5); };
    zreset.onclick = function () { tx = 0; ty = 0; setZoom(1); };
    ctrls.appendChild(zout); ctrls.appendChild(zin); ctrls.appendChild(zreset);
    mapView.appendChild(ctrls);

    s.appendChild(mapView);
    wireMapInput();
    onShow.map = function () { for (var id in mapPlates) mapPlates[id].classList.toggle('lit', isLit(id)); };
    return s;
  }

  function applyWorld() {
    mapWorld.style.transform = 'translate(-50%,-50%) translate(' + tx + 'px,' + ty + 'px) scale(' + zoom + ')';
    mapWorld.style.setProperty('--inv', String(1 / zoom)); // 이름표는 화면 크기 고정
  }
  function setZoom(z) { zoom = Math.max(ZMIN, Math.min(ZMAX, Math.round(z * 100) / 100)); clampPan(); applyWorld(); }
  function clampPan() { var lim = 520 * zoom; tx = Math.max(-lim, Math.min(lim, tx)); ty = Math.max(-lim, Math.min(lim, ty)); }

  function wireMapInput() {
    var dragging = false, sx = 0, sy = 0, stx = 0, sty = 0, moved = false;
    mapView.addEventListener('pointerdown', function (e) {
      if (e.target.closest && e.target.closest('.btn')) return;
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty;
      mapView.classList.add('grabbing');
      // 주의: setPointerCapture 를 걸면 click 이 뷰포트로 넘어가 이름표 클릭이 안 먹는다.
    });
    mapView.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      tx = stx + dx; ty = sty + dy; clampPan(); applyWorld();
    });
    function up() { dragging = false; mapView.classList.remove('grabbing'); }
    mapView.addEventListener('pointerup', up);
    mapView.addEventListener('pointerleave', up);
    mapView.addEventListener('pointercancel', up);
    mapView.addEventListener('wheel', function (e) { e.preventDefault(); setZoom(zoom + (e.deltaY < 0 ? 0.3 : -0.3)); }, { passive: false });
    mapView._moved = function () { return moved; };
  }

  function onMapPlate(h) {
    if (h.status !== 'open') { toast(h.name + ' — 준비 중이에요'); return; }
    if (h.id === 'lab') show('building');
    else if (h.id === 'garage') show('garage');
  }

  // ────────────────────────────────────────────────────────────
  // 건물 안 — 로봇 연구소 (파트 2)
  // 단면 렌더 슬롯 + 작업대 이름표 8개(lab_hot.json). 작업대 = 단원 0-1~0-8.
  // ────────────────────────────────────────────────────────────
  var labPlates = {}, labSelected = null, labCardBox, labEddieText;

  function buildBuildingScreen() {
    var s = el('div', 'screen');
    s.appendChild(topbar('로봇 연구소', true));
    var inner = el('div', 'inner');

    var stage = el('div', 'stage');
    var fitBox = el('div', 'scene-fit');
    fitBox.appendChild(assetSlot(LAB.image.src, LAB.image.w, LAB.image.h, '연구소 단면', 'corner'));
    var layer = el('div', 'plate-layer');
    (LAB.hotspots || []).forEach(function (h) {
      var u = UNIT[h.id] || { title: '' };
      var label = (h.status === 'open' ? '' : '🔒 ') + h.name + '<small>' + u.title + '</small>';
      var p = makePlate(h, label, function () { selectUnit(h.id); });
      layer.appendChild(p);
      labPlates[h.id] = p;
    });
    fitBox.appendChild(layer);
    stage.appendChild(fitBox);
    fitScene(stage, fitBox, LAB.image.w || 2000, LAB.image.h || 1250);
    inner.appendChild(stage);

    var rail = el('div', 'rail');
    rail.appendChild(el('h2', null, '로봇 연구소'));
    var er = el('div', 'eddie-rail');
    var face = assetSlot('assets/eddie.webp', 512, 512, null, 'mini');
    face.classList.add('face');
    er.appendChild(face);
    labEddieText = el('div', 'bubble');
    er.appendChild(labEddieText);
    rail.appendChild(er);
    labCardBox = el('div');
    rail.appendChild(labCardBox);
    rail.appendChild(el('div', 'src-line', '임시: 단원 설명 · 핵심 문구는 초안 (data/units.json)'));
    inner.appendChild(rail);
    s.appendChild(inner);

    onShow.building = function () {
      for (var id in labPlates) labPlates[id].classList.toggle('lit', unitDone(id));
      renderUnitCard();
    };
    return s;
  }

  function hotOf(id) { var hs = LAB.hotspots || []; for (var i = 0; i < hs.length; i++) if (hs[i].id === id) return hs[i]; return null; }

  function selectUnit(id) {
    labSelected = id;
    for (var k in labPlates) labPlates[k].classList.toggle('sel', k === id);
    renderUnitCard();
  }

  function renderUnitCard() {
    labCardBox.innerHTML = '';
    if (!labSelected) {
      labEddieText.innerHTML = '작업대를 눌러 봐. 지금은 <b>규칙으로 판단하기</b> 작업대가 열려 있어.';
      labCardBox.appendChild(el('div', 'unit-empty', '작업대를 누르면 단원 카드가 여기에 나와요'));
      return;
    }
    var u = UNIT[labSelected] || {};
    var h = hotOf(labSelected) || {};
    var open = h.status === 'open';
    var done = unitDone(labSelected);

    var card = el('div', 'unit-card' + (open ? '' : ' soon'));
    var stateTxt = done ? '완료 · 불 켜짐' : (open ? '지금 할 수 있어요' : '🔒 준비 중');
    card.appendChild(el('div', 'uc-state ' + (done ? 'done' : open ? 'open' : ''), stateTxt));
    card.appendChild(el('h3', null, u.title || ''));
    card.appendChild(el('p', 'uc-desc', u.desc || ''));
    var key = el('div', 'uc-key');
    key.appendChild(el('b', null, '핵심'));
    key.appendChild(el('span', null, u.key || ''));
    card.appendChild(key);

    var btn;
    if (!open) { btn = el('button', 'btn', '준비 중'); btn.disabled = true; }
    else {
      btn = el('button', 'btn primary', done ? '다시 하기' : '시작');
      btn.onclick = function () { startUnit(labSelected); };
    }
    card.appendChild(btn);
    labCardBox.appendChild(card);

    if (!open) labEddieText.innerHTML = '이 단원은 아직 준비 중이야. 무엇을 배우는지 미리 볼 수 있어.';
    else if (done) labEddieText.innerHTML = '연구소에 불이 켜졌어! 차고에서 <b>집게 손</b>을 확인해 봐.';
    else labEddieText.innerHTML = '좋아! <b>시작</b>을 누르면 분류 작업대로 가.';
  }

  function startUnit(id) {
    currentUnit = id;
    show('mission');
  }

  // ────────────────────────────────────────────────────────────
  // 미션 — 자리만 (파트 3)
  // ────────────────────────────────────────────────────────────
  var currentUnit = null, missionTitle;
  function buildMissionScreen() {
    var s = el('div', 'screen');
    s.appendChild(topbar('미션', false));
    var inner = el('div', 'inner');
    var stage = el('div', 'stage');
    stage.appendChild(assetSlot('assets/sort_station.glb', null, null, '분류 작업대 (실시간 3D)', 'corner'));
    inner.appendChild(stage);
    var rail = el('div', 'rail');
    missionTitle = el('h2');
    rail.appendChild(missionTitle);
    rail.appendChild(el('div', 'muted', '미션 → 예측 → 실험 → 개념 → 적용 → 정리 6단계는 <b>파트 3</b>에서 들어옵니다.'));
    var back = el('button', 'btn', '← 연구소로');
    back.onclick = function () { show('building'); };
    rail.appendChild(back);
    inner.appendChild(rail);
    s.appendChild(inner);
    onShow.mission = function () { var u = UNIT[currentUnit] || {}; missionTitle.textContent = u.title || '미션'; };
    return s;
  }

  // ────────────────────────────────────────────────────────────
  // 로봇 차고 — 자리만 (3D는 파트 4). 소켓 5개 안내.
  // ────────────────────────────────────────────────────────────
  var SOCKETS = [
    { key: 'eye', ic: '👁', nm: '눈', where: '비전 랩' },
    { key: 'ear', ic: '👂', nm: '귀', where: '음성 방송국' },
    { key: 'brain', ic: '🧠', nm: '두뇌', where: '로봇 연구소' },
    { key: 'memory', ic: '💾', nm: '기억', where: '데이터 관제센터' },
    { key: 'hand', ic: '✋', nm: '손 (집게 손)', where: '연구소 규칙으로 판단하기 완료 시' }
  ];
  function buildGarageScreen() {
    var s = el('div', 'screen');
    s.appendChild(topbar('로봇 차고', true));
    var inner = el('div', 'inner');
    var stage = el('div', 'stage');
    stage.appendChild(assetSlot('assets/robot_base.glb', null, null, '내 로봇 (실시간 3D)', 'corner'));
    inner.appendChild(stage);
    var rail = el('div', 'rail');
    rail.appendChild(el('h2', null, '로봇 차고'));
    rail.appendChild(el('div', 'muted', '얻은 부품만 장착된 모습으로 보여요. 실시간 3D는 <b>파트 4</b>에서 들어옵니다.'));
    var list = el('div', 'socket-list');
    rail.appendChild(list);
    rail.appendChild(el('div', 'src-line', '임시: 손 외 부품을 얻는 건물은 확정 전'));
    inner.appendChild(rail);
    s.appendChild(inner);
    onShow.garage = function () {
      list.innerHTML = '';
      SOCKETS.forEach(function (so) {
        var have = state.robot.parts.indexOf(so.key) >= 0;
        var row = el('div', 'socket' + (have ? ' have' : ''));
        row.appendChild(el('div', 'ic', so.ic));
        row.appendChild(el('div', 'nm', so.nm));
        row.appendChild(el('div', 'where', have ? '장착됨' : so.where));
        list.appendChild(row);
      });
    };
    return s;
  }

  // ────────────────────────────────────────────────────────────
  // EDDIE 첫 방문 안내 3단계: 타운 소개 → 내 로봇 받기 → 연구소로 이동
  // ────────────────────────────────────────────────────────────
  var EDDIE_STEPS = [
    { h: '안녕! 난 EDDIE야', p: '여기는 로봇이 배우며 자라는 <b>AI 로봇 타운</b>이야. 건물을 눌러 들어가면 하나씩 배울 수 있어. 지금은 <b>로봇 연구소</b>와 <b>로봇 차고</b>가 열려 있어.', btn: '다음' },
    { h: '내 로봇을 받자', p: '네 전용 로봇 기본형을 줄게. 차고에서 언제든 돌려 볼 수 있어. 단원을 마칠 때마다 <b>부품</b>을 하나씩 얻어 장착하게 돼.', btn: '로봇 받기' },
    { h: '연구소로 가 볼까?', p: '첫 단원은 연구소의 <b>규칙으로 판단하기</b>야. 마치면 연구소에 <b>불이 켜지고</b> 차고에 <b>집게 손</b>이 생겨!', btn: '연구소로 이동' }
  ];
  function showEddie() {
    var idx = 0;
    var mask = el('div', 'eddie-mask on');
    var wrap = el('div', 'eddie');
    var face = assetSlot('assets/eddie.webp', 512, 512, null, 'mini');
    face.classList.add('face');
    var bubble = el('div', 'bubble');
    wrap.appendChild(face); wrap.appendChild(bubble);
    mask.appendChild(wrap);
    document.body.appendChild(mask);

    function render() {
      var st = EDDIE_STEPS[idx];
      bubble.innerHTML = '';
      bubble.appendChild(el('h3', null, st.h));
      bubble.appendChild(el('p', null, st.p));
      var row = el('div', 'row');
      var dots = el('div', 'dots');
      for (var i = 0; i < EDDIE_STEPS.length; i++) dots.appendChild(el('i', i === idx ? 'on' : ''));
      row.appendChild(dots);
      if (idx > 0) { var skip = el('button', 'btn ghost', '건너뛰기'); skip.onclick = function () { finish(false); }; row.appendChild(skip); }
      var next = el('button', 'btn primary', st.btn);
      next.onclick = function () {
        if (idx === 1) { state.robot.base = true; SaveAdapter.save(state); toast('내 로봇을 받았어요 (차고에서 확인)'); }
        if (idx < EDDIE_STEPS.length - 1) { idx++; render(); }
        else finish(true);
      };
      row.appendChild(next);
      bubble.appendChild(row);
    }
    function finish(goLab) {
      state.visited = true; SaveAdapter.save(state);
      if (mask.parentNode) mask.parentNode.removeChild(mask);
      if (goLab) show('building');
    }
    render();
  }

  // ────────────────────────────────────────────────────────────
  // 초기화
  // ────────────────────────────────────────────────────────────
  screens.map = buildMapScreen();
  screens.building = buildBuildingScreen();
  screens.mission = buildMissionScreen();
  screens.garage = buildGarageScreen();
  for (var k in screens) app.appendChild(screens[k]);

  applyWorld();
  show('map');
  if (!state.visited) setTimeout(showEddie, 350);

  // 검수용 보조
  window.__town = {
    reset: function () { state = freshState(); SaveAdapter.save(state); location.reload(); },
    state: function () { return state; },
    show: show
  };
})();
