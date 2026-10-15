// author: eduino
// 3차시 장면 — 왼쪽: CCTV 화면(밝기), 오른쪽: 필터를 지난 윤곽 세기 지도. 왼쪽에 마우스를 올리면
// 그 자리의 3×3 숫자 × 필터 = 결과 한 칸 계산을 그대로 보여 준다. 아래: 12장면 물체 대비 띠.
import { useEffect, useMemo, useRef, useState } from 'react';
import { convolve, contrast, type Hires, type Kernel } from '../../sim/filters';
import { src } from '../vision01/scenes';

function paint(cv: HTMLCanvasElement | null, g: number[], w: number, h: number, mode: 'gray' | 'heat', scale = 1) {
  if (!cv) return;
  cv.width = w; cv.height = h;
  const ctx = cv.getContext('2d')!, im = ctx.createImageData(w, h);
  for (let i = 0; i < w * h; i++) {
    const v = Math.max(0, Math.min(255, g[i] * scale));
    if (mode === 'gray') { im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; }
    else { im.data[i * 4] = v * 0.35; im.data[i * 4 + 1] = Math.min(255, v * 1.05); im.data[i * 4 + 2] = Math.min(255, v * 0.95); }
    im.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(im, 0, 0);
}

export function FilterScene({ H, scene, k, per, onPick, onCalc }: { H: Hires; scene: number; k: Kernel; per: number[] | null; onPick: (i: number) => void; onCalc?: () => void }) {
  const s = H.scenes[scene], w = H.w, h = H.h;
  const resp = useMemo(() => convolve(s.g!, w, h, k), [s, k, w, h]);
  const c = useMemo(() => contrast(resp, w, h, s.box), [resp, s, w, h]);
  const left = useRef<HTMLCanvasElement>(null), right = useRef<HTMLCanvasElement>(null);
  const mx = useMemo(() => { let m = 1; for (const v of resp) if (v > m) m = v; return m; }, [resp]);
  useEffect(() => { paint(left.current, s.g!, w, h, 'gray'); }, [s, w, h]);
  useEffect(() => { paint(right.current, resp, w, h, 'heat', 255 / mx); }, [resp, w, h, mx]);
  const [pt, setPt] = useState<{ x: number; y: number } | null>(null);
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.max(1, Math.min(w - 2, Math.floor(((e.clientX - r.left) / r.width) * w)));
    const y = Math.max(1, Math.min(h - 2, Math.floor(((e.clientY - r.top) / r.height) * h)));
    setPt({ x, y }); onCalc?.();
  };
  const nb = pt ? [-1, 0, 1].flatMap((j) => [-1, 0, 1].map((i) => s.g![(pt.y + j) * w + pt.x + i])) : null;
  const sum = nb ? nb.reduce((a, v, i) => a + v * k[i], 0) : 0;
  const box = s.box, bx = { left: `${box[0] * 100}%`, top: `${box[1] * 100}%`, width: `${(box[2] - box[0]) * 100}%`, height: `${(box[3] - box[1]) * 100}%` };
  const fmt = (v: number) => (Number.isInteger(v) ? `${v}` : v.toFixed(2));
  return (
    <div className="px">
      <div className="fl__row">
        <div className="fl__pane" onPointerMove={move} onPointerLeave={() => setPt(null)}>
          <canvas ref={left} className="fl__cv" />
          <div className="fl__box" style={bx} />
          {pt && <div className="fl__win" style={{ left: `${((pt.x - 1) / w) * 100}%`, top: `${((pt.y - 1) / h) * 100}%`, width: `${(3 / w) * 100}%`, height: `${(3 / h) * 100}%` }} />}
          <span className="zoom__rec">화면 밝기 (128×80) · 마우스를 올려 보세요</span>
        </div>
        <div className="fl__calc">
          {nb ? (
            <>
              <p className="fl__ct">이 자리의 3×3 숫자 × 필터</p>
              <div className="fl__mats">
                <div className="fl__m">{nb.map((v, i) => <span key={i}>{v}</span>)}</div><b>×</b>
                <div className="fl__m fl__m--k">{k.map((v, i) => <span key={i}>{fmt(v)}</span>)}</div>
              </div>
              <p className="fl__sum">곱해서 모두 더하기 = <b>{Math.round(sum)}</b><br />윤곽 세기 = |{Math.round(sum)}| = <b className="o">{Math.round(Math.abs(sum))}</b></p>
            </>
          ) : <p className="fl__ct">왼쪽 화면에 마우스를 올리면<br />필터 계산이 여기에 나옵니다</p>}
        </div>
        <div className="fl__pane">
          <canvas ref={right} className="fl__cv" />
          <div className="fl__box" style={bx} />
          {pt && <div className="fl__win fl__win--out" style={{ left: `${(pt.x / w) * 100}%`, top: `${(pt.y / h) * 100}%`, width: `${(1 / w) * 100}%`, height: `${(1 / h) * 100}%` }} />}
          <span className="zoom__rec">필터 결과 = 윤곽 세기 · 물체 대비 {c.ratio.toFixed(2)}배</span>
        </div>
      </div>
      <div className="px__strip">
        {H.scenes.map((sc, i) => (
          <button key={sc.id} className={`px__th ${i === scene ? 'is-on' : ''}`} onClick={() => onPick(i)}>
            <img src={src(sc.id, 'event', true)} alt="" /><span>{sc.name}</span>
            {per && <i className={per[i] >= 1.8 ? 'ok' : 'miss'}>{per[i].toFixed(1)}배</i>}
          </button>
        ))}
      </div>
    </div>
  );
}
