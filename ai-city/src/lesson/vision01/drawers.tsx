// author: eduino
// 1차시 서랍 3종: [그래프] 실험 결과 · [코드] 노란 칸만 바꾸는 관제 설정 · [기록] 시스템 기록(해설 없음)
import type { Result, Params } from '../../sim/surveillance';

export interface Run { id: number; kind: 'exp' | 'concept' | 'apply'; p: Params; res: Result; done: boolean }
const pct = (x: number) => `${Math.round(x * 100)}%`;

// ── 그래프: 실험 = 카메라 수 – 놓친 비율 / 적용 = 기준값 – 놓친 비율 ──
// 점 = 내가 돌린 근무 한 번. 점에 마우스를 올리면 위 모니터 벽이 그 근무로 바뀌고(onHover), 지금 보이는 근무의 점은 노란 고리.
export function GraphDrawer({ runs, mode, activeId, onHover }: { runs: Run[]; mode: 'cameras' | 'threshold'; activeId?: number | null; onHover?: (id: number | null) => void }) {
  const W = 640, H = 200, L = 48, R = 18, T = 30, B = 30;
  const xsCam = [4, 8, 16, 32, 64];
  let pts: { x: number; y: number; run: Run }[] = [];
  let xTicks: { x: number; label: string }[] = [];
  if (mode === 'cameras') {
    const last = new Map<number, Run>();
    runs.filter((r) => r.kind === 'exp' && r.done).forEach((r) => last.set(r.p.cameras, r));
    xTicks = xsCam.map((c, i) => ({ x: L + (i / (xsCam.length - 1)) * (W - L - R), label: `${c}대` }));
    pts = xsCam.filter((c) => last.has(c)).map((c) => ({ x: xTicks[xsCam.indexOf(c)].x, y: last.get(c)!.res.missRate, run: last.get(c)! }));
  } else {
    const last = new Map<number, Run>();
    runs.filter((r) => r.kind === 'apply' && r.done && r.p.aiAssist && r.p.operators === 1).forEach((r) => last.set(r.p.threshold, r));
    const xs = Array.from({ length: 17 }, (_, i) => 10 + i * 5);
    xTicks = xs.filter((v) => v % 10 === 0).map((v) => ({ x: L + ((v - 10) / 80) * (W - L - R), label: `${v}` }));
    pts = [...last.keys()].sort((a, b) => a - b).map((v) => ({ x: L + ((v - 10) / 80) * (W - L - R), y: last.get(v)!.res.missRate, run: last.get(v)! }));
  }
  const Y = (v: number) => T + (1 - v) * (H - T - B);
  const act = pts.find((q) => q.run.id === activeId) ?? null;
  const tip = (r: Run) => mode === 'cameras'
    ? `${r.p.cameras}대 근무 · ${r.res.events}건 중 ${r.res.missed}건 놓침 (${pct(r.res.missRate)})`
    : `기준값 ${r.p.threshold} · 알림 ${r.res.alerts}건 · 확인 못 함 ${r.res.expiredAlerts}건 · 놓침 ${pct(r.res.missRate)}`;
  const read = mode === 'cameras'
    ? '점 하나 = 내가 돌린 근무 한 번. 오른쪽(카메라 많음)으로 갈수록 점이 위(놓침 많음)로 올라가면 → 사람 눈에는 한계가 있다는 뜻.'
    : '점 하나 = 내가 돌린 근무 한 번. 초록 띠 안에 들어온 점이 목표 달성. 왼쪽(기준값 낮음)은 알림 폭주, 오른쪽(높음)은 AI가 놓침.';
  const link = act
    ? (mode === 'cameras'
      ? `위 모니터 벽에서 주황 점(놓친 사건) ${act.run.res.missed}개 ÷ 전체 사건 ${act.run.res.events}건 = 이 점의 높이 ${pct(act.run.res.missRate)}.`
      : `위 수치 띠의 '확인 못 함' ${act.run.res.expiredAlerts}건 · AI가 못 잡은 사건 ${act.run.res.cause.aiMissed}건 때문에 놓침이 ${pct(act.run.res.missRate)}.`)
    : '점에 마우스를 올리면 그 근무의 모니터 벽이 위에 다시 나타납니다.';
  return (
    <div className="gdrawer">
      <svg viewBox={`0 0 ${W} ${H}`} className="gdrawer__svg" role="img" aria-label="놓친 비율 그래프" onPointerLeave={() => onHover?.(null)}>
        <text x={L} y={14} className="g-axis g-axis--title">↑ 놓친 사건 비율</text>
        <text x={W - R} y={H - 2} className="g-axis g-axis--title" textAnchor="end">{mode === 'cameras' ? '카메라 수 →' : '변화 감지 기준값 →'}</text>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={Y(v)} y2={Y(v)} className={v === 0.5 ? 'g-mid' : 'g-grid'} />
            <text x={L - 8} y={Y(v) + 4} className="g-axis" textAnchor="end">{pct(v)}</text>
          </g>
        ))}
        {mode === 'threshold' && <><rect x={L} y={Y(0.1)} width={W - L - R} height={Y(0) - Y(0.1)} className="g-goal" /><text x={W - R - 4} y={Y(0.1) - 4} className="g-goaltxt" textAnchor="end">목표: 놓침 10% 이하</text></>}
        {xTicks.map((t) => <text key={t.label} x={t.x} y={H - 14} className="g-axis" textAnchor="middle">{t.label}</text>)}
        {pts.length > 1 && <polyline points={pts.map((p) => `${p.x},${Y(p.y)}`).join(' ')} className="g-line" />}
        {pts.map((p) => (
          <g key={p.run.id} className="g-pt" onPointerEnter={() => onHover?.(p.run.id)}>
            <circle cx={p.x} cy={Y(p.y)} r={16} className="g-hit" />
            {p.run.id === activeId && <circle cx={p.x} cy={Y(p.y)} r={9} className="g-ring" />}
            <circle cx={p.x} cy={Y(p.y)} r={5} className="g-dot" />
            <text x={p.x} y={Y(p.y) - 11} className="g-val" textAnchor="middle">{pct(p.y)}</text>
          </g>
        ))}
        {act && (() => { const tw = tip(act.run).length * 7.6 + 18, tx = Math.min(W - R - tw, Math.max(L, act.x - tw / 2)), ty = Math.max(2, Y(act.y) - 44); return (
          <g pointerEvents="none"><rect x={tx} y={ty} width={tw} height={20} rx={5} className="g-tipbg" /><text x={tx + 8} y={ty + 14} className="g-tip">{tip(act.run)}</text></g>); })()}
      </svg>
      <p className="gdrawer__read"><b>읽는 법</b>{read}</p>
      <p className="gdrawer__read"><b>장면과의 연결</b>{pts.length ? link : '근무를 돌리면 점이 찍힙니다.'}</p>
    </div>
  );
}

// ── 코드: 노란 칸만 바꿀 수 있음(키보드 입력 없음) ──
export function CodeDrawer({ enabled, operators, ai, threshold, onChange, onRun, running }: {
  enabled: boolean; operators: number; ai: boolean; threshold: number;
  onChange: (v: { operators?: number; ai?: boolean; threshold?: number }) => void; onRun: () => void; running: boolean;
}) {
  if (!enabled) return <div className="cdrawer cdrawer--locked">코드 서랍은 <b>적용</b> 단계에서 열립니다.</div>;
  const step = (cur: number, d: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, cur + d));
  return (
    <div className="cdrawer">
      <pre className="code">
        <span className="c"># 비전 지구 · 관제 설정</span>{'\n'}
        cameras   = 64{'            '}<span className="c"># 고정</span>{'\n'}
        operators = <span className="cell"><button aria-label="요원 수 줄이기" onClick={() => onChange({ operators: step(operators, -1, 1, 8) })}>−</button><b>{operators}</b><button aria-label="요원 수 늘리기" onClick={() => onChange({ operators: step(operators, 1, 1, 8) })}>+</button></span>{'      '}<span className="c"># 요원 수 (1~8)</span>{'\n'}
        ai_assist = <span className="cell cell--toggle"><button onClick={() => onChange({ ai: !ai })}><b>{ai ? 'True' : 'False'}</b></button></span>{'       '}<span className="c"># AI 보조 (True = 켬)</span>{'\n'}
        threshold = <span className="cell"><button aria-label="기준값 내리기" onClick={() => onChange({ threshold: step(threshold, -5, 10, 90) })}>−</button><b>{threshold}</b><button aria-label="기준값 올리기" onClick={() => onChange({ threshold: step(threshold, 5, 10, 90) })}>+</button></span>{'     '}<span className="c"># 변화 감지 기준값 (10~90, 5 단위)</span>{'\n'}{'\n'}
        result = run_shift(cameras, operators, ai_assist, threshold)
      </pre>
      <button className="run-btn" onClick={onRun} disabled={running}>{running ? '근무 중…' : '실행 ▶'}</button>
    </div>
  );
}

// ── 기록: 시스템 기록만(해설 없음) ──
export function LogDrawer({ runs }: { runs: Run[] }) {
  if (!runs.length) return <div className="ldrawer ldrawer--empty">아직 기록이 없습니다.</div>;
  return (
    <ol className="ldrawer">
      {[...runs].reverse().map((r) => (
        <li key={r.id}>
          <b>#{r.id}</b> 카메라 {r.p.cameras} · 요원 {r.p.operators} · AI {r.p.aiAssist ? `켬 · 기준값 ${r.p.threshold}` : '끔'}
          {r.done
            ? <> → 사건 {r.res.events} · 찾음 {r.res.detected} · 놓침 {r.res.missed} ({pct(r.res.missRate)}){r.p.aiAssist ? ` · 알림 ${r.res.alerts} · 헛알림 ${r.res.falseAlerts} · 확인 못 함 ${r.res.expiredAlerts}` : ''}</>
            : <> → 근무 중</>}
        </li>
      ))}
    </ol>
  );
}
