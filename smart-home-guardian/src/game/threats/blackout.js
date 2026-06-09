// 정전 — 조도 급락(어둠), 조명(LED)으로 대응.
export default {
  id: 'blackout',
  name: '정전',
  icon: '🔌',
  cue: '정전! 조명 켜기',
  detect: (s) => s.light < 60,
  arm: (bus) => bus.setSim('light', 20),
  disarm: (bus) => bus.setSim('light', 400),
  solve: ['LED:1'],
  timeLimit: 7000,
  vfx: 'blackout',
  damageOnFail: 18,
};
