// ─────────────────────────────────────────────────────────────────────────
// 에셋 슬롯 — public/assets/<장면>/ 에 이미지를 넣으면 자동 사용, 없으면 절차적 폴백.
// 파일명에 덜 민감하도록 여러 후보(확장자/이름)를 순서대로 시도한다.
// (워크플로우: 사장님이 이미지 제작 → 해당 폴더에 저장 → 게임 자동 반영)
// ─────────────────────────────────────────────────────────────────────────
const EXTS = ['png', 'jpg', 'jpeg', 'webp'];

// 슬롯별 후보 경로(앞에 있을수록 우선). bg.* 를 먼저 보고, 폴더명.* 도 허용.
const SLOTS = [
  { key: 'bgTitle', dir: 'assets/title', names: ['bg', 'title'] },
  { key: 'bgLogin', dir: 'assets/login', names: ['bg', 'login'] },
];

function candidates(slot) {
  const out = [];
  for (const n of slot.names) for (const e of EXTS) out.push(`${slot.dir}/${n}.${e}`);
  return out;
}

function tryLoadImage(url) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

// Preload에서 await — 존재하는 후보를 찾아 Phaser 텍스처로 등록.
export async function resolveAssets(scene) {
  for (const slot of SLOTS) {
    for (const url of candidates(slot)) {
      const img = await tryLoadImage(url);
      if (img) {
        if (!scene.textures.exists(slot.key)) scene.textures.addImage(slot.key, img);
        break; // 첫 후보 적중 시 다음 슬롯으로
      }
    }
  }
}

export const hasAsset = (scene, key) => scene.textures.exists(key);
