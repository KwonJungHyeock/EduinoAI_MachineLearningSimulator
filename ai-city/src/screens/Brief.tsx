// author: eduino
// 지구 진입 브리핑(시네마틱): 현장 · 역할 · 문제 · 배우는 기술 · 차시 흐름
import { motion } from 'framer-motion';
import { DISTRICTS, LAB_PLAN } from '../data/districts';
import { MotifCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { AssetSlot } from '../components/AssetSlot';
import { MagneticButton, spot } from '../components/Interactive';
import { useState } from 'react';
import { load, lesson } from '../store/progress';
import { downloadReport } from '../report/pdf';

const EASE = [0.22, 1, 0.36, 1] as const;
export const READY = LAB_PLAN.vision.ready; // Vision Lab 화면이 만들어진 차시
const up = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: EASE } } };

export function Brief({ id, onBack, onHome, onStart, onFinal }: { id: string; onBack: () => void; onHome: () => void; onStart: (n: number) => void; onFinal: () => void }) {
  const d = DISTRICTS.find((x) => x.id === id) ?? DISTRICTS[1];
  const prog = load();
  const plan = LAB_PLAN[d.id] ?? LAB_PLAN.vision, VISION_LESSONS = plan.lessons, READY = plan.ready;
  const st = (n: number) => lesson(prog, `${plan.prefix}-${n}`)?.status ?? (n === 1 ? 'open' : 'locked');
  const next = VISION_LESSONS.find((l) => st(l.n) === 'open')?.n ?? null;
  const anyDone = VISION_LESSONS.some((l) => st(l.n) === 'done');
  const allDone = VISION_LESSONS.every((l) => st(l.n) === 'done'), finalDone = lesson(prog, `${plan.prefix}-final`)?.status === 'done', hasFinal = d.id === 'vision';
  const [busy, setBusy] = useState(false);
  const playable = (n: number) => st(n) !== 'locked' && READY.includes(n);
  return (
    <section className="screen brief" style={{ ['--k' as string]: d.color }}>
      <MotifCanvas motif={d.motif} color={d.color} className="brief__canvas" />
      <div className="brief__veil" aria-hidden="true" />
      <TopBar crumb={`AI LabCity · ${d.district} 단원 안내`} onHome={onHome} right={<button className="btn btn--ghost" onClick={onBack}>← 학습 로드맵</button>} />

      <motion.div className="brief__body" initial="hidden" animate="show" transition={{ staggerChildren: 0.12, delayChildren: 0.15 }}>
        <div className="brief__main">
          <motion.p className="eyebrow eyebrow--key" variants={up}>{d.order} · {d.district} · {d.tech}</motion.p>
          <motion.h1 variants={up}>{d.site}</motion.h1>
          <motion.div className="brief__role" variants={up}>
            <p className="dpanel__label">학습 상황</p>
            <p className="brief__roleText">여러분은 <b>{d.role}</b>가 되어 탐구합니다.</p>
            <p className="dpanel__label">탐구 과제</p>
            <p>{d.problem}</p>
          </motion.div>
          <motion.div variants={up}>
            <p className="dpanel__label">이 과정의 핵심 개념</p>
            <ul className="chips">{d.keywords.map((k) => <li key={k}>{k}</li>)}</ul>
          </motion.div>
        </div>

        <motion.aside className="brief__side" variants={up}>
          <AssetSlot src={d.id === 'academy' ? 'assets/foundation_line.webp' : 'assets/vision_control.webp'} label="현장 렌더" className="brief__asset" />
          <p className="src-line">{d.id === 'academy' ? '현장: 직접 렌더한 선별 라인 · 물건은 코드로 모델링' : '현장: 직접 렌더한 관제실 · 영상 벽은 1차시 CCTV 장면 (CC0 모델)'}</p>
        </motion.aside>

        <motion.ol className="lessons" variants={up}>
          {VISION_LESSONS.map((l) => (
            <li key={l.n} className={`lesson ${l.n === next ? 'is-next' : ''} ${st(l.n) === 'done' ? 'is-done' : ''} ${l.arc === '상황 해결' ? 'is-case' : ''} ${playable(l.n) ? 'is-play' : ''}`} onPointerMove={spot}
              onClick={() => playable(l.n) && onStart(l.n)} role={playable(l.n) ? 'button' : undefined} tabIndex={playable(l.n) ? 0 : undefined}
              onKeyDown={(e) => { if (playable(l.n) && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onStart(l.n); } }}>
              <span className="lesson__node" />
              <span className="lesson__n">{String(l.n).padStart(2, '0')}<em>{l.arc}</em></span>
              <span className="lesson__title">{l.title}</span>
              <span className="lesson__st">{st(l.n) === 'done' ? <>학습 완료<i className="lesson__again">복습하기 →</i></> : st(l.n) === 'open' ? '이번 차시' : '이전 차시 후 학습'}</span>
            </li>
          ))}
        </motion.ol>

        <motion.div className="brief__cta" variants={up}>
          {next !== null && READY.includes(next) && d.id === 'academy'
            ? <>{/* Foundation Lab: 두 모드 중 골라 시작(차시 안에서도 바꿀 수 있음) */}
                <MagneticButton className="btn btn--primary btn--key" onClick={() => { try { localStorage.setItem('ai_labcity_mode', 'content'); } catch { /* */ } onStart(next); }}>{next}차시 · 체험 학습으로 시작</MagneticButton>
                <button className="btn btn--ghost" onClick={() => { try { localStorage.setItem('ai_labcity_mode', 'theory'); } catch { /* */ } onStart(next); }}>개념 학습(슬라이드)으로 시작</button></>
            : next !== null && READY.includes(next)
            ? <MagneticButton className="btn btn--primary btn--key" onClick={() => onStart(next)}>{next}차시 시작</MagneticButton>
            : allDone && hasFinal
            ? <MagneticButton className="btn btn--primary btn--key" onClick={onFinal}>{finalDone ? '단원 종합평가 다시 보기' : '단원 종합평가'}</MagneticButton>
            : next === null
            ? <MagneticButton className="btn btn--primary btn--key" onClick={() => onStart(1)}>처음부터 다시 하기</MagneticButton>
            : <MagneticButton className="btn btn--primary btn--key" disabled>{next}차시 준비 중</MagneticButton>}
          <span className="hint">{next ? `${next}차시 · ${VISION_LESSONS[next - 1].title}` : allDone ? (finalDone ? '과정 이수 · 종합 평가 완료' : '모든 차시를 마쳤습니다 · 종합 평가가 열렸습니다') : '모든 차시를 마쳤습니다'}</span>
          {anyDone && <span className="brief__sp" />}
          {anyDone && <button className="btn btn--ghost" disabled={busy} onClick={async () => { setBusy(true); try { await downloadReport(load(), d.id); } finally { setBusy(false); } }}>{busy ? 'PDF 만드는 중…' : '학습 결과 보고서 PDF'}</button>}
        </motion.div>
      </motion.div>
      <p className="src-line brief__src">임시: 차시 구성은 커리큘럼 초안 · Lab · 현장 이름은 가칭</p>
    </section>
  );
}
