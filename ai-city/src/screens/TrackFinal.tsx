// author: eduino
// 트랙 종합 평가 — 8차시를 돌아보고(내 결론 · 차시 평가 결과) 종합 문항에 답한 뒤 학습 리포트 PDF로 내려받는다.
import { useState } from 'react';
import { TopBar } from '../components/TopBar';
import { VISION_LESSONS } from '../data/districts';
import { Assessment } from '../lesson/Assessment';
import { load, update, setStudent } from '../store/progress';
import { downloadReport } from '../report/pdf';

// 차시마다 '가져갈 한 줄' (개념 이름 — 수치 아님)
const TAKE = ['사람 눈의 한계 → 컴퓨터는 모든 화면을 동시에 잰다', '이미지 = 숫자 표 · 해상도와 기준값', '필터(합성곱)로 윤곽 찾기', '색 공간(HSV) · 단서 합치기 · 정밀도/재현율', 'kNN vs CNN · 학습 · 에폭 · 손실', '객체 탐지 · NMS · 헛탐지 다시 학습', '탐지 + 규칙 = 서비스 · 관심 구역', '데이터 편향 · 상황별로 따로 재기'];

export function TrackFinal({ onExit, onHome }: { onExit: () => void; onHome: () => void }) {
  const prog = load();
  const [done, setDone] = useState(prog.lessons['vision-final']?.status === 'done');
  const [student, setName] = useState(prog.student ?? '');
  const [busy, setBusy] = useState(false);
  const [again, setAgain] = useState(0);
  return (
    <section className="screen final">
      <TopBar crumb="Vision Lab · 트랙 종합 평가" onHome={onHome} right={<button className="btn btn--ghost" onClick={onExit}>← 브리핑</button>} />
      <div className="final__body">
        <div className="final__left">
          <p className="eyebrow eyebrow--key">AI 영상처리 · 8차시 돌아보기</p>
          <h1 className="final__h">관제센터 영상 분석관 수료 평가</h1>
          <ol className="final__list">
            {VISION_LESSONS.map((l, i) => {
              const r = prog.lessons[`vision-${l.n}`], a = r?.assess, c = (r?.report as { conclusion?: string } | undefined)?.conclusion;
              return (
                <li key={l.n} className={r?.status === 'done' ? 'is-done' : ''}>
                  <span className="final__n">{String(l.n).padStart(2, '0')}</span>
                  <div>
                    <p className="final__t">{l.title}</p>
                    <p className="final__k">{TAKE[i]}</p>
                    {c && <p className="final__c">{c.split('. ')[0]}.</p>}
                  </div>
                  <span className="final__s">{a ? `OX ${a.ox[0]}/${a.ox[1]} · 단답 ${a.short[0]}/${a.short[1]} · 핵심어 ${a.essay.filter((e) => e.hit).length}/${a.essay.length}` : r?.status === 'done' ? '평가 안 함' : '미완료'}</span>
                </li>
              );
            })}
          </ol>
        </div>
        <div className="final__rail rail">
          <p className="lead-text">1~8차시에서 직접 실험한 결과를 떠올리며 답하세요. 서술형은 핵심어를 자동으로 확인하고, 최종 판단은 선생님이 리포트에서 합니다.</p>
          <Assessment key={again} lessonId="vision-final" label="트랙 종합 평가" onDone={() => { update('vision-final', { status: 'done' }); setDone(true); }} />
          {done && (
            <div className="pdfbox">
              <p className="pdfbox__tag">학습 리포트 (8차시 + 종합 평가)</p>
              <input className="as-in" value={student} placeholder="이름 (리포트에 표시)" onChange={(e) => { setName(e.target.value); setStudent(e.target.value); }} />
              <div className="ctrl__row">
                <button className="rbtn rbtn--key" disabled={busy} onClick={async () => { setBusy(true); try { await downloadReport(load()); } finally { setBusy(false); } }}>{busy ? 'PDF 만드는 중…' : 'PDF 내려받기'}</button>
                <button className="rbtn" onClick={() => setAgain((n) => n + 1)}>다시 풀기</button>
                <button className="rbtn is-target" onClick={onExit}>브리핑으로</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
