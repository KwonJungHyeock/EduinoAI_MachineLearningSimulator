// ─────────────────────────────────────────────────────────────────────────
// 에셋 슬롯 — public/assets/ 에 지정 파일명으로 이미지를 넣으면 자동으로 사용,
// 없으면 절차적(코드로 그린) 폴백이 쓰인다. (워크플로우: 사장님이 이미지 제작 →
// 해당 경로에 저장 → 게임이 자동 반영. 규격은 docs/ASSETS.md 참고)
//
// 슬롯을 추가/활성화하려면 아래 배열에 { key, path } 를 넣는다.
// path 는 public/ 기준(웹 루트). 예) 'assets/characters/eddie.png'
// ─────────────────────────────────────────────────────────────────────────
export const ASSET_SLOTS = [
  // 파일을 넣으면 자동 사용, 없으면 절차적 폴백.
  { key: 'bgTitle', path: 'assets/title/bg.png' },
  { key: 'bgLogin', path: 'assets/login/bg.png' },
  // { key: 'eddieArt', path: 'assets/characters/eddie.png' },
];

// Preload에서 호출 — 슬롯 이미지를 로드하되, 없으면(404) 조용히 폴백.
export function queueAssets(scene) {
  if (!ASSET_SLOTS.length) return;
  scene.load.on('loaderror', (file) => {
    console.warn(`[assets] 누락(폴백 사용): ${file.key} → ${file.src}`);
  });
  for (const s of ASSET_SLOTS) scene.load.image(s.key, s.path);
}

// 씬에서 "에셋 있으면 이미지, 없으면 폴백" 분기에 사용.
export const hasAsset = (scene, key) => scene.textures.exists(key);
