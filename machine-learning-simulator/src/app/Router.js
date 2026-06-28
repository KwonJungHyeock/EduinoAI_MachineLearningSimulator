// 해시 기반 초간단 라우터 (정적 배포에 서버 설정 불필요).
//  #/            → 홈
//  #/lesson/0.1  → 레슨
export function createRouter(routes, root) {
  let cleanup = null;
  function render() {
    const hash = location.hash.slice(1) || '/';
    const [, kind, arg] = hash.split('/'); // '', 'lesson', '0.1'
    cleanup?.();
    root.innerHTML = '';
    if (kind === 'lesson' && arg) cleanup = routes.lesson(root, arg);
    else cleanup = routes.home(root);
    window.scrollTo(0, 0);
  }
  window.addEventListener('hashchange', render);
  render();
  return render;
}

export const go = (path) => { location.hash = path; };
