# 라이선스 장부

author: eduino

| 파일 | 출처 | 작성자 | 라이선스 | 받은 날 | 쓰는 곳 |
|---|---|---|---|---|---|
| src/assets/fonts/NotoSansKR-400 · 700.woff2 | https://github.com/notofonts/noto-cjk (KS X 1001 한글 2350자 + 영문 부분집합) | Google · Adobe | SIL OFL 1.1 (src/assets/fonts/OFL.txt) | 2026-10-15 | 전 화면 한글 |
| @fontsource/space-grotesk 5.1.0 (500 · 700) | https://github.com/floriankarsten/space-grotesk | Florian Karsten | SIL OFL 1.1 | 2026-10-15 | 영문 · 숫자 표시 |
| react · react-dom · framer-motion | npm | Meta · Framer | MIT | 2026-10-15 | 화면 · 전환 |

| public/vision/cam01~12 (장면 렌더 48장) | Kenney City Kit Roads · Commercial 2.1 · Suburban 2.0 · Car Kit (https://kenney.nl) + 사람: Ultimate Modular Men · Women (https://quaternius.com) 로 조립해 직접 렌더 (tools/scene-render) | Kenney · Quaternius | CC0 1.0 | 2026-10-15 | 비전 1차시 모니터 벽 · 확대 화면 |

* 원본 모델은 저장소에 넣지 않고 tools/scene-render/fetch_kenney.sh 로 다시 받음. CC-BY 는 화면 출처 표기 대상.
| public/vision/ds/* (거리 장면 낮 200 · 밤 80, 조각 · 흑백 장면) | 위와 같은 Kenney · Quaternius 모델로 직접 렌더 (tools/scene-render/dataset.ts) | Kenney · Quaternius | CC0 1.0 | 2026-10-15 | 비전 5~8차시 학습 · 탐지 자료 |
| public/assets/vision_control.webp (관제실) | Kenney Furniture Kit 2.0 (https://kenney.nl/assets/furniture-kit) + Quaternius 사람 + 1차시 CCTV 렌더로 직접 렌더 (tools/scene-render/control.ts) | Kenney · Quaternius | CC0 1.0 | 2026-10-15 | 비전 지구 브리핑 현장 그림 |
| public/assets/core_pedestal.webp (AI 코어 받침대) | three.js 기본 도형으로 직접 모델링 · 렌더 (tools/scene-render/pedestal.ts), 외부 에셋 없음 | eduino | 자체 제작 | 2026-10-15 | 첫 화면 AI 코어 |
| public/found/* · public/assets/foundation_line.webp (선별 라인 · 물건) | three.js 기본 도형 · 회전체로 직접 모델링 · 렌더 (tools/scene-render/recycle.ts), 외부 에셋 없음 | eduino | 자체 제작 | 2026-10-15 | Foundation Lab 장면 · 브리핑 |
