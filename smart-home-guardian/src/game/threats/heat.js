// 폭염 — 온도 급상승, 냉방팬으로 대응.
export default {
  id: 'heat',
  name: '폭염',
  icon: '🌡️',
  cue: '폭염 경보! 냉방팬 가동',
  detect: (s) => s.temp >= 34,
  arm: (bus) => bus.setSim('temp', 37),
  disarm: (bus) => bus.setSim('temp', 24),
  solve: ['FAN:1'],
  timeLimit: 7000,
  vfx: 'heat',
  damageOnFail: 16,
};
