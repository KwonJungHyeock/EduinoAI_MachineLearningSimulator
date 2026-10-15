# AI 미래도시 (가칭) — 컨셉 시안

author: eduino

기술 이름으로 배우는 AI 학습 플랫폼의 첫 시안입니다. 첫 화면 → 지구 선택 → 지구 진입 브리핑까지 들어 있습니다.
확정된 방향은 `CONCEPT.md` 를 보세요.

## 실행
```
npm install
npm run dev      # 개발 서버
npm run build    # dist/ 생성 (웹 플랫폼에 올릴 정적 파일, 상대 경로)
npm run preview  # 빌드 결과 확인
```

## 배포 (Vercel)
Vercel 프로젝트 설정: Root Directory = `ai-city`, Framework = Vite, 명령은 기본값(덮어쓰기 없음). 저장소 루트에는 vercel.json 을 두지 않는다.

## 구성
```
src/
  data/districts.ts     지구(=트랙) 문구 · 키 컬러 · 차시 흐름 — 화면 문구는 이 한 곳에서
  motion/pointer.ts     마우스 위치 한 곳에서 추적 (캔버스마다 부드럽게 따라감 · 클릭 물결)
  motion/useCanvas.ts   캔버스 모션 공통 (화면 배율 · 화면 밖 일시정지 · 30 fps · 움직임 줄이기 설정 대응)
  motion/motifs.ts      트랙별 원리 모션 7종 — 마우스로 원리를 직접 움직임
  motion/heroField.ts   첫 화면 배경 (도시 위 신경망) — 커서 주변 노드 반응 · 클릭하면 펄스
  motion/patternField.ts 지구 선택 배경 점 격자 — 커서 주변만 물듦
  components/           상단 바 · 캔버스 · 에셋 슬롯 · 마우스 반응(스포트라이트 · 자석 버튼)
  screens/              Hero(첫 화면) · Select(지구 선택) · Brief(진입 브리핑)
  styles/global.css     디자인 토큰 · 화면 스타일
  assets/fonts/         Noto Sans KR 부분집합(한글 2350자, OFL)
```

## 비전 지구 차시 (공통 양식 v2: 미션 → 예측 → 실험 → 개념 → 적용 → 정리 + 차시 평가)
모든 화면 수치는 `src/sim/*` 계산값이며, 같은 코드를 node 로 돌리는 점검이 있습니다:
`node --experimental-strip-types --no-warnings tools/check_visionNN.ts`

| 차시 | 주제 | 계산 | 점검 결과(요약) |
|---|---|---|---|
| 1 | 사람 눈으로는 다 못 본다 | sim/surveillance.ts | 카메라 4대 0% → 32대 절반 넘게 놓침 |
| 2 | 이미지는 숫자다 | sim/pixels.ts | 32×20 · 기준 15 모두 찾고 헛알림 0 |
| 3 | 필터로 윤곽 찾기 | sim/filters.ts | 세로 윤곽 필터 물체 대비 1.9배 |
| 4 | 색으로 물체 골라내기 | sim/colors.ts | 색만 → 정밀 22%, 색 + 변화 → 목표 |
| 5 | 분류 대결 kNN vs CNN | sim/nn.ts | 조각 100개 kNN 81% > CNN 74%, 1000개 CNN 97% > kNN 92% |
| 6 | 객체 탐지 | sim/detect.ts | 5차시 모델 정밀 7% → 헛탐지 다시 학습 89% · 재현 78% |
| 7 | 교차로 위험 감지 | sim/alarm.ts | 기준점 가운데 헛경보 5 · 놓침 6 → 발 + 횡단보도 예외 1 · 3 |
| 8 | 밤의 교차로 — 데이터 편향 | sim/detect.ts | 낮만 배운 모델 밤 재현 35% → 밤 조각 79%(정밀 52%) → 헛탐지 다시 학습 · 기준 0.3 낮 83/83 · 밤 90/79 |
| 끝 | 트랙 종합 평가 | screens/TrackFinal.tsx | OX 7 · 단답 3 · 서술 1 → 리포트 PDF |

장면 · 데이터셋은 `tools/scene-render`(three.js + CC0 모델)로 직접 렌더: CCTV 장면 12개, 거리 장면 낮 200 · 밤 80장
(조각 `public/vision/ds/crops.json`, 흑백 장면 `public/vision/ds/g/*.png`, 6차시 탐지 모델 `det_model.json` — `check_vision06.ts` 가 만듦).

## 마우스 반응
| 지구 | 마우스로 하는 일 |
|---|---|
| 머신러닝 기초 | 기준선이 커서 쪽으로 돌아가며 두 무리를 다시 가름 |
| AI 영상처리 | 스캔 선을 커서가 끌고 다님, 주변은 확대 렌즈 |
| 언어 모델 · LLM | 커서 = 질문, 가까운 단어 구름일수록 주의(attention) 선이 굵어짐 |
| 음성 AI | 커서 높이 = 소리 크기, 좌우 = 음 높이 → 파형 · 스펙트로그램이 바뀜 |
| 데이터 예측 AI | 커서로 '지금'을 옮기면 예측 구간이 바뀜 |
| 피지컬 AI | 커서가 목표가 되고 로봇 팔이 따라감 |
| 생성형 AI | 커서 주변부터 노이즈가 걷히며 형태가 드러남 |

## 규칙
- 추상 모션(데이터 · 신경망 · 파형)은 코드로, 장소 · 사물 그림은 에셋만 (없으면 빈 슬롯에 파일명)
- 화면 수치는 코드 계산값만. 지구 · 현장 이름과 차시는 초안 표시
- 외부 CDN 없음 — 글꼴 · 라이브러리 모두 번들
