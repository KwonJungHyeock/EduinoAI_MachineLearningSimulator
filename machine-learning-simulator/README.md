# EduinoAI · 머신러닝 학습 프로그램 (Machine Learning Simulator)

머신러닝을 **개념 → 간단 체험 → 시뮬레이터 → 퀴즈**로 쉽고 재미있게 배우는 인터랙티브 학습 프로그램.
대학 이론 수업 시연 + 자기주도 학습 겸용. 데이터·조건을 직접 바꾸며 학습 과정을 실시간으로 본다.

## 빠른 시작
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ → Vercel
```

## 구조
```
src/
  app/        Router(해시), Progress(localStorage)
  content/    curriculum.js(챕터·레슨 메타), lessons/(레슨 콘텐츠 — 파일 추가로 확장)
  screens/    Home(랜딩·챕터목록), Lesson(개념·체험·시뮬·퀴즈·정리 5스텝 셸)
  styles.css  main.js
docs/         커리큘럼_로드맵.md
```

## 커리큘럼 (계획)
CH0 입문 · CH1 회귀 · CH2 분류 · CH3 비지도 · CH4 신경망 · CH5 심화/윤리. (docs/ 로드맵 참조)

## 레슨 추가
1. `src/content/lessons/<id>.js` 작성(concept/tryIt/sim/quiz/recap)
2. `lessons/index.js` 로더에 등록
3. `content/curriculum.js` 에서 해당 레슨 status를 'ready'로
