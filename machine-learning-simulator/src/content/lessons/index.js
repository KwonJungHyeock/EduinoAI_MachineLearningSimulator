// 레슨 콘텐츠 동적 로더(코드 스플리팅). 새 레슨 = 파일 추가 후 여기 등록.
const loaders = {
  '0.1': () => import('./0.1.js'),
  '0.2': () => import('./0.2.js'),
  '0.3': () => import('./0.3.js'),
  '0.4': () => import('./0.4.js'),
  '0.5': () => import('./0.5.js'),
  '0.6': () => import('./0.6.js'),
  '1.1': () => import('./1.1.js'),
  '1.2': () => import('./1.2.js'),
  '1.3': () => import('./1.3.js'),
  '2.1': () => import('./2.1.js'),
  '2.2': () => import('./2.2.js'),
  '2.3': () => import('./2.3.js'),
  '2.4': () => import('./2.4.js'),
  '2.5': () => import('./2.5.js'),
};

export async function loadLesson(id) {
  const fn = loaders[id];
  if (!fn) return null;
  const mod = await fn();
  return mod.default;
}
export const hasContent = (id) => !!loaders[id];
