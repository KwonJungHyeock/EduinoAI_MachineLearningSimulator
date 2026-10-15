// author: eduino
// 지구 선택: 왼쪽 지구 인덱스 + 오른쪽 미리보기(그 기술의 원리 모션 · 배우는 것 · 사건 · 전개). 배경 점 격자는 마우스에 반응.
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { ARC, DISTRICTS } from '../data/districts';
import { MotifCanvas, PatternCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { MagneticButton, spot } from '../components/Interactive';

const EASE = [0.22, 1, 0.36, 1] as const;

export function Select({ selected, onSelect, onEnter, onHome }: {
  selected: string; onSelect: (id: string) => void; onEnter: (id: string) => void; onHome: () => void;
}) {
  const d = DISTRICTS.find((x) => x.id === selected) ?? DISTRICTS[0];
  // 선택 표시: 유리판 하나가 선택된 항목 위치로 미끄러짐 (layoutId 는 화면 전환을 멈추게 해서 쓰지 않음)
  const items = useRef<Record<string, HTMLButtonElement | null>>({});
  const [sel, setSel] = useState({ y: 0, h: 0 });
  useLayoutEffect(() => {
    const measure = () => { const el = items.current[selected]; if (el) setSel({ y: el.offsetTop, h: el.offsetHeight }); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [selected]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const i = DISTRICTS.findIndex((x) => x.id === selected);
      if (e.key === 'ArrowDown') onSelect(DISTRICTS[(i + 1) % DISTRICTS.length].id);
      if (e.key === 'ArrowUp') onSelect(DISTRICTS[(i - 1 + DISTRICTS.length) % DISTRICTS.length].id);
      if (e.key === 'Enter' && d.open) onEnter(d.id);
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [selected, d, onSelect, onEnter]);

  return (
    <section className="screen select" style={{ ['--k' as string]: d.color }}>
      <PatternCanvas color={d.color} className="pattern" />
      <TopBar crumb="도시 지도 · 지구 선택" onHome={onHome} right={<button className="btn btn--ghost" disabled>교사 모드</button>} />
      <div className="select__body">
        <nav className="dlist" aria-label="지구 목록">
          <motion.span className="dlist__sel" style={{ ['--k' as string]: d.color }} initial={false} animate={{ y: sel.y, height: sel.h, opacity: sel.h ? 1 : 0 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }} />
          {DISTRICTS.map((x, i) => {
            const on = x.id === selected;
            return (
              <motion.button
                key={x.id}
                ref={(el) => { items.current[x.id] = el; }}
                className={`ditem ${on ? 'is-on' : ''}`}
                style={{ ['--k' as string]: x.color }}
                onClick={() => onSelect(x.id)}
                onPointerMove={spot}
                initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.5, delay: 0.05 * i, ease: EASE }}
              >
                <span className="ditem__no">{String(i).padStart(2, '0')}</span>
                <span className="ditem__text">
                  <span className="ditem__tech">{x.tech}</span>
                  <span className="ditem__place">{x.order} · {x.district}</span>
                </span>
                <span className={`ditem__state ${x.open ? 'open' : ''}`}>{x.open ? '열림' : '준비 중'}</span>
              </motion.button>
            );
          })}
        </nav>

        {/* 중첩 AnimatePresence(exit 대기)는 화면 전환을 멈추게 해서 쓰지 않음 — 들어오는 애니메이션만 */}
          <motion.article
            key={d.id}
            className="dpanel"
            onPointerMove={spot}
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: EASE }}
          >
            <div className="dpanel__stage">
              <MotifCanvas motif={d.motif} color={d.color} className="dpanel__canvas" />
              <div className="dpanel__stagecap">
                <span className="dpanel__order">{d.order}</span>
                <span>{d.district} · {d.site}</span>
              </div>
              <span className="dpanel__try">마우스를 올려 원리를 움직여 보세요</span>
            </div>

            <div className="dpanel__info">
              <div>
                <h2 className="dpanel__tech">{d.tech}</h2>
                <p className="dpanel__en">{d.techEn}</p>
                <p className="dpanel__label">배우는 기술</p>
                <ul className="chips">{d.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
              </div>
              <div>
                <p className="dpanel__label">이 지구에서 해결할 사건</p>
                <ul className="cases">{d.situations.map((s, i) => <li key={s}><b>CASE {String(i + 1).padStart(2, '0')}</b>{s}</li>)}</ul>
                <p className="dpanel__label">내 역할</p>
                <p className="dpanel__role">{d.role}</p>
              </div>
            </div>

            <ol className="track">
              {ARC.map((a, i) => (
                <li key={a} className={i === ARC.length - 1 ? 'is-goal' : ''}>
                  <span className="track__node" /><span className="track__no">{String(i + 1).padStart(2, '0')}</span>{a}
                </li>
              ))}
            </ol>

            <div className="dpanel__cta">
              {d.open
                ? <MagneticButton className="btn btn--primary btn--key" onClick={() => onEnter(d.id)}>{d.district} 진입</MagneticButton>
                : <button className="btn" disabled>준비 중</button>}
              <span className="hint">↑ ↓ 로 지구 이동 · Enter 로 진입</span>
            </div>
          </motion.article>
      </div>
      <p className="src-line">임시: 지구 · 현장 이름은 가칭, 이번 시안에서는 비전 지구만 열림</p>
    </section>
  );
}
