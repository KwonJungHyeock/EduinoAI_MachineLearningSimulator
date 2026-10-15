/* author: eduino */
(function () {
  'use strict';

  // 데이터: build.py 가 페이지에 끼워 넣은 값 (file:// 에서 fetch 불가하므로)
  var DATA = window.__TOWN__ || {};
  var MAP = DATA.map_hot || { image: {}, hotspots: [] };

  var app = document.getElementById('app');

  // ────────────────────────────────────────────────────────────
  // 저장 어댑터 (한 곳). 지금은 브라우저 저장소. 서버 연결 자리만 남김.
  // 하드삭제 없음 — 소프트삭제만(지울 땐 _deleted 표시).
  // ────────────────────────────────────────────────────────────
  var SaveAdapter = (function () {
    var KEY = 'ai_town_save_v1';
    var mem = null; // 저장소를 못 쓰는 환경(일부 file://) 대비 메모리 폴백

    function read() {
      try {
        var raw = window.localStorage.getItem(KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) { return mem; }
    }
    function write(obj) {
      mem = obj;
      try { window.localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* 메모리 폴백 유지 */ }
      // [서버 연결 자리] 나중에 여기서 저장 어댑터가 서버로 보냄(비동기). 지금은 비움.
      // 예: Server.save(obj)  // 실패해도 로컬은 유지
    }
    return {
      load: function () { return read(); },
      save: function (obj) { write(obj); },
      // 소프트삭제: 레코드를 지우지 않고 _deleted 로 표시
      softDelete: function (obj, path) { if (obj && obj[path]) obj[path]._deleted = true; write(obj); }
    };
  })();

  // 기본 상태
  function freshState() {
    return {
      v: 1,
      visited: false,
      robot: { base: false, parts: [] },   // parts: ['hand'] 등
      units: {}                             // units['0-2'] = { status:'todo'|'done' }
    };
  }
  var state = SaveAdapter.load() || freshState();

  function unitDone(id) { return !!(state.units[id] && state.units[id].status === 'done' && !state.units[id]._deleted); }

  // 건물 불 켜짐(완료) 계산 — hot.json 이 아니라 저장값에서 계산한다.
  // 건물 id -> 그 건물 완료 조건(단원)
  var BUILDING_UNITS = { lab: ['0-2'] };
  function isLit(buildingId) {
    var us = BUILDING_UNITS[buildingId];
    if (!us) return false;
    for (var i = 0; i < us.length; i++) if (unitDone(us[i])) return true;
    return false;
  }
  function completedCount() { var n = 0; for (var k in state.units) if (unitDone(k)) n++; return n; }

  // ────────────────────────────────────────────────────────────
  // 작은 도우미
  // ────────────────────────────────────────────────────────────
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  // 에셋 슬롯: 파일이 있으면 그림, 없으면 빈 슬롯에 파일명만 표시 (코드로 그림 금지)
  function assetSlot(src, w, h, tag) {
    var box = el('div', 'slot');
    if (tag) box.appendChild(el('span', 'slot-tag', tag));
    if (src) {
      var img = new Image();
      img.alt = src;
      img.style.display = 'none';
      img.onload = function () { box.classList.remove('slot'); box.className = 'slot has-img'; box.textContent = ''; img.style.display = 'block'; box.appendChild(img); if (tag) box.appendChild(el('span', 'slot-tag', tag)); };
      img.onerror = function () { /* 빈 슬롯 유지 */ };
      img.src = src;
    }
    box.appendChild(el('span', 'slot-name', '🖼 ' + (src || '에셋 없음')));
    if (w && h) box.appendChild(el('span', 'slot-dim', w + '×' + h));
    return box;
  }

  var toastEl = el('div', 'toast');
  document.body.appendChild(toastEl);
  var toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg; toastEl.classList.add('on');
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 1800);
  }

  // ────────────────────────────────────────────────────────────
  // 화면 라우터 (지도 · 건물 안 · 미션 · 차고)
  // ────────────────────────────────────────────────────────────
  var screens = {};
  function show(name) {
    for (var k in screens) screens[k].classList.toggle('on', k === name);
    if (name === 'map') refreshPlates();
    updateProg();
  }

  function topbar(title, withBack) {
    var bar = el('div', 'topbar');
    var brand = el('div', 'brand', 'AI 로봇 타운 <span class="dot">●</span>');
    bar.appendChild(brand);
    if (title) { var t = el('div', 'prog'); t.style.marginLeft = '6px'; t.textContent = '· ' + title; bar.appendChild(t); }
    bar.appendChild(el('div', 'spacer'));
    var prog = el('div', 'prog'); prog.innerHTML = '완료 단원 <b>' + completedCount() + '</b> / 1';
    prog.dataset.role = 'prog';
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
    for (var i = 0; i < all.length; i++) all[i].innerHTML = '완료 단원 <b>' + completedCount() + '</b> / 1';
  }

  // ────────────────────────────────────────────────────────────
  // 지도 화면
  // ────────────────────────────────────────────────────────────
  var mapView, mapWorld, plateLayer, plateEls = {};
  var tx = 0, ty = 0, zoom = 1; // world 변환
  var ZMIN = 1, ZMAX = 4;

  function buildMapScreen() {
    var s = el('div', 'screen');
    s.appendChild(topbar('타운 지도', false));

    mapView = el('div', 'map-viewport');
    mapWorld = el('div', 'map-world');

    var mapImg = el('div', 'map-img');
    mapImg.appendChild(assetSlot(MAP.image.day, MAP.image.w, MAP.image.h, '지도(낮)'));
    mapImg.appendChild(el('div', 'night-veil'));
    plateLayer = el('div', 'plate-layer');
    plateLayer.style.position = 'absolute'; plateLayer.style.inset = '0';
    mapImg.appendChild(plateLayer);

    mapWorld.appendChild(mapImg);
    mapView.appendChild(mapWorld);

    // 낮/밤 토글
    var dn = el('div', 'daynight');
    var dnBtn = el('button', 'btn ghost', '🌙 밤으로');
    dnBtn.onclick = function () {
      var night = mapView.classList.toggle('night');
      dnBtn.textContent = night ? '☀️ 낮으로' : '🌙 밤으로';
      // 슬롯 파일명도 낮/밤에 맞춰 표시
      var nameEl = mapImg.querySelector('.slot .slot-name');
      if (nameEl) nameEl.textContent = '🖼 ' + (night ? MAP.image.night : MAP.image.day);
    };
    dn.appendChild(dnBtn);
    mapView.appendChild(dn);

    // 확대 컨트롤
    var ctrls = el('div', 'map-ctrls');
    var zout = el('button', 'btn', '−');
    var zin = el('button', 'btn', '+');
    var zreset = el('button', 'btn ghost', '초기화');
    zout.onclick = function () { setZoom(zoom - 0.5); };
    zin.onclick = function () { setZoom(zoom + 0.5); };
    zreset.onclick = function () { tx = 0; ty = 0; setZoom(1); };
    ctrls.appendChild(zout); ctrls.appendChild(zin); ctrls.appendChild(zreset);
    mapView.appendChild(ctrls);

    s.appendChild(mapView);
    wireMapInput();
    buildPlates();
    return s;
  }

  function applyWorld() {
    mapWorld.style.transform = 'translate(-50%,-50%) translate(' + tx + 'px,' + ty + 'px) scale(' + zoom + ')';
  }
  function setZoom(z) {
    zoom = Math.max(ZMIN, Math.min(ZMAX, Math.round(z * 100) / 100));
    clampPan();
    applyWorld();
  }
  function clampPan() {
    // 지나치게 벗어나지 않게 완만히 제한(확대할수록 더 움직일 수 있음)
    var lim = 520 * zoom;
    tx = Math.max(-lim, Math.min(lim, tx));
    ty = Math.max(-lim, Math.min(lim, ty));
  }

  function wireMapInput() {
    var dragging = false, sx = 0, sy = 0, stx = 0, sty = 0, moved = false;
    mapView.addEventListener('pointerdown', function (e) {
      dragging = true; moved = false; sx = e.clientX; sy = e.clientY; stx = tx; sty = ty;
      mapView.classList.add('grabbing');
      // 주의: 여기서 setPointerCapture 를 걸면 click 이 뷰포트로 넘어가 이름표 클릭이 안 먹는다.
    });
    mapView.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
      tx = stx + dx; ty = sty + dy; clampPan(); applyWorld();
    });
    function up() { dragging = false; mapView.classList.remove('grabbing'); }
    mapView.addEventListener('pointerup', up);
    mapView.addEventListener('pointercancel', up);
    mapView.addEventListener('wheel', function (e) {
      e.preventDefault();
      setZoom(zoom + (e.deltaY < 0 ? 0.3 : -0.3));
    }, { passive: false });
    // 드래그 끝 직후의 클릭이 이름표를 눌러버리지 않도록 플래그 공유
    mapView._moved = function () { return moved; };
  }

  function buildPlates() {
    plateLayer.innerHTML = ''; plateEls = {};
    (MAP.hotspots || []).forEach(function (h) {
      var p = el('div', 'plate ' + (h.status === 'open' ? 'open' : 'soon'));
      p.style.left = (h.x * 100) + '%';
      p.style.top = (h.y * 100) + '%';
      p.appendChild(el('div', 'pin'));
      p.appendChild(el('div', 'tag', h.name));
      if (h.status === 'soon') p.appendChild(el('div', 'sub', '준비 중'));
      p.addEventListener('click', function () {
        if (mapView._moved && mapView._moved()) return; // 드래그였으면 무시
        onPlate(h);
      });
      plateLayer.appendChild(p);
      plateEls[h.id] = p;
    });
    refreshPlates();
  }
  function refreshPlates() {
    for (var id in plateEls) {
      plateEls[id].classList.toggle('lit', isLit(id));
    }
  }
  function onPlate(h) {
    if (h.status !== 'open') { toast(h.name + ' — 준비 중'); return; }
    if (h.id === 'lab') show('building');
    else if (h.id === 'garage') show('garage');
    else toast(h.name + ' — 준비 중');
  }

  // ────────────────────────────────────────────────────────────
  // 건물 안 (로봇 연구소) — 자리만. 작업대는 파트 2.
  // ────────────────────────────────────────────────────────────
  function buildBuildingScreen() {
    var s = el('div', 'screen');
    s.appendChild(topbar('로봇 연구소', true));
    var inner = el('div', 'inner');
    var stage = el('div', 'stage');
    stage.appendChild(assetSlot('assets/lab_section.webp', 2000, 1250, '연구소 단면'));
    inner.appendChild(stage);
    var rail = el('div', 'rail');
    rail.appendChild(el('h2', null, '로봇 연구소'));
    rail.appendChild(el('div', 'muted', '공통 기초 단원(0-1~0-8)을 배우는 곳이에요. 작업대는 <b>파트 2</b>에서 공개됩니다.'));
    var c = el('div', 'card');
    c.appendChild(el('h4', null, '이번에 열리는 단원'));
    c.appendChild(el('div', 'hint', '0-2 규칙으로 판단하기 <span class="badge-soon">미션은 파트 3</span>'));
    rail.appendChild(c);
    rail.appendChild(el('div', 'muted', 'EDDIE 안내 말풍선과 작업대 이름표 8개가 이 화면에 들어갑니다.'));
    inner.appendChild(rail);
    s.appendChild(inner);
    return s;
  }

  // ────────────────────────────────────────────────────────────
  // 미션 0-2 — 자리만. 파트 3.
  // ────────────────────────────────────────────────────────────
  function buildMissionScreen() {
    var s = el('div', 'screen');
    s.appendChild(topbar('미션 0-2 · 규칙으로 판단하기', true));
    var inner = el('div', 'inner');
    var stage = el('div', 'stage');
    stage.appendChild(assetSlot('assets/sort_station.glb', null, null, '분류 작업대(실시간 3D)'));
    inner.appendChild(stage);
    var rail = el('div', 'rail');
    rail.appendChild(el('h2', null, '규칙으로 판단하기'));
    rail.appendChild(el('div', 'muted', '미션 → 예측 → 실험 → 개념 → 적용 → 정리 6단계가 <b>파트 3</b>에서 들어옵니다.'));
    inner.appendChild(rail);
    s.appendChild(inner);
    return s;
  }

  // ────────────────────────────────────────────────────────────
  // 로봇 차고 — 자리만(3D는 파트 4). 소켓 5개 안내는 표시.
  // ────────────────────────────────────────────────────────────
  var SOCKETS = [
    { key: 'eye', ic: '👁', nm: '눈', where: '비전 랩' },
    { key: 'ear', ic: '👂', nm: '귀', where: '음성 방송국' },
    { key: 'brain', ic: '🧠', nm: '두뇌', where: '로봇 연구소' },
    { key: 'memory', ic: '💾', nm: '기억', where: '데이터 관제센터' },
    { key: 'hand', ic: '🤖', nm: '손', where: '0-2 완료 시' }
  ];
  function buildGarageScreen() {
    var s = el('div', 'screen');
    s.appendChild(topbar('로봇 차고', true));
    var inner = el('div', 'inner');
    var stage = el('div', 'stage');
    stage.appendChild(assetSlot('assets/robot_base.glb', null, null, '내 로봇(실시간 3D) · 배경 assets/garage.webp'));
    inner.appendChild(stage);
    var rail = el('div', 'rail');
    rail.appendChild(el('h2', null, '로봇 차고'));
    rail.appendChild(el('div', 'muted', '얻은 부품만 장착된 모습으로 보여요. 실시간 3D는 <b>파트 4</b>에서 들어옵니다.'));
    var list = el('div', 'socket-list');
    SOCKETS.forEach(function (so) {
      var have = state.robot.parts.indexOf(so.key) >= 0;
      var row = el('div', 'socket' + (have ? ' have' : ''));
      row.appendChild(el('div', 'ic', so.ic));
      row.appendChild(el('div', 'nm', so.nm));
      row.appendChild(el('div', 'where', have ? '장착됨' : ('← ' + so.where)));
      list.appendChild(row);
    });
    rail.appendChild(list);
    inner.appendChild(rail);
    s.appendChild(inner);
    return s;
  }

  // ────────────────────────────────────────────────────────────
  // EDDIE 첫 방문 안내 3단계: 타운 소개 → 내 로봇 받기 → 연구소로 이동
  // ────────────────────────────────────────────────────────────
  var EDDIE_STEPS = [
    { h: '안녕! 난 EDDIE야', p: '여기는 로봇이 배우며 자라는 <b>AI 로봇 타운</b>. 건물을 눌러 들어가면 하나씩 배울 수 있어. 지금은 <b>로봇 연구소</b>와 <b>로봇 차고</b>가 열려 있어.', btn: '다음' },
    { h: '내 로봇을 받자', p: '네 전용 로봇 기본형을 줄게. 차고에서 언제든 돌려 볼 수 있어. 단원을 완료할 때마다 <b>부품</b>을 하나씩 얻어 장착하게 돼.', btn: '로봇 받기' },
    { h: '연구소로 가 볼까?', p: '첫 단원은 연구소의 <b>0-2 규칙으로 판단하기</b>야. 완료하면 연구소에 <b>불이 켜지고</b> 차고에 <b>집게 손</b> 부품을 받아!', btn: '연구소로 이동' }
  ];
  function showEddie() {
    var idx = 0;
    var mask = el('div', 'eddie-mask on');
    var wrap = el('div', 'eddie');
    var face = assetSlot('assets/eddie.webp', 512, 512, 'EDDIE');
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
  app.appendChild(screens.map);
  app.appendChild(screens.building);
  app.appendChild(screens.mission);
  app.appendChild(screens.garage);

  applyWorld();
  show('map');
  if (!state.visited) setTimeout(showEddie, 350);

  // 디버그 보조(검수용): 외부에서 상태 초기화
  window.__town = {
    reset: function () { state = freshState(); SaveAdapter.save(state); location.reload(); },
    state: function () { return state; }
  };
})();
