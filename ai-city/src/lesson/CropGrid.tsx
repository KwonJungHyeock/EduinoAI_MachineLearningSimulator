// author: eduino
// 시험 조각 격자 — 조각마다 예측이 맞으면 초록, 틀리면 빨강 테두리. 마우스를 올리면 크게 + 예측 확률.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CLASSES, type DataSet } from '../sim/nn';

export interface Pred { cls: number; conf: number; p?: number[] }
export function CropGrid({ data, preds, size = 20, title, side }: { data: DataSet; preds: Pred[] | null; size?: number; title: string; side?: (i: number) => ReactNode }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [hov, setHov] = useState<number | null>(null);
  const cols = 24, cell = size + 4, rows = Math.ceil(data.X.length / cols);
  useEffect(() => {
    const c = cv.current; if (!c) return; c.width = cols * cell; c.height = rows * cell;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#0b1220'; ctx.fillRect(0, 0, c.width, c.height);
    const im = ctx.createImageData(size, size);
    data.X.forEach((x, n) => {
      for (let i = 0; i < size * size; i++) { const v = x[i] * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; }
      const px = (n % cols) * cell + 2, py = Math.floor(n / cols) * cell + 2;
      ctx.putImageData(im, px, py);
      if (preds) { ctx.strokeStyle = preds[n].cls === data.y[n] ? '#2fbf8a' : '#ef4444'; ctx.lineWidth = 2; ctx.strokeRect(px - 1, py - 1, size + 2, size + 2); }
    });
  }, [data, preds, size, cols, cell, rows]);
  const h = hov !== null && hov >= 0 && hov < data.X.length && (!preds || preds[hov]) ? hov : null;
  return (
    <div className="cg">
      <div className="cg__wrap"><div className="cg__in" style={{ aspectRatio: `${cols} / ${rows}`, width: `min(100cqw, calc(100cqh * ${cols / rows}))` }} onPointerLeave={() => setHov(null)}
        onPointerMove={(e) => { const r = e.currentTarget.getBoundingClientRect(), k = (e.currentTarget.firstChild as HTMLCanvasElement).width / r.width; const x = Math.floor(((e.clientX - r.left) * k) / cell), y = Math.floor(((e.clientY - r.top) * k) / cell); setHov(x >= 0 && x < cols ? y * cols + x : null); }}>
        <canvas ref={cv} className="cg__cv" />
        {h !== null && <span className="cg__hl" style={{ left: `${((h % cols) * cell) / (cols * cell) * 100}%`, top: `${(Math.floor(h / cols) * cell) / (rows * cell) * 100}%`, width: `${100 / cols}%`, height: `${100 / rows}%` }} />}
      </div></div>
      <div className="cg__side">
        {h === null && <p className="cg__t">{title}</p>}
        {h !== null ? (
          <>
            <div className="cg__head">
              <BigCrop x={data.X[h]} size={size} />
              <div>
                <p className="cg__l">정답: <b>{CLASSES[data.y[h]]}</b></p>
                {preds && <p className={`cg__l ${preds[h].cls === data.y[h] ? 'ok' : 'no'}`}>예측: <b>{CLASSES[preds[h].cls]}</b> ({Math.round(preds[h].conf * 100)}%)</p>}
              </div>
            </div>
            {preds?.[h].p && <div className="cg__bars">{preds[h].p!.map((v, i) => <div key={i}><span>{CLASSES[i]}</span><i style={{ width: `${v * 100}%` }} /><em>{Math.round(v * 100)}%</em></div>)}</div>}
            {side?.(h)}
          </>
        ) : <p className="cg__l">조각에 마우스를 올리면 크게 보고 예측을 확인할 수 있어요. <span className="ok">초록</span> = 맞힘, <span className="no">빨강</span> = 틀림</p>}
      </div>
    </div>
  );
}
export function BigCrop({ x, size }: { x: Float32Array; size: number }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = cv.current; if (!c) return; c.width = size; c.height = size; const ctx = c.getContext('2d')!, im = ctx.createImageData(size, size); for (let i = 0; i < size * size; i++) { const v = x[i] * 255; im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } ctx.putImageData(im, 0, 0); }, [x, size]);
  return <canvas ref={cv} className="cg__big" />;
}
