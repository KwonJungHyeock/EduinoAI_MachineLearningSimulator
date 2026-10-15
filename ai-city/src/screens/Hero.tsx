// author: eduino
// 첫 화면: 'AI 코어'(뇌 모양 신경망 홀로그램 + 렌더한 받침대)에서 빛 회로가 뻗어 7개 학습 지구 유리 패널로 이어진다.
// 처음 접속하면 화면이 스스로 조립되는 시네마틱 인트로(약 9초, 건너뛰기 가능). 움직임 줄이기 설정이면 완성된 화면만.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { DISTRICTS } from '../data/districts';
import { MotifCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { MagneticButton } from '../components/Interactive';
import { useCanvas } from '../motion/useCanvas';
import { createCore } from '../motion/core';

const KEY = 'ai_labcity_intro_v1', END = 9.2;
const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const CAPS: [number, number, string][] = [[0.5, 2.3, 'AI는 데이터를 봅니다'], [2.3, 4.1, '스스로 규칙을 찾고'], [4.1, 5.9, '도시의 문제를 풉니다']];
const clamp = (x: number) => Math.max(0, Math.min(1, x));

function useIntro() {
  const [t, setT] = useState(() => (REDUCE || seen() ? END : 0));
  const tRef = useRef(t); tRef.current = t;
  useEffect(() => {
    if (t >= END) return;
    let raf = 0; const t0 = performance.now() - t * 1000;
    const step = (now: number) => { const v = (now - t0) / 1000; setT(v); if (v < END) raf = requestAnimationFrame(step); else { try { localStorage.setItem(KEY, '1'); } catch { /* 저장 안 되면 다음에도 인트로 */ } } };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, [t >= END]); // eslint-disable-line react-hooks/exhaustive-deps
  return { t, tRef, skip: () => { setT(END); try { localStorage.setItem(KEY, '1'); } catch { /* */ } }, replay: () => setT(0) };
}

function Core({ tRef }: { tRef: { current: number } }) {
  const draw = useMemo(() => createCore(() => clamp(tRef.current / 5.6)), [tRef]);
  const ref = useCanvas(draw, { fps: 30, essential: !REDUCE });
  return <canvas ref={ref} className="core__cv" aria-hidden="true" />;
}

export function Hero({ onEnter }: { onEnter: (id?: string) => void }) {
  const { t, tRef, skip, replay } = useIntro();
  const intro = t < END;
  const root = useRef<HTMLElement>(null), coreRef = useRef<HTMLDivElement>(null), panelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [paths, setPaths] = useState<{ d: string; color: string; len: number }[]>([]);
  // 코어 → 패널 빛 회로(직각으로 꺾이는 선) — 화면 크기가 바뀌면 다시 계산
  useLayoutEffect(() => {
    const calc = () => {
      const r = root.current?.getBoundingClientRect(), c = coreRef.current?.getBoundingClientRect(); if (!r || !c || r.width < 1100) { setPaths([]); return; }
      const sx = c.left + c.width / 2 - r.left, sy = c.top + c.height * 0.46 - r.top;
      setPaths(panelRefs.current.map((el, i) => {
        if (!el) return null; const b = el.getBoundingClientRect(), ex = b.left - r.left, ey = b.top + b.height / 2 - r.top;
        const mx = sx + (ex - sx) * (0.45 + (i % 2) * 0.12), d = `M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ey} L ${ex} ${ey}`;
        return { d, color: DISTRICTS[i].color, len: Math.abs(mx - sx) + Math.abs(ey - sy) + Math.abs(ex - mx) };
      }).filter(Boolean) as { d: string; color: string; len: number }[]);
    };
    calc(); window.addEventListener('resize', calc); const id = setTimeout(calc, 400);
    return () => { window.removeEventListener('resize', calc); clearTimeout(id); };
  }, []);
  // 마우스 위치로 패널 무리를 살짝 기울임
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: PointerEvent) => { const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 }); };

  const vis = (a: number, b = a + 0.9) => (intro ? clamp((t - a) / (b - a)) : 1);
  const cap = CAPS.find(([a, b]) => t >= a && t < b);
  return (
    <section ref={root} className={`screen hero2 ${intro ? 'is-intro' : ''}`} onPointerMove={onMove}>
      <div className="hero2__bg" aria-hidden="true" />
      <div style={{ opacity: vis(7.2) }}><TopBar right={<button className="btn btn--ghost" disabled>교사용 안내</button>} /></div>

      <div className="hero2__copy">
        <p className="hero2__eyebrow" style={{ opacity: vis(7.0) }}>EDUINO · AI LABCITY</p>
        <h1 className="hero2__h" style={{ opacity: vis(7.2, 8.0), transform: `translateY(${(1 - vis(7.2, 8.0)) * 18}px)` }}>
          AI를 쓰는 사람에서<br /><em>AI를 만드는<br />사람으로.</em>
        </h1>
        <p className="hero2__sub" style={{ opacity: vis(7.7, 8.5) }}>공통 기초와 6개의 기술 트랙. 원리를 눈으로 보고, 모델을 직접 학습시키고, 도시의 사건을 해결합니다.</p>
        <div className="hero2__cta" style={{ opacity: vis(8.2, 9.0), pointerEvents: intro && t < 8.2 ? 'none' : undefined }}>
          <MagneticButton className="btn btn--primary hero2__go" onClick={() => onEnter()}>랩시티 입장</MagneticButton>
          <button className="btn btn--ghost" onClick={replay}>인트로 다시 보기</button>
        </div>
        <p className="hero2__mono" style={{ opacity: vis(8.4) }}>SIMULATION-BASED AI COURSE<br />7 DISTRICTS · BUILD · TRAIN · SOLVE</p>
      </div>

      <div className="core" ref={coreRef}>
        <img className="core__ped" src="assets/core_pedestal.webp" alt="" style={{ opacity: vis(3.4, 5.2) }} />
        <Core tRef={tRef} />
        {cap && <p className="core__cap" key={cap[2]}>{cap[2]}</p>}
      </div>

      <svg className="circuit" aria-hidden="true">
        <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {paths.map((p, i) => { const k = vis(5.6 + i * 0.22, 6.6 + i * 0.22); return (
          <g key={i} filter="url(#glow)">
            <path d={p.d} className="circuit__base" style={{ stroke: p.color, strokeDasharray: p.len, strokeDashoffset: p.len * (1 - k) }} />
            {k >= 1 && <path d={p.d} className="circuit__pulse" style={{ stroke: p.color, animationDelay: `${i * 0.35}s` }} />}
          </g>); })}
      </svg>

      <nav className="stack" aria-label="학습 지구" style={{ transform: `perspective(1400px) rotateY(${-14 + tilt.x * 6}deg) rotateX(${6 - tilt.y * 4}deg)` }}>
        {DISTRICTS.map((d, i) => { const k = vis(5.9 + i * 0.22, 6.8 + i * 0.22); return (
          <button key={d.id} ref={(el) => { panelRefs.current[i] = el; }} className={`glass ${i % 2 ? 'glass--r' : ''}`} style={{ ['--k' as string]: d.color, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }} onClick={() => onEnter(d.id)}>
            <span className="glass__no">{String(i).padStart(2, '0')}<i>{d.order}</i></span>
            <span className="glass__t">{d.tech}</span>
            <span className="glass__e">{d.techEn}</span>
            <span className="glass__k">{d.keywords.slice(0, 2).join(' · ')}</span>
            <MotifCanvas motif={d.motif} color={d.color} className="glass__cv" fps={24} />
            <span className={`glass__st ${d.open ? 'on' : ''}`}>{d.open ? '입장 가능' : '준비 중'}</span>
          </button>); })}
      </nav>

      {intro && <button className="hero2__skip" onClick={skip}>건너뛰기 ▸</button>}
      <p className="src-line hero2__src" style={{ opacity: vis(8.6) }}>코어 · 회로는 코드로 생성한 추상 모션, 받침대는 직접 렌더 · 마우스를 움직이거나 눌러 보세요</p>
    </section>
  );
}
