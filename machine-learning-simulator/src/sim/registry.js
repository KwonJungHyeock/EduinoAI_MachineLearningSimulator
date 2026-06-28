// 인터랙티브 위젯 레지스트리(코드 스플리팅). 새 위젯 = 여기에 등록.
const widgets = {
  lineFit: () => import('./widgets/LineFit.js'),
};

export async function mountWidget(key, mountEl, opts) {
  const loader = widgets[key];
  if (!loader) return null;
  const mod = await loader();
  return mod.default(mountEl, opts); // { el, destroy }
}
export const hasWidget = (key) => !!widgets[key];
