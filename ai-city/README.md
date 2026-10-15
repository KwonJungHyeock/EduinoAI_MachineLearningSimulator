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

## 구성
```
src/
  data/districts.ts     지구(=트랙) 문구 · 키 컬러 · 차시 흐름 — 화면 문구는 이 한 곳에서
  motion/useCanvas.ts   캔버스 모션 공통 (화면 배율 · 화면 밖 일시정지 · 30 fps · 움직임 줄이기 설정 대응)
  motion/motifs.ts      트랙별 원리 모션 7종 (코드로 만든 추상 모션)
  motion/heroField.ts   첫 화면 배경 (도시 위 신경망 + 지구 색 데이터 펄스)
  components/           상단 바 · 캔버스 · 에셋 슬롯
  screens/              Hero(첫 화면) · Select(지구 선택) · Brief(진입 브리핑)
  styles/global.css     디자인 토큰 · 화면 스타일
  assets/fonts/         Noto Sans KR 부분집합(한글 2350자, OFL)
```

## 규칙
- 추상 모션(데이터 · 신경망 · 파형)은 코드로, 장소 · 사물 그림은 에셋만 (없으면 빈 슬롯에 파일명)
- 화면 수치는 코드 계산값만. 지구 · 현장 이름과 차시는 초안 표시
- 외부 CDN 없음 — 글꼴 · 라이브러리 모두 번들
