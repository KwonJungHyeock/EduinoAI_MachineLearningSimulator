// author: eduino
// 첫 화면: 'AI 코어'(뇌 모양 신경망 홀로그램 + 렌더한 받침대)에서 빛 회로가 뻗어 7개 학습 지구 유리 패널로 이어진다.
// 왼쪽: 제목 · 학습 루프(보기 → 만들기 → 학습 → 해결) · 지구 미리보기 카드. 패널에 마우스를 올리면(또는 자동 순회) 카드 · 회로 · 코어 색이 그 지구로 바뀐다.
// 처음 접속하면 화면이 스스로 조립되는 시네마틱 인트로(약 9초, 건너뛰기 가능). 움직임 줄이기 설정이면 완성된 화면만.
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { DISTRICTS } from '../data/districts';
import { MotifCanvas, PatternCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { MagneticButton, spot } from '../components/Interactive';
import { useCanvas } from '../motion/useCanvas';
import { createCore } from '../motion/core';
import { READY } from './Brief';

const KEY = 'ai_labcity_intro_v1', END = 9.2;
const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const CAPS: [number, number, string][] = [[0.5, 2.3, 'AI는 데이터를 봅니다'], [2.3, 4.1, '스스로 규칙을 찾고'], [4.1, 5.9, '도시의 문제를 풉니다']];
const LOOP = [['SEE', '원리를 눈으로'], ['BUILD', '규칙 · 모델 만들기'], ['TRAIN', '직접 학습시키기'], ['SOLVE', '도시 사건 해결']];
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

function Core({ tRef, tintRef }: { tRef: { current: number }; tintRef: { current: string | null } }) {
  const draw = useMemo(() => createCore(() => clamp(tRef.current / 5.6), () => tintRef.current), [tRef, tintRef]);
  const ref = useCanvas(draw, { fps: 30, essential: !REDUCE });
  return <canvas ref={ref} className="core__cv" aria-hidden="true" />;
}

export function Hero({ onEnter }: { onEnter: (id?: string) => void }) {
  const { t, tRef, skip, replay } = useIntro();
  const intro = t < END;
  const root = useRef<HTMLElement>(null), coreRef = useRef<HTMLDivElement>(null), panelRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [paths, setPaths] = useState<{ d: string; color: string; len: number }[]>([]);
  // 강조 지구: 마우스가 올라간 패널, 없으면 4초마다 자동 순회
  const [hover, setHover] = useState<number | null>(null), [auto, setAuto] = useState(1);
  useEffect(() => { if (intro || hover !== null || REDUCE) return; const id = setInterval(() => setAuto((a) => (a + 1) % DISTRICTS.length), 4000); return () => clearInterval(id); }, [intro, hover]);
  const focus = intro ? null : hover ?? auto, fd = focus !== null ? DISTRICTS[focus] : null;
  const tintRef = useRef<string | null>(null); tintRef.current = hover !== null ? DISTRICTS[hover].color : null;
  // 코어 → 패널 빛 회로(직각으로 꺾이는 선) — 화면 크기가 바뀌면 다시 계산
  useLayoutEffect(() => {
    const calc = () => {
      const r = root.current?.getBoundingClientRect(), c = coreRef.current?.getBoundingClientRect(); if (!r || !c || r.width <= 1100) { setPaths([]); return; }
      const sx = c.left + c.width / 2 - r.left, sy = c.top + c.height * 0.3 - r.top;
      setPaths(panelRefs.current.map((el, i) => {
        if (!el) return null; const b = el.getBoundingClientRect(), ex = b.left - r.left, ey = b.top + b.height / 2 - r.top;
        const mx = sx + (ex - sx) * (0.45 + (i % 2) * 0.12), d = `M ${sx} ${sy} L ${mx} ${sy} L ${mx} ${ey} L ${ex} ${ey}`;
        return { d, color: DISTRICTS[i].color, len: Math.abs(mx - sx) + Math.abs(ey - sy) + Math.abs(ex - mx) };
      }).filter(Boolean) as { d: string; color: string; len: number }[]);
    };
    calc(); window.addEventListener('resize', calc); const id = setTimeout(calc, 400);
    return () => { window.removeEventListener('resize', calc); clearTimeout(id); };
  }, []);
  // 마우스 위치로 패널 무리를 살짝 기울이고, 제목 빛 그라데이션이 커서를 따라감
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const onMove = (e: PointerEvent<HTMLElement>) => { const r = e.currentTarget.getBoundingClientRect(); setTilt({ x: (e.clientX - r.left) / r.width - 0.5, y: (e.clientY - r.top) / r.height - 0.5 }); };

  const vis = (a: number, b = a + 0.9) => (intro ? clamp((t - a) / (b - a)) : 1);
  const cap = CAPS.find(([a, b]) => t >= a && t < b);
  const fade = (a: number, b?: number) => ({ opacity: vis(a, b), transform: `translateY(${(1 - vis(a, b)) * 14}px)` });
  return (
    <section ref={root} className={`screen hero2 ${intro ? 'is-intro' : ''}`} onPointerMove={onMove} style={{ ['--fx' as string]: `${50 + tilt.x * 60}%`, ['--k' as string]: fd?.color ?? '#818cf8' }}>
      <div className="hero2__bg" aria-hidden="true" />
      <PatternCanvas color={fd?.color ?? '#818cf8'} className="hero2__dots" />
      <div style={{ opacity: vis(7.2) }}><TopBar right={<button className="btn btn--ghost" disabled>교사용 안내</button>} /></div>

      <div className="hero2__copy">
        <div className="hero2__eyebrow" style={fade(7.0)}><b>EDUINO</b><i />AI LabCity<span>SIMULATION-BASED AI COURSE</span></div>
        <h1 className="hero2__h" style={fade(7.2, 8.0)}>AI를 쓰는 사람에서<br /><em>AI를 만드는 사람으로.</em></h1>
        <p className="hero2__sub" style={fade(7.6, 8.4)}>공통 기초와 6개의 기술 트랙. 원리를 눈으로 보고, 모델을 직접 학습시키고, 도시의 사건을 해결합니다.</p>

        <ol className="loop" style={fade(7.9, 8.7)}>
          {LOOP.map(([en, ko], i) => <li key={en} onPointerMove={spot} style={{ animationDelay: `${i * 0.6}s` }}><span>0{i + 1}</span><b>{en}</b><em>{ko}</em></li>)}
        </ol>

        <div className="peek" style={fade(8.1, 8.9)} onPointerMove={spot}>
          {fd && <div className="peek__in" key={fd.id}>
            <p className="peek__tag"><i />{fd.order} · {fd.district}<span className={fd.open ? 'on' : ''}>{fd.open ? `${READY.length}차시 열림` : '준비 중'}</span></p>
            <p className="peek__t">{fd.tech} <small>{fd.techEn}</small></p>
            <p className="peek__p"><b>{fd.site}</b> — {fd.problem}</p>
          </div>}
          <div className="peek__dots">{DISTRICTS.map((d, i) => <button key={d.id} aria-label={`${d.tech} 미리보기`} className={i === focus ? 'on' : ''} style={{ ['--k' as string]: d.color }} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => onEnter(d.id)} />)}</div>
        </div>

        <div className="hero2__cta" style={{ ...fade(8.3, 9.0), pointerEvents: intro && t < 8.3 ? 'none' : undefined }}>
          <MagneticButton className="btn btn--primary hero2__go" onClick={() => onEnter()}>AI LabCity 입장 →</MagneticButton>
          <button className="btn btn--ghost" onClick={replay}>인트로 다시 보기</button>
        </div>
      </div>

      <div className="core" ref={coreRef}>
        <img className="core__ped" src="assets/core_pedestal.webp" alt="" style={{ opacity: vis(3.4, 5.2) }} />
        <Core tRef={tRef} tintRef={tintRef} />
        {cap && <p className="core__cap" key={cap[2]}>{cap[2]}</p>}
      </div>

      <svg className="circuit" aria-hidden="true">
        <defs><filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
        {paths.map((p, i) => { const k = vis(5.6 + i * 0.22, 6.6 + i * 0.22), on = focus === i, dim = focus !== null && !on; return (
          <g key={i} filter="url(#glow)" className={`circuit__g ${on ? 'on' : ''} ${dim ? 'dim' : ''}`}>
            <path d={p.d} className="circuit__base" style={{ stroke: p.color, strokeDasharray: p.len, strokeDashoffset: p.len * (1 - k) }} />
            {k >= 1 && <path d={p.d} className="circuit__pulse" style={{ stroke: p.color, animationDelay: `${i * 0.35}s` }} />}
          </g>); })}
      </svg>

      <nav className="stack" aria-label="학습 지구" style={{ transform: `perspective(1400px) rotateY(${-14 + tilt.x * 6}deg) rotateX(${6 - tilt.y * 4}deg)` }}>
        {DISTRICTS.map((d, i) => { const k = vis(5.9 + i * 0.22, 6.8 + i * 0.22); return (
          <button key={d.id} ref={(el) => { panelRefs.current[i] = el; }} className={`glass ${i % 2 ? 'glass--r' : ''} ${focus === i ? 'is-on' : ''}`} style={{ ['--k' as string]: d.color, opacity: k, transform: `translateY(${(1 - k) * 24}px)` }}
            onClick={() => onEnter(d.id)} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onPointerMove={spot}>
            <span className="glass__no">{String(i).padStart(2, '0')}<i>{d.order}</i></span>
            <span className="glass__t">{d.tech}</span>
            <span className="glass__e">{d.techEn}</span>
            <span className="glass__k">{d.keywords.slice(0, 2).join(' · ')}</span>
            <MotifCanvas motif={d.motif} color={d.color} className="glass__cv" fps={24} />
            <span className={`glass__st ${d.open ? 'on' : ''}`}>{d.open ? '입장 가능' : '준비 중'}</span>
          </button>); })}
      </nav>

      {intro && <button className="hero2__skip" onClick={skip}>건너뛰기 ▸</button>}
      <p className="src-line hero2__src" style={{ opacity: vis(8.6) }}>코어 · 회로 · 점 격자는 코드로 생성한 추상 모션, 받침대는 직접 렌더 · 패널에 마우스를 올려 보세요</p>
    </section>
  );
}
