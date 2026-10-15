// author: eduino
// 화면 전체 마우스(포인터) 위치를 한 곳에서 추적한다. 캔버스 모션 · 패턴이 같은 값을 읽는다.
export const pointer = { x: -9999, y: -9999, on: false, downAt: -1 };

if (typeof window !== 'undefined') {
  const move = (e: PointerEvent) => { pointer.x = e.clientX; pointer.y = e.clientY; pointer.on = true; };
  window.addEventListener('pointermove', move, { passive: true });
  window.addEventListener('pointerdown', (e) => { move(e); pointer.downAt = performance.now(); }, { passive: true });
  document.addEventListener('pointerleave', () => { pointer.on = false; });
  window.addEventListener('blur', () => { pointer.on = false; });
}

// 캔버스 기준 부드러운 포인터: 위치는 따라가되 살짝 늦게, 들어오고 나갈 때 세기(in)가 서서히 변함
export interface P { x: number; y: number; in: number; click: number }

export function createFollower() {
  const s: P = { x: 0, y: 0, in: 0, click: 0 };
  let init = false;
  return (rect: DOMRect, dt: number): P => {
    const lx = pointer.x - rect.left, ly = pointer.y - rect.top;
    const inside = pointer.on && lx >= 0 && ly >= 0 && lx <= rect.width && ly <= rect.height;
    if (!init && inside) { s.x = lx; s.y = ly; init = true; }
    const k = 1 - Math.pow(0.0008, dt); // 프레임 속도와 무관하게 같은 느낌으로 따라감
    if (inside) { s.x += (lx - s.x) * k; s.y += (ly - s.y) * k; }
    s.in += ((inside ? 1 : 0) - s.in) * Math.min(1, dt * 4);
    const since = (performance.now() - pointer.downAt) / 1000;
    s.click = inside && since >= 0 && since < 1.2 ? since : -1; // 클릭 뒤 퍼지는 물결용
    return s;
  };
}
