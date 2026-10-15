// author: eduino
// Lab 선택 = 학습 로드맵 신경망(components/Roadmap). 왼쪽: Foundation Lab 8차시 → 기초 수료 → 6개 Lab, 가로축 = 난이도.
// 오른쪽: 고른 뉴런의 정보(원 안에서 그 기술의 원리 모션이 '활성화'됨) — 상자 없이 글자로만.
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { DISTRICTS } from '../data/districts';
import { MotifCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { MagneticButton } from '../components/Interactive';
import { Roadmap } from '../components/Roadmap';
import { load, lesson } from '../store/progress';
import { VISION_LESSONS } from '../data/districts';
import { READY } from './Brief';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Select({ selected, onSelect, onEnter, onHome, onLesson }: {
  selected: string; onSelect: (id: string) => void; onEnter: (id: string) => void; onHome: () => void; onLesson?: (lab: string, n: number) => void;
}) {
  // 오른쪽 정보 · 버튼은 '누른 것'만 따라감(마우스가 지나가는 뉴런으로 바뀌지 않게). 지나가는 뉴런은 지도 아래 미리보기 한 줄로.
  const d = DISTRICTS.find((x) => x.id === selected) ?? DISTRICTS[0];
  const sel = DISTRICTS.find((x) => x.id === selected) ?? DISTRICTS[0];

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const i = DISTRICTS.findIndex((x) => x.id === selected);
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') onSelect(DISTRICTS[(i + 1) % DISTRICTS.length].id);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') onSelect(DISTRICTS[(i - 1 + DISTRICTS.length) % DISTRICTS.length].id);
      if (e.key === 'Enter' && sel.open && !(e.target instanceof SVGElement)) onEnter(sel.id);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [selected, sel, onSelect, onEnter]);

  return (
    <section className="screen sel2" style={{ ['--k' as string]: d.color }}>
      <div className="sel2__bg" aria-hidden="true" />
      <TopBar crumb="학습 로드맵 · Lab 선택" onHome={onHome} right={<button className="btn btn--ghost" disabled>교사 모드</button>} />
      <div className="sel2__body">
        <div className="sel2__map">
          <p className="sel2__eye">LEARNING ROADMAP</p>
          <h1 className="sel2__q">기초에서 시작해, <em>원하는 Lab</em>으로.</h1>
          <div className="sel2__scroll"><Roadmap selected={selected} onSelect={onSelect} onLesson={onLesson} ready={READY} /></div>
          <p className="sel2__how">오른쪽으로 갈수록 어려워집니다 · 뉴런 = 차시 · 채운 뉴런 = 완료 · 퍼지는 고리 = 다음 학습(누르면 바로 시작)</p>
        </div>
        <motion.aside key={d.id} className="sel2__info" initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, ease: EASE }}>
          <div className="act">
            <MotifCanvas motif={d.motif} color={d.color} className="act__cv" />
            <span className="act__ring" /><span className="act__ring act__ring--2" />
          </div>
          <p className="eyebrow eyebrow--key">{d.order} · {d.district}</p>
          <h2 className="sel2__t">{d.tech}</h2>
          <p className="sel2__en">{d.techEn}</p>
          <dl className="sel2__dl">
            <dt>배우는 기술</dt><dd>{d.keywords.join('  ·  ')}</dd>
            <dt>해결할 사건</dt><dd>{d.situations.map((s, i) => <span key={s}><b>CASE {String(i + 1).padStart(2, '0')}</b>{s}</span>)}</dd>
            <dt>현장 · 역할</dt><dd>{d.site} — {d.role}</dd>
            {d.id === 'vision' && (() => { const p = load(), done = VISION_LESSONS.filter((l) => lesson(p, `vision-${l.n}`)?.status === 'done').length; return <><dt>내 진도</dt><dd><span className="sel2__bar"><i style={{ width: `${(done / VISION_LESSONS.length) * 100}%` }} /></span>{done} / {VISION_LESSONS.length}차시 완료</dd></>; })()}
          </dl>
          <div className="sel2__cta">
            {d.open
              ? <MagneticButton className="btn btn--primary btn--key" onClick={() => onEnter(d.id)}>{d.district} 합류 →</MagneticButton>
              : <span className="sel2__soon">준비 중인 Lab입니다</span>}
            {d.open && (() => { const p = load(), nx = VISION_LESSONS.find((l) => lesson(p, `vision-${l.n}`)?.status === 'open' || (l.n === 1 && !lesson(p, 'vision-1'))); return <span className="hint">{nx ? `다음 학습 · ${nx.n}차시 ${nx.title}` : '모든 차시 완료'}</span>; })()}
          </div>
        </motion.aside>
      </div>
      <p className="src-line sel2__src">임시: Lab · 현장 이름은 가칭, 이번 시안에서는 Vision Lab만 열림 · 신경망 모양은 코드로 그린 학습 지도</p>
    </section>
  );
}
