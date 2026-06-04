// 씬 페이드 인/전환 — 카메라 fade 이벤트 대신 트윈으로 처리(확실히 완료됨).
// 카메라 fadeOut의 'camerafadeoutcomplete'가 환경에 따라 안 오면 씬 전환이
// 멈출 수 있어, 검은 오버레이 트윈 + onComplete로 100% 진행을 보장한다.
function overlay(scene, alpha) {
  return scene.add
    .rectangle(0, 0, scene.scale.width, scene.scale.height, 0x04060b)
    .setOrigin(0, 0)
    .setScrollFactor(0)
    .setDepth(99999)
    .setAlpha(alpha);
}

// 씬 시작 시 검은 화면 → 서서히 밝아짐.
export function fadeIn(scene, ms = 450) {
  const r = overlay(scene, 1);
  scene.tweens.add({ targets: r, alpha: 0, duration: ms, ease: 'Sine.out', onComplete: () => r.destroy() });
  return r;
}

// 다른 씬으로 전환: 검게 덮은 뒤 scene.start.
export function goTo(scene, key, ms = 400) {
  if (scene.__transitioning) return;
  scene.__transitioning = true;
  const r = overlay(scene, 0);
  scene.tweens.add({
    targets: r,
    alpha: 1,
    duration: ms,
    ease: 'Sine.in',
    onComplete: () => scene.scene.start(key),
  });
}
