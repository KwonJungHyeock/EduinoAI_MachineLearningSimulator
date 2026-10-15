// author: eduino
// 범용 코드 서랍 — 노란 칸만 바꿀 수 있음(키보드 입력 없음). 줄 = 고정 글자 또는 노란 칸(이전/다음 값).
export type CodeLine =
  | { kind: 'text'; text: string; comment?: string }
  | { kind: 'cell'; name: string; value: string; comment?: string; dec?: () => void; inc?: () => void; toggle?: () => void };

export function CodeCells({ enabled, title, lines, run, onRun, running, lockedNote = '코드 서랍은 적용 단계에서 열립니다.' }: {
  enabled: boolean; title: string; lines: CodeLine[]; run: string; onRun: () => void; running?: boolean; lockedNote?: string;
}) {
  if (!enabled) return <div className="cdrawer cdrawer--locked">{lockedNote}</div>;
  return (
    <div className="cdrawer">
      <pre className="code">
        <span className="c"># {title}</span>{'\n'}
        {lines.map((l, i) => (
          <span key={i}>
            {l.kind === 'text' ? l.text : (
              <>{l.name.padEnd(10)}= <span className={`cell ${l.toggle ? 'cell--toggle' : ''}`}>
                {l.toggle ? <button onClick={l.toggle}><b>{l.value}</b></button>
                  : <><button aria-label={`${l.name} 줄이기`} onClick={l.dec}>−</button><b>{l.value}</b><button aria-label={`${l.name} 늘리기`} onClick={l.inc}>+</button></>}
              </span></>
            )}
            {l.comment && <span className="c">{'   '}# {l.comment}</span>}{'\n'}
          </span>
        ))}
        {'\n'}{run}
      </pre>
      <button className="run-btn" onClick={onRun} disabled={running}>{running ? '실행 중…' : '실행 ▶'}</button>
    </div>
  );
}
