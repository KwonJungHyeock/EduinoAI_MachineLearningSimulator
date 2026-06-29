// 커리큘럼(데이터 주도) — 챕터·레슨 메타. 레슨 추가 = 여기에 항목 추가.
// status: 'ready'(콘텐츠 있음) | 'soon'(준비 중)
export const CURRICULUM = [
  {
    id: 'ch0', emoji: '📗', title: '머신러닝 입문', color: '#3ddc91',
    desc: '머신러닝이 무엇인지, 어떻게 배우는지 가장 쉬운 것부터.',
    lessons: [
      { id: '0.1', title: '머신러닝이란?', tag: '개념', status: 'ready' },
      { id: '0.2', title: 'AI · ML · 딥러닝 관계', tag: '개념', status: 'ready' },
      { id: '0.3', title: '학습의 종류 (지도·비지도·강화)', tag: '개념', status: 'ready' },
      { id: '0.4', title: '데이터 · 특징 · 라벨', tag: '개념', status: 'ready' },
      { id: '0.5', title: '학습 = 오차 줄이기 (선 맞추기 체험)', tag: '체험', status: 'ready' },
      { id: '0.6', title: '훈련/테스트와 일반화', tag: '개념', status: 'ready' },
    ],
  },
  {
    id: 'ch1', emoji: '📘', title: '지도학습 — 회귀', color: '#6fb7ff',
    desc: '선형회귀와 경사하강법으로 "학습"의 핵심을 만진다.',
    lessons: [
      { id: '1.1', title: '선형 회귀', tag: '시뮬', status: 'ready' },
      { id: '1.2', title: '경사하강법', tag: '시뮬', status: 'ready' },
      { id: '1.3', title: '다항 회귀 · 과적합 · 정규화', tag: '시뮬', status: 'ready' },
    ],
  },
  {
    id: 'ch2', emoji: '📙', title: '지도학습 — 분류', color: '#ffb020',
    desc: '결정경계와 평가지표로 분류기를 이해한다.',
    lessons: [
      { id: '2.1', title: '로지스틱 회귀', tag: '시뮬', status: 'ready' },
      { id: '2.2', title: '분류 평가 (정확도·혼동행렬)', tag: '시뮬', status: 'ready' },
      { id: '2.3', title: 'kNN', tag: '시뮬', status: 'ready' },
      { id: '2.4', title: '결정트리', tag: '시뮬', status: 'ready' },
      { id: '2.5', title: 'SVM (마진·커널)', tag: '시뮬', status: 'ready' },
    ],
  },
  {
    id: 'ch3', emoji: '📕', title: '비지도학습', color: '#b39bff',
    desc: '정답 없이 구조를 찾는다 — 군집과 차원축소.',
    lessons: [
      { id: '3.1', title: 'K-평균 군집', tag: '시뮬', status: 'soon' },
      { id: '3.2', title: 'PCA (주성분분석)', tag: '시뮬', status: 'soon' },
    ],
  },
  {
    id: 'ch4', emoji: '📓', title: '신경망 · 딥러닝 입문', color: '#ff5a3c',
    desc: '퍼셉트론에서 다층신경망·역전파까지.',
    lessons: [
      { id: '4.1', title: '퍼셉트론 (AND·OR·XOR)', tag: '시뮬', status: 'soon' },
      { id: '4.2', title: '다층신경망 (MLP)', tag: '시뮬', status: 'soon' },
      { id: '4.3', title: '역전파', tag: '시뮬', status: 'soon' },
      { id: '4.4', title: 'CNN 맛보기', tag: '개념', status: 'soon' },
    ],
  },
  {
    id: 'ch5', emoji: '📔', title: '심화 · 응용 · 윤리', color: '#6fffd6',
    desc: '최적화·검증·AI 윤리, 그리고 수료.',
    lessons: [
      { id: '5.1', title: '경사하강 비교 (SGD·Momentum·Adam)', tag: '시뮬', status: 'soon' },
      { id: '5.2', title: '교차검증 · 튜닝', tag: '개념', status: 'soon' },
      { id: '5.3', title: '데이터 편향 · AI 윤리', tag: '개념', status: 'soon' },
      { id: '5.4', title: '종합 프로젝트 · 수료', tag: '프로젝트', status: 'soon' },
    ],
  },
];

export const ALL_LESSONS = CURRICULUM.flatMap((c) =>
  c.lessons.map((l) => ({ ...l, chapterId: c.id, chapterTitle: c.title, color: c.color })),
);
export const lessonById = Object.fromEntries(ALL_LESSONS.map((l) => [l.id, l]));
export const totalLessons = ALL_LESSONS.length;
