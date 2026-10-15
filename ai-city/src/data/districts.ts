// author: eduino
// AI 랩시티의 지구(=트랙) 정의. 화면 문구는 모두 여기 한 곳에서 가져온다.
// 지구 · 현장 이름과 차시 구성은 초안(가칭).

export type MotifId = 'split' | 'vision' | 'language' | 'voice' | 'data' | 'physical' | 'generative';

export interface District {
  id: string;
  order: string;        // '공통 기초' · '트랙 1' …
  tech: string;         // 기술 이름 (학습 주제)
  techEn: string;
  district: string;     // 도시 안 지구 이름 (가칭)
  site: string;         // 그 지구의 현장
  color: string;        // 키 컬러 (트랙 표시 · 진입 화면에만)
  motif: MotifId;
  keywords: string[];   // 배우는 기술
  situations: string[]; // 상황 해결 미션 예시
  role: string;         // 진입 브리핑: 내가 맡는 역할
  problem: string;      // 진입 브리핑: 풀어야 할 문제
  open: boolean;        // 이번 시안에서 진입 가능
}

export const ARC = ['진입', '기초', '실습', '알고리즘 체험', '상황 해결'] as const;

export const DISTRICTS: District[] = [
  {
    id: 'academy', order: '공통 기초', tech: '머신러닝 기초', techEn: 'Machine Learning Basics',
    district: '아카데미 지구', site: 'AI 아카데미', color: '#2fbf8a', motif: 'split',
    keywords: ['규칙 vs 학습', '데이터 · 라벨', '오차 · 평가', '편향'],
    situations: ['재활용 분류 로봇 규칙 만들기', '분류 로봇 학습시키기'],
    role: '도시에 막 배치된 신입 AI 엔지니어', problem: '모든 지구가 쓰는 AI의 기본기를 먼저 익혀야 합니다', open: false
  },
  {
    id: 'vision', order: '트랙 1', tech: 'AI 영상처리', techEn: 'Computer Vision',
    district: '비전 지구', site: '도시 영상 관제센터', color: '#14b8a6', motif: 'vision',
    keywords: ['픽셀 · 색', '필터 · 에지', '이미지 분류 (CNN)', '객체 탐지'],
    situations: ['교차로 위험 감지', '밤의 교차로 — 데이터 편향'],
    role: '관제센터의 AI 영상처리 엔지니어', problem: '도시 곳곳의 카메라 영상을 사람 눈으로는 다 볼 수 없습니다', open: true
  },
  {
    id: 'language', order: '트랙 2', tech: '언어 모델 · LLM', techEn: 'Natural Language Processing · LLM',
    district: '랭귀지 지구', site: '시민 응답 센터', color: '#8b5cf6', motif: 'language',
    keywords: ['토큰', '임베딩 (단어 거리)', '다음 단어 예측', '프롬프트 · RAG'],
    situations: ['민원 자동 분류', '사실 확인 답변 봇'],
    role: '응답 센터의 언어 모델 엔지니어', problem: '하루에도 수많은 민원 문장이 쏟아집니다', open: false
  },
  {
    id: 'voice', order: '트랙 3', tech: '음성 AI', techEn: 'Speech Recognition · Synthesis',
    district: '보이스 지구', site: '도시 방송 · 음성 비서실', color: '#f59e0b', motif: 'voice',
    keywords: ['소리 파형', '스펙트로그램', '음성 인식 (STT)', '음성 합성 (TTS)'],
    situations: ['소음 속 명령어 인식', '긴급 호출 감지'],
    role: '방송실의 음성 AI 엔지니어', problem: '시끄러운 도시에서도 사람의 말을 정확히 알아들어야 합니다', open: false
  },
  {
    id: 'data', order: '트랙 4', tech: '데이터 예측 AI', techEn: 'Predictive Machine Learning',
    district: '데이터 지구', site: '에너지 운영 센터', color: '#3b82f6', motif: 'data',
    keywords: ['데이터 정리', '회귀 · 분류', '군집', '이상 탐지'],
    situations: ['전력 수요 예측', '이상 사용 찾기'],
    role: '운영 센터의 데이터 예측 엔지니어', problem: '내일 도시가 쓸 전기를 미리 알아야 합니다', open: false
  },
  {
    id: 'physical', order: '트랙 5', tech: '피지컬 AI', techEn: 'Robotics · Reinforcement Learning',
    district: '로보틱스 지구', site: '자동화 물류 기지', color: '#84cc16', motif: 'physical',
    keywords: ['센서 융합', '제어', '강화학습 (보상)', '시뮬레이션 → 실물'],
    situations: ['창고 로봇 길 찾기', '집게 로봇 집기'],
    role: '물류 기지의 로봇 AI 엔지니어', problem: '로봇이 처음 보는 창고에서도 스스로 길을 찾아야 합니다', open: false
  },
  {
    id: 'generative', order: '트랙 6', tech: '생성형 AI', techEn: 'Generative AI',
    district: '크리에이티브 지구', site: '미디어 디자인 스튜디오', color: '#ec4899', motif: 'generative',
    keywords: ['노이즈 → 이미지 (디퓨전)', '잠재 공간', '생성 모델 직접 학습', '진짜 vs 생성 판별'],
    situations: ['도시 홍보 포스터 만들기', '가짜 이미지 판별'],
    role: '스튜디오의 생성형 AI 엔지니어', problem: 'AI로 만든 이미지가 넘쳐나는 도시, 만들 줄도 가려낼 줄도 알아야 합니다', open: false
  }
];

// 비전 지구 차시 흐름 (커리큘럼 초안 — 8차시)
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
