// 레슨 콘텐츠 동적 로더(코드 스플리팅). 새 레슨 = 파일 추가 후 여기 등록.
const loaders = {
  '0.1': () => import('./0.1.js'),
};

export async function loadLesson(id) {
  const fn = loaders[id];
  if (!fn) return null;
  const mod = await fn();
  return mod.default;
}
export const hasContent = (id) => !!loaders[id];
