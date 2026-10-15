// author: eduino
import type { ReactNode } from 'react';

export function TopBar({ crumb, right, onHome }: { crumb?: string; right?: ReactNode; onHome?: () => void }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} aria-label="첫 화면으로">
        <span className="brand__mark" aria-hidden="true" />
        <span className="brand__name">AI 미래도시</span>
        <span className="brand__tag">가칭</span>
      </button>
      {crumb && <span className="topbar__crumb">{crumb}</span>}
      <span className="topbar__spacer" />
      {right}
    </header>
  );
}
