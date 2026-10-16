// author: eduino
// AI LabCity 의 랩(Lab = 기술 트랙) 정의. 화면 문구는 모두 여기 한 곳에서 가져온다.
// 지구 · 현장 이름과 차시 구성은 초안(가칭).

export type MotifId = 'split' | 'vision' | 'language' | 'voice' | 'data' | 'physical' | 'generative';

export interface District {
  id: string;
  order: string;        // 'LAB 00'(공통 기초) · 'LAB 01' …
  tech: string;         // 기술 이름 (학습 주제)
  techEn: string;
  district: string;     // 랩 이름 (Vision Lab …)
  site: string;         // 그 지구의 현장
  color: string;        // 키 컬러 (트랙 표시 · 진입 화면에만)
  motif: MotifId;
  keywords: string[];   // 핵심 개념
  situations: string[]; // 상황 해결 미션 예시
  role: string;         // 진입 브리핑: 내가 맡는 역할
  problem: string;      // 단원 안내: 탐구 질문
  open: boolean;        // 이번 시안에서 진입 가능
  level: number;        // 난이도 1~4 (추천 학습 순서의 근거)
  hours: string;        // 분량 표시
  needs: string;        // 먼저 배우면 좋은 것(교육 순서)
}

export const ARC = ['진입', '기초', '실습', '알고리즘 체험', '상황 해결'] as const;

export const DISTRICTS: District[] = [
  {
    id: 'academy', order: 'LAB 00', tech: '머신러닝 기초', techEn: 'Machine Learning Basics',
    district: 'Foundation Lab', site: '아카데미 선별 라인', color: '#2fbf8a', motif: 'split',
    keywords: ['감지 → 판단 → 행동', '규칙 vs 학습', '데이터 · 이름표', '평가 · 정확도'],
    situations: ['재활용 분류 로봇 규칙 만들기', '분류 로봇 학습시키기'],
    role: '아카데미에 막 들어온 신입 AI 엔지니어', problem: '섞여 오는 캔 · 페트병 · 유리병을 기계는 어떻게 알아보고 나눌 수 있을까요?', open: true,
    level: 1, hours: '4차시 · 필수', needs: '처음 시작하는 곳'
  },
  {
    id: 'vision', order: 'LAB 01', tech: 'AI 영상처리', techEn: 'Computer Vision',
    district: 'Vision Lab', site: '도시 영상 관제센터', color: '#14b8a6', motif: 'vision',
    keywords: ['픽셀 · 색', '필터 · 에지', '이미지 분류 (CNN)', '객체 탐지'],
    situations: ['교차로 위험 감지', '밤의 교차로 — 데이터 편향'],
    role: '관제센터의 AI 영상처리 엔지니어', problem: '수많은 카메라 영상 속 사건을 컴퓨터는 어떻게 찾아낼 수 있을까요?', open: true,
    level: 2, hours: '8차시', needs: 'Foundation Lab'
  },
  {
    id: 'data', order: 'LAB 02', tech: '데이터 예측 AI', techEn: 'Predictive Machine Learning',
    district: 'Data Lab', site: '에너지 운영 센터', color: '#3b82f6', motif: 'data',
    keywords: ['데이터 정리', '회귀 · 분류', '군집', '이상 탐지'],
    situations: ['전력 수요 예측', '이상 사용 찾기'],
    role: '운영 센터의 데이터 예측 엔지니어', problem: '내일 도시가 쓸 전기를 데이터로 어떻게 미리 알 수 있을까요?', open: false,
    level: 2, hours: '8차시(예정)', needs: 'Foundation Lab'
  },
  {
    id: 'voice', order: 'LAB 03', tech: '음성 AI', techEn: 'Speech Recognition · Synthesis',
    district: 'Voice Lab', site: '도시 방송 · 음성 비서실', color: '#f59e0b', motif: 'voice',
    keywords: ['소리 파형', '스펙트로그램', '음성 인식 (STT)', '음성 합성 (TTS)'],
    situations: ['소음 속 명령어 인식', '긴급 호출 감지'],
    role: '방송실의 음성 AI 엔지니어', problem: '시끄러운 도시에서 컴퓨터는 사람의 말을 어떻게 알아들을까요?', open: false,
    level: 3, hours: '8차시(예정)', needs: 'Vision Lab(필터 · 스펙트로그램 그림 읽기)'
  },
  {
    id: 'language', order: 'LAB 04', tech: '언어 모델 · LLM', techEn: 'Natural Language Processing · LLM',
    district: 'Language Lab', site: '시민 응답 센터', color: '#8b5cf6', motif: 'language',
    keywords: ['토큰', '임베딩 (단어 거리)', '다음 단어 예측', '프롬프트 · RAG'],
    situations: ['민원 자동 분류', '사실 확인 답변 봇'],
    role: '응답 센터의 언어 모델 엔지니어', problem: '쏟아지는 민원 문장을 컴퓨터는 어떻게 읽고 나눌까요?', open: false,
    level: 3, hours: '8차시(예정)', needs: 'Data Lab(숫자로 바꾸기 · 예측)'
  },
  {
    id: 'generative', order: 'LAB 05', tech: '생성형 AI', techEn: 'Generative AI',
    district: 'Creative Lab', site: '미디어 디자인 스튜디오', color: '#ec4899', motif: 'generative',
    keywords: ['노이즈 → 이미지 (디퓨전)', '잠재 공간', '생성 모델 직접 학습', '진짜 vs 생성 판별'],
    situations: ['도시 홍보 포스터 만들기', '가짜 이미지 판별'],
    role: '스튜디오의 생성형 AI 엔지니어', problem: 'AI는 어떻게 이미지를 만들고, 우리는 그것을 어떻게 가려낼까요?', open: false,
    level: 4, hours: '8차시(예정)', needs: 'Vision Lab · Language Lab'
  },
  {
    id: 'physical', order: 'LAB 06', tech: '피지컬 AI', techEn: 'Robotics · Reinforcement Learning',
    district: 'Robotics Lab', site: '자동화 물류 기지', color: '#84cc16', motif: 'physical',
    keywords: ['센서 융합', '제어', '강화학습 (보상)', '시뮬레이션 → 실물'],
    situations: ['창고 로봇 길 찾기', '집게 로봇 집기'],
    role: '물류 기지의 로봇 AI 엔지니어', problem: '로봇은 처음 보는 창고에서 어떻게 스스로 길을 찾을까요?', open: false,
    level: 4, hours: '8차시(예정)', needs: 'Data Lab(예측) · 센서 기초'
  }
];

// Vision Lab 차시 흐름 (커리큘럼 초안 — 8차시)
export const VISION_LESSONS: { n: number; arc: (typeof ARC)[number]; title: string }[] = [
  { n: 1, arc: '진입', title: '사람 눈으로는 다 못 본다' },
  { n: 2, arc: '기초', title: '이미지는 숫자다' },
  { n: 3, arc: '기초', title: '필터로 윤곽 찾기' },
  { n: 4, arc: '실습', title: '색으로 물체 골라내기' },
  { n: 5, arc: '알고리즘 체험', title: '분류 대결 — kNN vs CNN' },
  { n: 6, arc: '알고리즘 체험', title: '객체 탐지' },
  { n: 7, arc: '상황 해결', title: '교차로 위험 감지' },
  { n: 8, arc: '상황 해결', title: '밤의 교차로 — 데이터 편향' }
];

export const FOUNDATION_LESSONS: { n: number; arc: (typeof ARC)[number]; title: string }[] = [
  { n: 1, arc: '진입', title: 'AI 로봇은 무엇이 다를까' },
  { n: 2, arc: '기초', title: '규칙 vs 학습' },
  { n: 3, arc: '실습', title: '데이터와 이름표' },
  { n: 4, arc: '상황 해결', title: '얼마나 잘 맞혔을까' }
];
// Foundation Lab: 4차시로 압축(기초는 짧게 — 기존 8차시 초안 1 · 2+3+5 · 4+7 · 6+8). 차시마다 이론 모드 · 콘텐츠 모드

// Lab 별 차시 계획: 진도 키 접두어(found-1 · vision-1 …), 차시 흐름, 화면이 만들어진 차시
export interface LabPlan { prefix: string; lessons: { n: number; arc: (typeof ARC)[number]; title: string }[]; ready: number[]; track: string }
export const LAB_PLAN: Record<string, LabPlan> = {
  academy: { prefix: 'found', lessons: FOUNDATION_LESSONS, ready: [1, 2], track: '머신러닝 기초' },
  vision: { prefix: 'vision', lessons: VISION_LESSONS, ready: [1, 2, 3, 4, 5, 6, 7, 8], track: 'AI 영상처리' }
};
