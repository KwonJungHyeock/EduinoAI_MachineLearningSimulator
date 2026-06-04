// 셸과 통일된 K-12 안전 공포 팔레트/타이포(지침서 §7).
// 게임 모듈은 이 상수를 import 해 일관된 톤을 유지한다.
export const COLORS = {
  bg: 0x0a0e17, // 다크 네이비~블랙
  bgCss: '#0a0e17',
  panel: 0x111726,
  amber: 0xffb020, // 비상등
  red: 0xff5a3c, // 경고/위협(추상)
  green: 0x3ddc91, // 성공
  blue: 0x6fb7ff, // 정보
  yellow: 0xffd11a, // 경고 옐로
  eddieGlow: 0x6fffd6, // EDDIE 눈빛(어둠 속 유일한 빛)
  dim: 0x2a3346,
  text: 0xe6edf7,
};

// CSS/문자열용
export const CSS = {
  bg: '#0a0e17',
  amber: '#ffb020',
  red: '#ff5a3c',
  green: '#3ddc91',
  blue: '#6fb7ff',
  yellow: '#ffd11a',
  text: '#e6edf7',
  muted: '#8b97ad',
};

// 영문은 Orbitron/Space Grotesk, 한글은 Pretendard로 자동 폴백(글자 단위).
export const FONT = {
  display: 'Orbitron, Pretendard, sans-serif',
  body: '"Space Grotesk", Pretendard, sans-serif',
  kr: 'Pretendard, sans-serif',
};

// 기준 해상도(16:9). 모든 씬은 이 좌표계로 그리고 Scale.FIT로 화면에 맞춘다.
export const BASE = { w: 1280, h: 720 };

// 씬 키(중앙 관리 — 오타로 인한 전환 버그 방지)
export const SCENE = {
  BOOT: 'Boot',
  PRELOAD: 'Preload',
  SPLASH: 'Splash',
  TITLE: 'Title',
  LOGIN: 'Login',
  COMING_SOON: 'ComingSoon',
};
