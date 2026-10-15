/* author: eduino */
// 규칙 기반 분류 계산 (화면과 node 점검이 같은 계산을 쓴다)
// 규칙 = 줄 최대 3개 + '아니면'.  줄: { sensor, op: '<' | '>=', value, bin }
// 위에서부터 차례로 보고, 처음 맞는 줄의 통으로 보낸다. 켜지지 않은 센서의 줄은 건너뛴다.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Rules = factory();
})(this, function () {
  'use strict';

  var MAX_LINES = 3;

  function test(line, item) {
    var v = item.values[line.sensor];
    return line.op === '<' ? v < line.value : v >= line.value;
  }

  // 물건 하나가 갈 통 (enabled: 켜진 센서 목록, 없으면 전부 켜짐)
  function binOf(rule, item, enabled) {
    var lines = rule.lines || [];
    for (var i = 0; i < lines.length; i++) {
      var ln = lines[i];
      if (enabled && enabled.indexOf(ln.sensor) < 0) continue;
      if (test(ln, item)) return ln.bin;
    }
    return rule.elseBin;
  }

  // 전체 분류 결과: 통별 맞음/틀림, 잘못 간 물건 목록
  function run(rule, items, enabled, kinds) {
    var res = { total: items.length, correct: 0, wrong: [], bins: {} };
    kinds.forEach(function (k) { res.bins[k] = { right: 0, wrong: 0 }; });
    items.forEach(function (it) {
      var b = binOf(rule, it, enabled);
      if (!res.bins[b]) res.bins[b] = { right: 0, wrong: 0 };
      if (b === it.kind) { res.correct++; res.bins[b].right++; }
      else { res.bins[b].wrong++; res.wrong.push({ id: it.id, kind: it.kind, to: b }); }
    });
    return res;
  }

  // 센서 하나에서 물건 종류끼리 값 범위가 겹치는 쌍 (관찰 포인트용)
  function overlaps(items, sensor, kinds) {
    var rng = {};
    kinds.forEach(function (k) { rng[k] = null; });
    items.forEach(function (it) {
      var v = it.values[sensor], r = rng[it.kind];
      rng[it.kind] = r ? [Math.min(r[0], v), Math.max(r[1], v)] : [v, v];
    });
    var out = [];
    for (var i = 0; i < kinds.length; i++) for (var j = i + 1; j < kinds.length; j++) {
      var a = rng[kinds[i]], b = rng[kinds[j]];
      if (a && b && a[0] <= b[1] && b[0] <= a[1]) out.push([kinds[i], kinds[j]]);
    }
    return { ranges: rng, mixed: out };
  }

  // 후보 기준값: 센서 값 사이의 가운데 (켜진 센서만)
  function candidates(items, sensors) {
    var c = [];
    sensors.forEach(function (s) {
      var vals = Array.from(new Set(items.map(function (it) { return it.values[s]; }))).sort(function (a, b) { return a - b; });
      for (var i = 0; i < vals.length - 1; i++) {
        var t = (vals[i] + vals[i + 1]) / 2;
        c.push({ sensor: s, op: '<', value: t });
        c.push({ sensor: s, op: '>=', value: t });
      }
    });
    return c;
  }

  // 켜진 센서만으로 만들 수 있는 가장 좋은 규칙(줄 0~3개 + 아니면)을 전부 찾아본다.
  // 같은 정답 수면 줄이 적은 규칙을 고른다.
  // 편집기 기준값 칸(예: 투명도 10 % · 무게 10 g 단위)으로 후보를 만든다
  function gridCandidates(sensorDefs, sensors, steps) {
    var c = [];
    sensors.forEach(function (s) {
      var d = sensorDefs[s];
      var vals = d.type === 'bool' ? [0.5] : [];
      if (d.type !== 'bool') for (var v = d.min + steps[s]; v < d.max; v += steps[s]) vals.push(v);
      vals.forEach(function (t) { c.push({ sensor: s, op: '<', value: t }); c.push({ sensor: s, op: '>=', value: t }); });
    });
    return c;
  }

  function best(items, sensors, kinds, condList) {
    var raw = condList || candidates(items, sensors);
    // 물건을 똑같이 가르는 조건은 하나만 남긴다(결과는 같고 탐색만 빨라짐)
    var seen = {}, conds = [];
    raw.forEach(function (c) {
      var sig = items.map(function (it) { return test(c, it) ? 1 : 0; }).join('');
      if (sig.indexOf('1') < 0 || sig.indexOf('0') < 0) return; // 전부 / 아무것도 안 고르는 조건은 쓸모없음
      if (!seen[sig]) { seen[sig] = 1; conds.push(c); }
    });
    var top = { correct: -1, rule: null };
    function score(rule) {
      var n = 0;
      for (var i = 0; i < items.length; i++) if (binOf(rule, items[i]) === items[i].kind) n++;
      return n;
    }
    function consider(lines) {
      for (var e = 0; e < kinds.length; e++) {
        var rule = { lines: lines, elseBin: kinds[e] };
        var n = score(rule);
        if (n > top.correct || (n === top.correct && lines.length < top.rule.lines.length)) top = { correct: n, rule: { lines: lines.slice(), elseBin: kinds[e] } };
      }
    }
    function grow(lines) {
      consider(lines);
      if (top.correct === items.length && lines.length >= top.rule.lines.length) return;
      if (lines.length >= MAX_LINES) return;
      for (var c = 0; c < conds.length; c++) for (var k = 0; k < kinds.length; k++) {
        grow(lines.concat([{ sensor: conds[c].sensor, op: conds[c].op, value: conds[c].value, bin: kinds[k] }]));
      }
    }
    grow([]);
    return top;
  }

  return { MAX_LINES: MAX_LINES, binOf: binOf, run: run, overlaps: overlaps, best: best, gridCandidates: gridCandidates };
});
