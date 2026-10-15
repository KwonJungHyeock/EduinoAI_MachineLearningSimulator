// author: eduino
import type { ReactNode } from 'react';

export function TopBar({ crumb, right, onHome }: { crumb?: string; right?: ReactNode; onHome?: () => void }) {
  return (
    <header className="topbar">
      <button className="brand" onClick={onHome} aria-label="첫 화면으로">
        <img className="brand__logo" src="assets/eduino_ai_logo_dark.png" alt="" />
        <span className="brand__name">EDUINO AI</span>
        <span className="brand__tag">AI LabCity</span>
      </button>
      {crumb && <span className="topbar__crumb">{crumb}</span>}
      <span className="topbar__spacer" />
      {right}
    </header>
  );
}
