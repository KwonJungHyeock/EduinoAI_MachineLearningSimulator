// 침입 — PIR 움직임 감지, 문 잠금(서보) + 경보로 대응.
export default {
  id: 'intruder',
  name: '침입자',
  icon: '🚨',
  cue: '침입 감지! 문 잠금 + 경보',
  detect: (s) => s.pir > 0,
  arm: (bus) => bus.setSim('pir', 1),
  disarm: (bus) => bus.setSim('pir', 0),
  solve: ['SERVO:90', 'BUZZER:1'],
  timeLimit: 7000,
  vfx: 'intruder',
  damageOnFail: 22,
};
