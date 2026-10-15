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
const CAPS: [number, number, string][] = [[0.5, 2.3, 'AI는 데이터를 봅니다'], [2.3, 4.1, '스스로 규칙을 찾고'], [4.1, 5.9, '도시의 문제를 풉니다']];
const LOOP = [['SEE', '원리를 눈으로 보고'], ['BUILD', '규칙과 모델을 만들고'], ['TRAIN', '직접 학습시키고'], ['SOLVE', '도시의 사건을 해결']];
const clamp = (x: number) => Math.max(0, Math.min(1, x));
const N = DISTRICTS.length;

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
      <svg className="orbit__ring" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><ellipse cx="50" cy="50" rx="49.8" ry="49.4" /></svg>
      {DISTRICTS.map((d, i) => (
        <button key={d.id} ref={(el) => { dots.current[i] = el; }} className={`node ${hover === i ? 'is-on' : ''}`} style={{ ['--k' as string]: d.color }}
          aria-label={`${d.order} ${d.tech}`} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => onEnter(d.id)}>
          <i />
          <span className="node__tip"><b>{String(i).padStart(2, '0')} · {d.tech}</b><em>{d.site} · {d.open ? `${READY.length}차시 열림` : '준비 중'}</em></span>
        </button>
      ))}
    </div>
  );
}

export function Hero({ onEnter }: { onEnter: (id?: string) => void }) {
  const { t, tRef, skip, replay } = useIntro();
  const intro = t < END;
  const [hover, setHover] = useState<number | null>(null);
  const tintRef = useRef<string | null>(null); tintRef.current = hover !== null ? DISTRICTS[hover].color : null;
  const vis = (a: number, b = a + 0.9) => (intro ? clamp((t - a) / (b - a)) : 1);
  const fade = (a: number, b?: number) => ({ opacity: vis(a, b), transform: `translateY(${(1 - vis(a, b)) * 14}px)` });
  const cap = CAPS.find(([a, b]) => t >= a && t < b);
  const more = useRef<HTMLDivElement>(null);
  const [mapHover, setMapHover] = useState<string | null>(null), mapD = DISTRICTS.find((x) => x.id === mapHover) ?? null;
  return (
    <section className={`screen h3 ${intro ? 'is-intro' : ''}`}>
      <div className="h3__first">
        <div className="h3__bg" aria-hidden="true" />
        <div style={{ opacity: vis(6.6) }}><TopBar right={<button className="btn btn--ghost" disabled>교사용 안내</button>} /></div>

        <div className="core">
          <img className="core__ped" src="assets/core_pedestal.webp" alt="" style={{ opacity: vis(3.4, 5.2) }} />
          <Core tRef={tRef} tintRef={tintRef} />
          <Orbit hover={hover} setHover={setHover} onEnter={(id) => onEnter(id)} show={(i) => vis(5.6 + i * 0.12, 6.2 + i * 0.12)} />
          {cap && <p className="core__cap" key={cap[2]}>{cap[2]}</p>}
        </div>

        <div className="h3__copy">
          <p className="h3__eyebrow" style={fade(6.5)}>EDUINO · AI LabCity</p>
          <h1 className="h3__h" style={fade(6.7, 7.5)}>AI를 쓰는 사람에서<br /><em>AI를 만드는 사람으로.</em></h1>
          <div className="h3__cta" style={{ ...fade(7.2, 8.0), pointerEvents: intro && t < 7.2 ? 'none' : undefined }}>
            <MagneticButton className="btn btn--primary h3__go" onClick={() => onEnter()}>입장하기 →</MagneticButton>
            <button className="h3__link" onClick={replay}>인트로 다시 보기</button>
          </div>
        </div>

        <p className="h3__hint" style={{ opacity: hover === null ? vis(7.6) : 0 }}>궤도의 빛 점 = 7개 학습 지구 · 마우스를 올려 보세요</p>
        <button className="h3__down" style={{ opacity: vis(7.8) }} onClick={() => more.current?.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' })}>7개 지구 둘러보기 ↓</button>
        {intro && <button className="h3__skip" onClick={skip}>건너뛰기 ▸</button>}
      </div>

      <div className="h3__more" ref={more}>
        <p className="h3__eyebrow">HOW YOU LEARN</p>
        <h2 className="h3__h2">보고, 만들고, 학습시키고, 해결합니다.</h2>
        <ol className="h3__loop">{LOOP.map(([en, ko], i) => <li key={en}><span>0{i + 1}</span><b>{en}</b><em>{ko}</em></li>)}</ol>
        <div className="h3__net">
          <NeuralMap active={mapHover} onHover={setMapHover} onPick={(id) => onEnter(id)} />
          <p className="h3__netcap">{mapD ? <><b style={{ color: mapD.color }}>{mapD.order} · {mapD.tech}</b> — {mapD.site}: {mapD.problem} <em>{mapD.open ? `${READY.length}차시 열림 · 눌러서 들어가기` : '준비 중'}</em></> : '뉴런에 마우스를 올려 7개 지구를 살펴보세요. 공통 기초(입력)에서 시작해 기술 트랙(은닉)을 지나 도시의 사건(출력)을 해결합니다.'}</p>
        </div>
        <p className="src-line h3__src">코어 · 궤도 · 지구 모션은 코드로 생성한 추상 모션, 받침대는 직접 렌더</p>
      </div>
    </section>
  );
}
