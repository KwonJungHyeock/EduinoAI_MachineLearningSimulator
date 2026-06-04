// 미니게임 레지스트리 — 하니스 드롭다운용.
// mission 메타데이터는 셸의 src/content/curriculum.js가 단일 공급(지침서 §6·§8).
// 여기서는 개발/테스트를 위해 해당 방의 mission 객체를 복제해 둔다.
// 새 게임을 추가하면 이 배열에 한 줄 등록하면 된다.
export const GAMES = [
  {
    mission: {
      id: 'buzzer',
      chapter: 'ch2',
      name: '부저',
      icon: '🔊',
      concept: 'tone/주파수',
      escape: '경보 해제',
      reward: '정적 회복',
      pins: [8],
      learning: {
        // 멜로디 시퀀스(사이먼 says) 재현 — 단계별 길이 증가
        targetRounds: 4, // 성공 라운드 수(이 수만큼 맞히면 클리어)
        startLen: 2, // 첫 시퀀스 길이
      },
    },
    // 동적 import — Phaser는 이 청크 안에서만 로드(코드 스플리팅)
    load: () => import('./buzzer.js'),
  },
  {
    mission: {
      id: '_template',
      chapter: 'ch2',
      name: '템플릿',
      icon: '🧩',
      concept: '계약 데모',
      escape: '데모',
      reward: '없음',
      pins: [],
      learning: {},
    },
    load: () => import('./_template.js'),
  },
];
