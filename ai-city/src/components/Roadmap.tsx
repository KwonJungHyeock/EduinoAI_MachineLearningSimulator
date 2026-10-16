// author: eduino
// 학습 로드맵(교육 순서 중심): STEP 1 필수 기초(Foundation 4차시) → STEP 2 기술 Lab(추천 순서 · 난이도 · 먼저 배울 것) → STEP 3 수료(종합 평가 · 리포트).
// 지하철 노선처럼 한 줄로 이어지고, 차시 정거장은 진도(완료 · 다음 · 잠김)를 보여 준다. 열린 차시를 누르면 바로 시작.
import { DISTRICTS, LAB_PLAN } from '../data/districts';
import { load, lesson } from '../store/progress';

type St = 'done' | 'next' | 'locked' | 'plan';
const ST: Record<St, string> = { done: '완료', next: '다음 학습', locked: '잠김', plan: '준비 중' };

export function Roadmap({ selected, onSelect, onLesson }: { selected: string; onSelect: (lab: string) => void; onLesson?: (lab: string, n: number) => void; ready?: number[] }) {
  const prog = load();
  const stOf = (lab: string, n: number): St => {
    const pl = LAB_PLAN[lab]; if (!pl || !pl.ready.includes(n)) return 'plan';
    const s = lesson(prog, `${pl.prefix}-${n}`)?.status ?? (n === 1 ? 'open' : 'locked');
    return s === 'done' ? 'done' : s === 'open' ? 'next' : 'locked';
  };
  const doneOf = (lab: string) => { const pl = LAB_PLAN[lab]; return pl ? pl.lessons.filter((l) => lesson(prog, `${pl.prefix}-${l.n}`)?.status === 'done').length : 0; };
  const fd = DISTRICTS[0], fp = LAB_PLAN.academy, labs = DISTRICTS.slice(1);
  const fDone = doneOf('academy') === fp.lessons.length;
  const go = (lab: string, n: number) => { onSelect(lab); const s = stOf(lab, n); if (s === 'done' || s === 'next') onLesson?.(lab, n); };
  return (
    <div className="erm">
      {/* STEP 1 */}
      <section className={`erm__step ${selected === fd.id ? 'is-sel' : ''}`} style={{ ['--k' as string]: fd.color }}>
        <header className="erm__head" onClick={() => onSelect(fd.id)}><span className="erm__no">STEP 1</span><b>필수 · 기초</b><em>{fd.hours}</em></header>
        <button className="erm__lab" onClick={() => onSelect(fd.id)}>
          <span className="erm__labname">{fd.district}</span><span className="erm__tech">{fd.tech}</span>
          <span className="erm__bar"><i style={{ width: `${(doneOf('academy') / fp.lessons.length) * 100}%` }} /></span>
        </button>
        <ol className="erm__line">
          {fp.lessons.map((l) => { const s = stOf('academy', l.n); return (
            <li key={l.n} className={`erm__stop st-${s}`}>
              <button onClick={() => go('academy', l.n)} aria-label={`${l.n}차시 ${l.title} · ${ST[s]}`}>
                <i>{s === 'done' ? '✓' : l.n}</i><span><b>{l.title}</b><em>{ST[s]}{s !== 'plan' ? ' · 이론 / 콘텐츠' : ''}</em></span>
              </button>
            </li>); })}
        </ol>
        <p className={`erm__gate ${fDone ? 'on' : ''}`}>{fDone ? '기초 수료 ✓' : '기초를 마치면 기술 Lab이 더 쉬워져요'}</p>
      </section>
      <div className="erm__flow" aria-hidden="true"><span /></div>
      {/* STEP 2 */}
      <section className="erm__step erm__step--labs">
        <header className="erm__head"><span className="erm__no">STEP 2</span><b>기술 Lab</b><em>추천 순서 · 원하는 Lab부터 골라도 됩니다</em></header>
        <ol className="erm__labs">
          {labs.map((d, i) => { const pl = LAB_PLAN[d.id], dn = doneOf(d.id), total = pl?.lessons.length ?? 8, sel = selected === d.id; return (
            <li key={d.id} className={`erm__row ${sel ? 'is-sel' : ''} ${d.open ? 'open' : ''}`} style={{ ['--k' as string]: d.color }}>
              <button onClick={() => onSelect(d.id)}>
                <span className="erm__rank">추천 {i + 1}</span>
                <span className="erm__rowmain"><b>{d.district}</b><span>{d.tech}</span></span>
                <span className="erm__lv" aria-label={`난이도 ${d.level} / 4`}>{[1, 2, 3, 4].map((k) => <i key={k} className={k <= d.level ? 'on' : ''} />)}</span>
                <span className="erm__need">먼저 · {d.needs}</span>
                <span className="erm__st">{d.open ? (dn ? <><span className="erm__mini"><i style={{ width: `${(dn / total) * 100}%` }} /></span>{dn}/{total}</> : `${pl?.ready.length ?? 0}차시 열림`) : '준비 중'}</span>
              </button>
            </li>); })}
        </ol>
      </section>
      <div className="erm__flow" aria-hidden="true"><span /></div>
      {/* STEP 3 */}
      <section className="erm__step erm__step--end">
        <header className="erm__head"><span className="erm__no">STEP 3</span><b>수료</b></header>
        <ol className="erm__line erm__line--end">
          <li className="erm__stop st-plan"><span className="erm__stopstatic"><i>✎</i><span><b>Lab 종합 평가</b><em>OX · 단답 · 서술</em></span></span></li>
          <li className="erm__stop st-plan"><span className="erm__stopstatic"><i>⎙</i><span><b>학습 리포트 PDF</b><em>선생님 확인 칸 포함</em></span></span></li>
        </ol>
      </section>
    </div>
  );
}
