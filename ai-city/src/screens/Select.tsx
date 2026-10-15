// author: eduino
// 지구 선택 = 학습 신경망 지도. 왼쪽: 입력층(공통 기초) → 은닉층(6개 트랙) → 출력층(사건) 뉴런 지도, 신호가 흐름.
// 오른쪽: 고른 뉴런의 정보(원 안에서 그 기술의 원리 모션이 '활성화'됨) — 상자 없이 글자로만.
import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DISTRICTS } from '../data/districts';
import { MotifCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { MagneticButton } from '../components/Interactive';
import { NeuralMap } from '../components/NeuralMap';
import { READY } from './Brief';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Select({ selected, onSelect, onEnter, onHome }: {
  selected: string; onSelect: (id: string) => void; onEnter: (id: string) => void; onHome: () => void;
}) {
  const [hover, setHover] = useState<string | null>(null);
  const shown = hover ?? selected;
  const d = DISTRICTS.find((x) => x.id === shown) ?? DISTRICTS[0];
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
      <TopBar crumb="학습 신경망 · 지구 선택" onHome={onHome} right={<button className="btn btn--ghost" disabled>교사 모드</button>} />
      <div className="sel2__body">
        <div className="sel2__map">
          <NeuralMap active={shown} onHover={setHover} onPick={(id) => onSelect(id)} />
          <p className="sel2__how">뉴런에 마우스를 올리면 그 경로가 켜지고, 누르면 선택됩니다 · ← → 로 이동</p>
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
          </dl>
          <div className="sel2__cta">
            {d.open
              ? <MagneticButton className="btn btn--primary btn--key" onClick={() => onEnter(d.id)}>{d.district} 진입 →</MagneticButton>
              : <span className="sel2__soon">준비 중인 지구입니다</span>}
            {d.open && <span className="hint">{READY.length}차시 열림</span>}
          </div>
        </motion.aside>
      </div>
      <p className="src-line sel2__src">임시: 지구 · 현장 이름은 가칭, 이번 시안에서는 비전 지구만 열림 · 신경망 모양은 코드로 그린 학습 지도</p>
    </section>
  );
}
