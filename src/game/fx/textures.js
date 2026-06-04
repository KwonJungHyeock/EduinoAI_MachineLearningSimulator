import Phaser from 'phaser';

// 절차적으로 생성하는 공용 텍스처(외부 에셋 없이 분위기 연출).
// - glow  : 부드러운 방사형 그라데이션(눈빛/조명 풀/먼지에 틴트해서 재사용)
// - dust  : 작은 먼지 입자
export function ensureFxTextures(scene) {
  if (!scene.textures.exists('glow')) {
    const size = 256;
    const c = scene.textures.createCanvas('glow', size, size);
    const ctx = c.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    c.refresh();
  }

  if (!scene.textures.exists('dust')) {
    const size = 16;
    const c = scene.textures.createCanvas('dust', size, size);
    const ctx = c.getContext();
    const g = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, size, size);
    c.refresh();
  }
}

// 비네팅(가장자리 어둡게) — 폐연구소 톤. 화면 위에 덮는 이미지.
export function addVignette(scene, depth = 1000) {
  const { width, height } = scene.scale;
  if (!scene.textures.exists('vignette')) {
    const c = scene.textures.createCanvas('vignette', 512, 288);
    const ctx = c.getContext();
    const g = ctx.createRadialGradient(256, 144, 60, 256, 144, 300);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.7, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(4,6,11,0.92)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 512, 288);
    c.refresh();
  }
  return scene.add
    .image(width / 2, height / 2, 'vignette')
    .setDisplaySize(width, height)
    .setDepth(depth)
    .setScrollFactor(0);
}

// 배경 이미지를 화면에 꽉 차게(cover) 배치.
export function addCover(scene, key, depth = -10) {
  const { width, height } = scene.scale;
  const img = scene.add.image(width / 2, height / 2, key).setScrollFactor(0).setDepth(depth);
  const s = Math.max(width / img.width, height / img.height);
  img.setScale(s);
  return img;
}

// 텍스트/요소 뒤에 부드러운 글로우(WebGL/Canvas 모두 동작 — postFX 대체).
export function glowBehind(scene, x, y, color, sx = 3.4, sy = 1.3, alpha = 0.2) {
  return scene.add
    .image(x, y, 'glow')
    .setTint(color)
    .setBlendMode(Phaser.BlendModes.ADD)
    .setScale(sx, sy)
    .setAlpha(alpha);
}

// 떠다니는 먼지 입자 — 정적·폐허감.
export function addDust(scene, count = 40, depth = 5) {
  const { width, height } = scene.scale;
  return scene.add
    .particles(0, 0, 'dust', {
      x: { min: 0, max: width },
      y: { min: 0, max: height },
      lifespan: 9000,
      speedY: { min: -6, max: 6 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.15, max: 0.5 },
      alpha: { start: 0.18, end: 0 },
      frequency: 9000 / count, // 화면에 대략 count개 유지
      quantity: 1,
      blendMode: 'ADD',
    })
    .setDepth(depth);
}
