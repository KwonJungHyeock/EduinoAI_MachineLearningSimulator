// author: eduino
// 장소 · 사물 그림은 에셋으로만. 파일이 없으면 빈 슬롯에 파일명만 보인다.
import { useState } from 'react';

export function AssetSlot({ src, label, className }: { src: string; label: string; className?: string }) {
  const [ok, setOk] = useState(true);
  return (
    <div className={`asset-slot ${ok ? '' : 'empty'} ${className ?? ''}`}>
      {ok && <img src={src} alt="" onError={() => setOk(false)} />}
      {!ok && (
        <div className="asset-slot__label">
          <span>{label}</span>
          <code>{src.split('/').pop()}</code>
        </div>
      )}
    </div>
  );
}
