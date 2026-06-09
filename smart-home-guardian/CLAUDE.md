# CLAUDE.md — SMART HOME GUARDIAN

## 절대 규칙
- 바닐라 JS(ES Modules), TypeScript 금지. 3D는 Three.js만. 유료 라이브러리 금지.
- 위협은 데이터 객체(src/game/threats/*). 엔진(NightLoop)은 배열만 다룬다.
- 시리얼은 게임과 분리(core/serial). 하드웨어 없이 **키보드 시뮬로 끝까지 플레이 가능**해야 함.
- Web Serial은 보안 컨텍스트(https/localhost)에서만. 미지원/실패 시 시뮬로 자동 우회.
- 씬/루프 종료 시 리스너·타이머·Three 리소스 해제(누수 금지).
- K-12 안전 표현(고어/폭력/공포 직접묘사 금지, 위협은 추상·코믹).
- 변경 전 계획 먼저 제시.

## 명령
- 개발: `npm run dev` · 빌드: `npm run build`

## 통신 계약
- 센서 S:key=val,.. / 명령 C:NAME:VAL  (protocol.js 단일 출처)
