// 화재 — 불꽃 센서 감지, 환기팬 + 경보로 대응.
export default {
  id: 'fire',
  name: '화재',
  icon: '🔥',
  cue: '화재 발생! 환기팬 + 경보',
  detect: (s) => s.flame > 0,
  arm: (bus) => bus.setSim('flame', 1),
  disarm: (bus) => bus.setSim('flame', 0),
  solve: ['FAN:1', 'BUZZER:1'],
  timeLimit: 7000,
  vfx: 'fire',
  damageOnFail: 25,
};
