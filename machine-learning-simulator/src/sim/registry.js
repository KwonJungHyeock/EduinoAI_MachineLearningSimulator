// 위젯/시각자료 레지스트리(코드 스플리팅). 키 → create 함수.
const widgets = {
  lineFit: () => import('./widgets/LineFit.js').then((m) => m.default),
  gradientDescent: () => import('./widgets/GradientDescent.js').then((m) => m.default),
  polyFit: () => import('./widgets/PolyFit.js').then((m) => m.default),
  classifierLab: () => import('./widgets/ClassifierLab.js').then((m) => m.default),
  metricsLab: () => import('./widgets/MetricsLab.js').then((m) => m.default),
  venn: () => import('./visuals.js').then((m) => m.createVenn),
  rulesVsLearn: () => import('./visuals.js').then((m) => m.createRulesVsLearn),
  learnTypes: () => import('./visuals.js').then((m) => m.createLearnTypes),
  overfit: () => import('./visuals.js').then((m) => m.createOverfit),
  featureTable: () => import('./visuals.js').then((m) => m.createFeatureTable),
};

export async function mountWidget(key, mountEl, opts) {
  const loader = widgets[key];
  if (!loader) return null;
  const create = await loader();
  return create(mountEl, opts); // { el, destroy }
}
export const hasWidget = (key) => !!widgets[key];
