# Playino : Escape Room

어둠 속 폐연구소에서 깨어난 로봇 **EDDIE**가 방마다의 학습 미션(탈출 퍼즐)을 풀어
시설을 복구·탈출하는 **K-12 안전 공포** 교육 게임. **Phaser 3 (MIT, 무료) 고퀄 2D**로
인트로·로그인·커리큘럼·미션 방·엔딩까지 전면 제작합니다.

> 컨셉/스토리: [`docs/Playino_EscapeRoom_컨셉.md`](docs) · 작업 계약: [`docs/게임엔진_작업지침서_v1.md`](docs)

## 빠른 시작
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ → Vercel
```

## 현재 상태 (Phase 1 · 수직 슬라이스 진행 중)
- [x] 게임 앱 기반(Phaser 부팅·씬 매니저·테마·DOM 오버레이 루트)
- [x] **부팅 스플래시**(EDUINO AI) → **타이틀**(Playino : Escape Room)
- [x] **살아있는 EDDIE** — 눈빛 글로우·깜빡임·들썩임·상태별 눈색(절차적, 에셋 불필요)
- [x] 폐연구소 연출 — 비상등 깜빡임·먼지·비네팅·조명 풀
- [ ] 로그인 / 사용환경 점검  ← 기존 셸 포팅 후
- [ ] 연구소 복도(HUB) — 진척에 따라 밝아짐
- [ ] LED 방 1개(학습 사이클 + 미니게임) 목표 퀄리티 완성 → 룩 승인 → 양산

## 구조
```
src/
  main.js                 # 엔트리(폰트 로드 후 게임 부팅)
  game/
    config.js             # Phaser 설정 + 씬 등록
    scenes/               # Boot/Preload/Splash/Title/ComingSoon
    objects/Eddie.js      # 절차적 애니메이션 캐릭터
    fx/textures.js        # glow/dust/vignette 등 연출 텍스처
  ui/                     # DOM 오버레이(로그인/에디터, 추후)
  shared/theme.js         # 팔레트·폰트·씬키·기준해상도
  styles/app.css
docs/                     # 컨셉/작업지침서
```

## 다음 작업에 필요한 것
1. **기존 셸 리포(`KwonJungHyeock/Playino`) 접근 권한** — WebSerial·펌웨어·인터프리터·
   커리큘럼·EDDIE 에셋 포팅용(이 세션 범위에 추가 필요).
2. `게임콘텐츠_명세서_4챕터_상세.md` — 미니게임 핀/난이도/판정 정본.
3. (선택) EDDIE 스프라이트/표정 프레임, Figma 확정 색·폰트.

> `src/harness/`·`src/games/` 의 buzzer/template은 초기 `mountGame` 계약 실험본(참고용).
> 전면 리빌드에서는 방을 Phaser 씬으로 구현합니다.
