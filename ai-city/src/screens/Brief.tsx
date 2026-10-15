// author: eduino
// 지구 진입 브리핑(시네마틱): 현장 · 역할 · 문제 · 배우는 기술 · 차시 흐름
import { motion } from 'framer-motion';
import { DISTRICTS, VISION_LESSONS } from '../data/districts';
import { MotifCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { AssetSlot } from '../components/AssetSlot';
import { MagneticButton, spot } from '../components/Interactive';
import { useState } from 'react';
import { load, lesson } from '../store/progress';
import { downloadReport } from '../report/pdf';

const EASE = [0.22, 1, 0.36, 1] as const;
export const READY = [1, 2, 3, 4, 5, 6, 7, 8]; // 화면이 만들어진 차시
const up = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };

export function Brief({ id, onBack, onHome, onStart, onFinal }: { id: string; onBack: () => void; onHome: () => void; onStart: (n: number) => void; onFinal: () => void }) {
  const d = DISTRICTS.find((x) => x.id === id) ?? DISTRICTS[1];
  const prog = load();
  const st = (n: number) => lesson(prog, `vision-${n}`)?.status ?? (n === 1 ? 'open' : 'locked');
  const next = VISION_LESSONS.find((l) => st(l.n) === 'open')?.n ?? null;
  const anyDone = VISION_LESSONS.some((l) => st(l.n) === 'done');
  const allDone = VISION_LESSONS.every((l) => st(l.n) === 'done'), finalDone = lesson(prog, 'vision-final')?.status === 'done';
  const [busy, setBusy] = useState(false);
  const playable = (n: number) => st(n) !== 'locked' && READY.includes(n);
  return (
    <section className="screen brief" style={{ ['--k' as string]: d.color }}>
      <MotifCanvas motif={d.motif} color={d.color} className="brief__canvas" />
      <div className="brief__veil" aria-hidden="true" />
      <TopBar crumb={`도시 지도 · ${d.district}`} onHome={onHome} right={<button className="btn btn--ghost" onClick={onBack}>← 지구 선택</button>} />

      <motion.div className="brief__body" initial="hidden" animate="show" transition={{ staggerChildren: 0.12, delayChildren: 0.15 }}>
        <div className="brief__main">
          <motion.p className="eyebrow eyebrow--key" variants={up}>{d.order} · {d.district} · {d.tech}</motion.p>
          <motion.h1 variants={up}>{d.site}</motion.h1>
          <motion.div className="brief__role" variants={up}>
            <p className="dpanel__label">당신의 역할</p>
            <p className="brief__roleText">오늘부터 당신은 <b>{d.role}</b>입니다.</p>
            <p className="dpanel__label">풀어야 할 문제</p>
            <p>{d.problem}</p>
          </motion.div>
          <motion.div variants={up}>
            <p className="dpanel__label">이 트랙에서 배우는 기술</p>
            <ul className="chips">{d.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
          </motion.div>
        </div>

        <motion.aside className="brief__side" variants={up}>
          <AssetSlot src="assets/vision_control.webp" label="현장 렌더" className="brief__asset" />
          <p className="src-line">현장: 직접 렌더한 관제실 · 영상 벽은 1차시 CCTV 장면 (CC0 모델)</p>
        </motion.aside>

        <motion.ol className="lessons" variants={up}>
          {VISION_LESSONS.map((l) => (
            <li key={l.n} className={`lesson ${l.n === next ? 'is-next' : ''} ${st(l.n) === 'done' ? 'is-done' : ''} ${l.arc === '상황 해결' ? 'is-case' : ''} ${playable(l.n) ? 'is-play' : ''}`} onPointerMove={spot}
              onClick={() => playable(l.n) && onStart(l.n)} role={playable(l.n) ? 'button' : undefined} tabIndex={playable(l.n) ? 0 : undefined}
              onKeyDown={(e) => { if (playable(l.n) && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onStart(l.n); } }}>
              <span className="lesson__node" />
              <span className="lesson__n">{String(l.n).padStart(2, '0')}<em>{l.arc}</em></span>
              <span className="lesson__title">{l.title}</span>
              <span className="lesson__st">{st(l.n) === 'done' ? <>완료<i className="lesson__again">다시 하기 →</i></> : st(l.n) === 'open' ? '열림' : '잠김'}</span>
            </li>
          ))}
        </motion.ol>

        <motion.div className="brief__cta" variants={up}>
          {next !== null && READY.includes(next)
            ? <MagneticButton className="btn btn--primary btn--key" onClick={() => onStart(next)}>{next}차시 시작</MagneticButton>
            : allDone
            ? <MagneticButton className="btn btn--primary btn--key" onClick={onFinal}>{finalDone ? '종합 평가 다시 보기' : '트랙 종합 평가'}</MagneticButton>
            : next === null
            ? <MagneticButton className="btn btn--primary btn--key" onClick={() => onStart(1)}>처음부터 다시 하기</MagneticButton>
            : <MagneticButton className="btn btn--primary btn--key" disabled>{next}차시 준비 중</MagneticButton>}
          <span className="hint">{next ? `${next}차시 · ${VISION_LESSONS[next - 1].title}` : allDone ? (finalDone ? '트랙 수료 · 종합 평가 완료' : '모든 차시를 마쳤습니다 · 종합 평가가 열렸습니다') : '모든 차시를 마쳤습니다'}</span>
          {anyDone && <span className="brief__sp" />}
          {anyDone && <button className="btn btn--ghost" disabled={busy} onClick={async () => { setBusy(true); try { await downloadReport(load()); } finally { setBusy(false); } }}>{busy ? 'PDF 만드는 중…' : '학습 리포트 PDF'}</button>}
        </motion.div>
      </motion.div>
      <p className="src-line brief__src">임시: 차시 구성은 커리큘럼 초안 · 지구 · 현장 이름은 가칭</p>
    </section>
  );
}
