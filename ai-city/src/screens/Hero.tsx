// author: eduino
// 첫 화면(A안): 주인공은 'AI 코어' 하나. 7개 학습 지구는 코어 둘레 궤도를 도는 작은 빛 점 — 마우스를 올린 점만 지구 색 · 이름이 켜지고 코어도 그 색으로 물든다.
// 왼쪽 아래: 제목 2줄 + 버튼 1개. 스크롤 아래 두 번째 화면에서 학습 루프 · 7개 지구 카드.
// 처음 접속하면 화면이 스스로 조립되는 시네마틱 인트로(약 8초, 건너뛰기 가능). 움직임 줄이기 설정이면 완성된 화면만.
import { useEffect, useMemo, useRef, useState } from 'react';
import { DISTRICTS } from '../data/districts';
import { NeuralMap } from '../components/NeuralMap';
import { TopBar } from '../components/TopBar';
import { MagneticButton } from '../components/Interactive';
import { useCanvas } from '../motion/useCanvas';
import { createCore } from '../motion/core';
import { READY } from './Brief';

const KEY = 'ai_labcity_intro_v1', END = 8.2;
const REDUCE = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const seen = () => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } };
const LOOP = [['SEE', '원리를 눈으로 보고'], ['BUILD', '규칙과 모델을 만들고'], ['TRAIN', '직접 학습시키고'], ['SOLVE', '도시의 사건을 해결']];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const N = DISTRICTS.length;

// 인트로: 길게 누르면(또는 스페이스바) 흩어진 데이터 점이 모여 AI 코어가 깨어난다. 손을 떼면 다시 흩어짐.
// 다 모이면(충전 100%) 충격파와 함께 받침대 · 궤도 · 제목이 차례로 켜진다. 글 설명 없이 상호작용만으로.
const ASSEMBLE = 5.6;
function useIntro() {
  const [t, setT] = useState(() => (REDUCE || seen() ? END : 0));
  const [charge, setCharge] = useState(0), [boom, setBoom] = useState(false);
  const tRef = useRef(t); tRef.current = t;
  const down = useRef(false), k = useRef(0), phase = useRef<'hold' | 'reveal'>('hold');
  useEffect(() => {
    if (t >= END) return;
    let raf = 0, last = performance.now(), t0 = 0;
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (phase.current === 'hold') {
        k.current = Math.max(0, Math.min(1, k.current + (down.current ? dt / 1.7 : -dt / 2.6)));
        setCharge(k.current); setT(k.current * ASSEMBLE);
        if (k.current >= 1) { phase.current = 'reveal'; t0 = now - ASSEMBLE * 1000; setBoom(true); }
      } else {
        const v = (now - t0) / 1000; setT(v);
        if (v >= END) { try { localStorage.setItem(KEY, '1'); } catch { /* 저장 안 되면 다음에도 인트로 */ } return; }
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    const kd = (e: KeyboardEvent) => { if (e.code === 'Space') { e.preventDefault(); down.current = true; } };
    const ku = (e: KeyboardEvent) => { if (e.code === 'Space') down.current = false; };
    window.addEventListener('keydown', kd); window.addEventListener('keyup', ku);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('keydown', kd); window.removeEventListener('keyup', ku); };
  }, [t >= END]); // eslint-disable-line react-hooks/exhaustive-deps
  return {
    t, tRef, charge, boom, holding: phase.current === 'hold' && t < END,
    press: (v: boolean) => { down.current = v; },
    skip: () => { phase.current = 'reveal'; setT(END); try { localStorage.setItem(KEY, '1'); } catch { /* */ } },
    replay: () => { k.current = 0; phase.current = 'hold'; setBoom(false); setCharge(0); setT(0); }
  };
}

function Core({ tRef, tintRef }: { tRef: { current: number }; tintRef: { current: string | null } }) {
  const draw = useMemo(() => createCore(() => clamp(tRef.current / 5.6), () => tintRef.current), [tRef, tintRef]);
  const ref = useCanvas(draw, { fps: 30, essential: !REDUCE });
  return <canvas ref={ref} className="core__cv" aria-hidden="true" />;
}

// 궤도: 점 7개의 위치를 매 프레임 직접 옮김(리액트 다시 그리기 없이). 마우스를 올리면 궤도가 거의 멈춤.
function Orbit({ hover, setHover, onEnter, show }: { hover: number | null; setHover: (i: number | null) => void; onEnter: (id: string) => void; show: (i: number) => number }) {
  const box = useRef<HTMLDivElement>(null), dots = useRef<(HTMLButtonElement | null)[]>([]);
  const hv = useRef(hover); hv.current = hover;
  const sh = useRef(show); sh.current = show;
  useEffect(() => {
    let raf = 0, a = -Math.PI / 2, last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      if (!REDUCE) a += dt * (hv.current === null ? 0.12 : 0.012);
      const el = box.current; if (el) {
        const w = el.clientWidth, h = el.clientHeight, rx = w / 2, ry = h / 2;
        dots.current.forEach((d, i) => {
          if (!d) return; const th = a + (i / N) * Math.PI * 2, x = rx + Math.cos(th) * rx, y = ry + Math.sin(th) * ry, front = Math.sin(th) > -0.15;
          const s = (front ? 1 : 0.7) * (0.4 + 0.6 * sh.current(i));
          d.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) scale(${s})`;
          d.style.zIndex = front ? '4' : '1'; d.style.opacity = String(sh.current(i) * (front ? 1 : 0.45));
          d.dataset.side = x > rx ? 'r' : 'l';
        });
      }
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step); return () => cancelAnimationFrame(raf);
  }, []);
  return (
    <div className="orbit" ref={box}>
      <svg className="orbit__ring" style={{ opacity: show(0) }} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="50" rx="49.8" ry="49.4" /></svg>
      {DISTRICTS.map((d, i) => (
        <button key={d.id} ref={(el) => { dots.current[i] = el; }} className={`node ${hover === i ? 'is-on' : ''}`} style={{ ['--k' as string]: d.color }}
          aria-label={`${d.order} ${d.tech}`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => onEnter(d.id)}>
          <i />
          <span className="node__tip"><b>{d.district} · {d.tech}</b><em>{d.order} · {d.site} · {d.open ? `${READY.length}차시 열림` : '준비 중'}</em></span>
        </button>
      ))}
    </div>
  );
}

export function Hero({ onEnter }: { onEnter: (id?: string) => void }) {
  const { t, tRef, skip, replay, charge, boom, holding, press } = useIntro();
  const [cur, setCur] = useState({ x: -100, y: -100 });
  const intro = t < END;
  const [hover, setHover] = useState<number | null>(null);
  const tintRef = useRef<string | null>(null); tintRef.current = hover !== null ? DISTRICTS[hover].color : null;
  const vis = (a: number, b = a + 0.9) => (intro ? clamp((t - a) / (b - a)) : 1);
  const fade = (a: number, b?: number) => ({ opacity: vis(a, b), transform: `translateY(${(1 - vis(a, b)) * 14}px)` });
  const more = useRef<HTMLDivElement>(null);
  const [mapHover, setMapHover] = useState<string | null>(null), mapD = DISTRICTS.find((x) => x.id === mapHover) ?? null;
  return (
    <section className={`screen h3 ${intro ? 'is-intro' : ''} ${holding ? 'is-hold' : ''}`} style={{ ['--charge' as string]: charge }}
      onPointerDown={(e) => { if (holding && !(e.target as HTMLElement).closest('button')) press(true); }} onPointerUp={() => press(false)} onPointerCancel={() => press(false)}
      onPointerMove={(e) => { if (holding) setCur({ x: e.clientX, y: e.clientY }); }} onPointerLeave={() => press(false)}>
      <div className="h3__first">
        <div className="h3__bg" aria-hidden="true" />
        <div style={{ opacity: vis(6.6) }}><TopBar right={<button className="btn btn--ghost" disabled>교사용 안내</button>} /></div>

        <div className="core">
          <img className="core__ped" src="assets/core_pedestal.webp" alt="" style={{ opacity: vis(3.4, 5.2) }} />
          <Core tRef={tRef} tintRef={tintRef} />
          <Orbit hover={hover} setHover={setHover} onEnter={(id) => onEnter(id)} show={(i) => vis(5.6 + i * 0.12, 6.2 + i * 0.12)} />
          {boom && t < END && <span className="core__boom" />}
        </div>

        <div className="h3__copy">
          <p className="h3__eyebrow" style={fade(6.5)}>EDUINO · AI LabCity</p>
          <h1 className="h3__h" style={fade(6.7, 7.5)}>AI를 쓰는 사람에서<br /><em>AI를 만드는 사람으로.</em></h1>
          <div className="h3__cta" style={{ ...fade(7.2, 8.0), pointerEvents: intro && t < 7.2 ? 'none' : undefined }}>
            <MagneticButton className="btn btn--primary h3__go" onClick={() => onEnter()}>입장하기 →</MagneticButton>
            <button className="h3__link" onClick={replay}>인트로 다시 보기</button>
          </div>
        </div>

        <p className="h3__hint" style={{ opacity: hover === null ? vis(7.6) : 0 }}>궤도의 빛 점 = 7개 Lab · 마우스를 올려 보세요</p>
        <button className="h3__down" style={{ opacity: vis(7.8) }} onClick={() => more.current?.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' })}>7개 Lab 둘러보기 ↓</button>
        {holding && <>
          <svg className="charge" style={{ left: cur.x, top: cur.y }} viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="24" className="charge__bg" /><circle cx="30" cy="30" r="24" className="charge__fg" style={{ strokeDashoffset: 151 * (1 - charge) }} /></svg>
          <p className="h3__press">{charge > 0.02 ? `${Math.round(charge * 100)}%` : '화면을 길게 눌러 AI를 깨우세요'}<small>스페이스바를 눌러도 됩니다</small></p>
        </>}
        {intro && <button className="h3__skip" onClick={skip}>건너뛰기 ▸</button>}
      </div>

      <div className="h3__more" ref={more}>
        <p className="h3__eyebrow">HOW YOU LEARN</p>
        <h2 className="h3__h2">보고, 만들고, 학습시키고, 해결합니다.</h2>
        <ol className="h3__loop">{LOOP.map(([en, ko], i) => <li key={en}><span>0{i + 1}</span><b>{en}</b><em>{ko}</em></li>)}</ol>
        <div className="h3__net">
          <NeuralMap active={mapHover} onHover={setMapHover} onPick={(id) => onEnter(id)} />
          <p className="h3__netcap">{mapD ? <><b style={{ color: mapD.color }}>{mapD.order} · {mapD.district} · {mapD.tech}</b> — {mapD.site}: {mapD.problem} <em>{mapD.open ? `${READY.length}차시 열림 · 눌러서 들어가기` : '준비 중'}</em></> : '뉴런에 마우스를 올려 7개 Lab을 살펴보세요. Foundation Lab(입력)에서 시작해 기술 Lab(은닉)을 지나 도시의 사건(출력)을 해결합니다.'}</p>
        </div>
        <p className="src-line h3__src">코어 · 궤도 · 지구 모션은 코드로 생성한 추상 모션, 받침대는 직접 렌더</p>
      </div>
    </section>
  );
}
