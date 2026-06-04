# Playino : Escape Room — Game Engine Workspace

`Playino : Escape Room` 셸(별도 리포 `KwonJungHyeock/Playino`)의 **미션 방 미니게임**을
**Phaser 3 (MIT, 무료)** 로 제작하는 워크스페이스입니다. 셸의 내비게이션/진척/커리큘럼은
건드리지 않고, 각 방에 꽂을 **독립 ES 모듈**만 만듭니다.

> 전체 배경·계약·커리큘럼은 [`docs/게임엔진_작업지침서_v1.md`](docs/게임엔진_작업지침서_v1.md) 참고.

## 빠른 시작
```bash
npm install
npm run dev      # http://localhost:5173  — 개발용 하니스(셸 시뮬레이터)
npm run build    # dist/ 정적 산출물
```

## 구조
```
src/
  main.js               # 개발용 하니스(셸 시뮬레이터). 셸로 옮기지 않음.
  harness/
    mockBoard.js         # board.js(하드웨어 싱글턴) mock — connected 토글
    mockProgress.js      # progress.js mock (localStorage)
    mockCtx.js           # GameContext 빌더(콜백/say/가드)
  games/
    registry.js          # 하니스 드롭다운용 게임 목록 + mission 메타
    _template.js         # ★ 새 방 시작용 템플릿
    buzzer.js            # 예시 방: 부저 "경보 해제" (사이먼 says)
  shared/
    theme.js             # K-12 안전 공포 팔레트/폰트(셸과 통일)
  styles/harness.css     # 하니스 UI 전용 스타일
docs/                    # 작업지침서
```

## 새 방 만들기
1. `src/games/_template.js` 를 `src/games/<roomId>.js` 로 복사.
2. `mountGame(root, ctx)` 안에 게임 구현. 성공 시 `ctx.onComplete()` **정확히 1회**.
3. `src/games/registry.js` 에 한 줄 등록(드롭다운 노출).
4. `npm run dev` 로 하니스에서 테스트 — **보드 연결 OFF 상태에서도 끝까지 클리어** 확인.

## 계약 핵심 (지침서 §4·§9)
- `export function mountGame(root, ctx) { return { destroy() } }`
- 오프라인(보드 미연결)에서도 클리어 가능 / 실물은 `board.connected`일 때 best-effort.
- `onComplete` 1회(중복 가드). `destroy()`에서 타이머·리스너·Phaser·AudioContext 전부 해제.
- Phaser는 게임 모듈 내부에서 **동적 import**(코드 스플리팅 — 셸 초기 번들 보호).
- K-12 안전 공포 톤. 키보드+포인터 모두 조작 가능.
