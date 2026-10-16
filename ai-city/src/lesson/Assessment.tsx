// author: eduino
// 차시 평가 패널 — OX · 단답 · 서술형. 채점은 코드(정답 · 허용 답 · 핵심어), 서술형 최종 판단은 교사.
import { useState } from 'react';
import { ASSESS, gradeShort, gradeEssay, type Item } from '../data/assess';
import { update, type AssessRecord } from '../store/progress';

export function Assessment({ lessonId, onDone, label = '형성평가' }: { lessonId: string; onDone: (r: AssessRecord) => void; label?: string }) {
  const set = ASSESS[lessonId];
  const [ans, setAns] = useState<(boolean | string | null)[]>(set.items.map(() => null));
  const [result, setResult] = useState<AssessRecord | null>(null);
  const put = (i: number, v: boolean | string) => setAns((a) => a.map((x, k) => (k === i ? v : x)));
  const ready = set.items.every((it, i) => (it.kind === 'ox' ? ans[i] !== null : String(ans[i] ?? '').trim().length > (it.kind === 'essay' ? 9 : 0)));

  const submit = () => {
    let ox = 0, oxN = 0, sh = 0, shN = 0; let essay: AssessRecord['essay'] = [];
    set.items.forEach((it, i) => {
      if (it.kind === 'ox') { oxN++; if (ans[i] === it.answer) ox++; }
      if (it.kind === 'short') { shN++; if (gradeShort(it, String(ans[i] ?? ''))) sh++; }
      if (it.kind === 'essay') essay = gradeEssay(it, String(ans[i] ?? ''));
    });
    const r: AssessRecord = { answers: ans, ox: [ox, oxN], short: [sh, shN], essay, at: Date.now() };
    update(lessonId, { assess: r });
    setResult(r); onDone(r);
  };

  const mark = (it: Item, i: number) => {
    if (!result) return null;
    if (it.kind === 'ox') { const ok = ans[i] === it.answer; return <p className={`as-fb ${ok ? 'ok' : 'no'}`}><b>{ok ? '맞음' : '다시'}</b>정답 {it.answer ? 'O' : 'X'} — {it.why}</p>; }
    if (it.kind === 'short') { const ok = gradeShort(it, String(ans[i] ?? '')); return <p className={`as-fb ${ok ? 'ok' : 'no'}`}><b>{ok ? '맞음' : '다시'}</b>{it.why}</p>; }
    const hits = gradeEssay(it, String(ans[i] ?? ''));
    return (
      <div className="as-fb essay">
        <p><b className="k">핵심어 확인</b>{hits.map((h) => <span key={h.label} className={h.hit ? 'ok' : 'no'}>{h.hit ? '✓' : '✕'} {h.label}</span>)}</p>
        <p className="model">모범 답안: {it.model}</p>
        <p className="teacher">최종 확인은 선생님이 합니다 (리포트 PDF의 교사 확인 칸)</p>
      </div>
    );
  };

  return (
    <div className="assess">
      <p className="assess__tag">{label} · {set.items.length}문항</p>
      {set.items.map((it, i) => (
        <div key={i} className="as-q">
          <p className="as-q__q"><span className="as-kind">{it.kind === 'ox' ? 'OX' : it.kind === 'short' ? '단답' : '서술'}</span>{it.q}</p>
          {it.kind === 'ox' && (
            <div className="as-ox">
              {[true, false].map((v) => <button key={String(v)} disabled={!!result} className={ans[i] === v ? 'is-on' : ''} onClick={() => put(i, v)}>{v ? 'O' : 'X'}</button>)}
            </div>
          )}
          {it.kind === 'short' && <input className="as-in" disabled={!!result} value={String(ans[i] ?? '')} onChange={(e) => put(i, e.target.value)} placeholder="답을 쓰세요" />}
          {it.kind === 'essay' && <textarea className="as-in" rows={3} disabled={!!result} value={String(ans[i] ?? '')} onChange={(e) => put(i, e.target.value)} placeholder="두세 문장으로 쓰세요 (내 실험 결과를 근거로)" />}
          {mark(it, i)}
        </div>
      ))}
      {!result
        ? <button className={`rbtn rbtn--key ${ready ? 'is-target' : ''}`} disabled={!ready} onClick={submit}>평가 제출</button>
        : <p className="as-sum">OX {result.ox[0]}/{result.ox[1]} · 단답 {result.short[0]}/{result.short[1]} · 서술 핵심어 {result.essay.filter((e) => e.hit).length}/{result.essay.length}</p>}
    </div>
  );
}
