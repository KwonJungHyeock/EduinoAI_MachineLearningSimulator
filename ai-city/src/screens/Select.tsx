// author: eduino
// Lab 선택 = 학습 로드맵(components/Roadmap): STEP 1 필수 기초 → STEP 2 기술 Lab(추천 순서 · 난이도) → STEP 3 수료.
// 오른쪽: 고른 뉴런의 정보(원 안에서 그 기술의 원리 모션이 '활성화'됨) — 상자 없이 글자로만.
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { DISTRICTS } from '../data/districts';
import { MotifCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { MagneticButton } from '../components/Interactive';
import { Roadmap } from '../components/Roadmap';
import { load, lesson } from '../store/progress';
import { LAB_PLAN } from '../data/districts';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Select({ selected, onSelect, onEnter, onHome, onLesson }: {
  selected: string; onSelect: (id: string) => void; onEnter: (id: string) => void; onHome: () => void; onLesson?: (lab: string, n: number) => void;
}) {
  // 오른쪽 정보 · 버튼은 '누른 것'만 따라감(마우스가 지나가는 뉴런으로 바뀌지 않게). 지나가는 뉴런은 지도 아래 미리보기 한 줄로.
  const d = DISTRICTS.find((x) => x.id === selected) ?? DISTRICTS[0];
  const sel = DISTRICTS.find((x) => x.id === selected) ?? DISTRICTS[0];
  const plan = LAB_PLAN[d.id];

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
      <TopBar crumb="학습 로드맵 · 과정 선택" onHome={onHome} right={<button className="btn btn--ghost" disabled>교사 모드</button>} />
      <div className="sel2__body">
        <div className="sel2__map">
          <p className="sel2__eye">LEARNING ROADMAP · 학습 로드맵</p>
          <h1 className="sel2__q">기초 과정에서 시작해, <em>심화 과정</em>으로.</h1>
          <Roadmap selected={selected} onSelect={onSelect} onLesson={onLesson} />
          <p className="sel2__how">기초 과정(필수) → 심화 과정(권장 순서 · 난이도 ●) → 평가와 수료 · 깜빡이는 차시 = 이번 차시(누르면 바로 학습)</p>
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
            <dt>핵심 개념</dt><dd>{d.keywords.join('  ·  ')}</dd>
            <dt>탐구 과제</dt><dd>{d.situations.map((s, i) => <span key={s}><b>과제 {i + 1}</b>{s}</span>)}</dd>
            <dt>학습 상황</dt><dd>{d.site} · {d.role} 역할</dd>
            <dt>난이도 · 차시 · 선수 학습</dt><dd>{'●'.repeat(d.level)}{'○'.repeat(4 - d.level)} · {d.hours} · {d.needs}</dd>
            {plan && (() => { const p = load(), done = plan.lessons.filter((l) => lesson(p, `${plan.prefix}-${l.n}`)?.status === 'done').length; return <><dt>학습 진도</dt><dd><span className="sel2__bar"><i style={{ width: `${(done / plan.lessons.length) * 100}%` }} /></span>{done} / {plan.lessons.length}차시 이수</dd></>; })()}
          </dl>
          <div className="sel2__cta">
            {d.open
              ? <MagneticButton className="btn btn--primary btn--key" onClick={() => onEnter(d.id)}>{d.district} 학습 시작 →</MagneticButton>
              : <span className="sel2__soon">준비 중인 과정입니다</span>}
            {d.open && plan && (() => { const p = load(), nx = plan.lessons.find((l) => plan.ready.includes(l.n) && (lesson(p, `${plan.prefix}-${l.n}`)?.status === 'open' || (l.n === 1 && !lesson(p, `${plan.prefix}-1`)))); return <span className="hint">{nx ? `이번 차시 · ${nx.n}차시 ${nx.title}` : '열린 차시를 모두 이수했습니다'}</span>; })()}
          </div>
        </motion.aside>
      </div>
      <p className="src-line sel2__src">임시: Lab · 현장 이름은 가칭, 이번 시안에서는 Foundation Lab(1차시) · Vision Lab만 열림</p>
    </section>
  );
}
