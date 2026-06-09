# SMART HOME GUARDIAN

ESP32 스마트홈 키트 기반 **Three.js 3D 나이트 디펜스 생존 게임**. 매일 밤 집에 위협(화재·폭염·침입·정전)이
닥치고, **센서로 감지 → 액추에이터로 대응**해 막아낸다. 하드웨어가 없으면 **키보드 시뮬**로 끝까지 플레이 가능.

## 빠른 시작
```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # dist/ → Vercel
```

## 조작 (시뮬)
- 센서: `W/S` 온도 · `A/D` 습도 · `F` 불꽃 · `P` 침입 · `L` 조도
- 대응: `1` 환기팬 · `2` 경보 · `3` 조명 · `4` 문잠금 (화면 버튼도 가능)
- 우상단 **[기기 연결]** → ESP32(Web Serial, 115200) 연결 시 실물 센서/출력 구동

## 구조
```
src/
  core/      ThreeApp(렌더·루프), SensorBus(sim/serial 추상), serial/(SerialManager·protocol)
  game/      House(3D 집·낮밤·VFX), NightLoop(디렉터), Score, threats/(데이터 주도 위협)
  ui/        HUD, ConnectPanel
  sim/       SimInput(키보드)
firmware/    smart_home_guardian.ino  (ESP32: 센서→S:, C:→액추에이터)
```

## 위협 추가(확장)
`src/game/threats/<id>.js` 파일 1개 추가 → `threats/index.js`에 등록만. 엔진(NightLoop) 수정 불필요.
```js
export default { id, name, icon, cue, detect:(s)=>..., arm, disarm, solve:['FAN:1'], timeLimit, vfx, damageOnFail };
```

## 통신 계약
- ESP32 → 게임: `S:temp=24,humi=55,flame=0,pir=0,light=300\n`
- 게임 → ESP32: `C:FAN:1` `C:BUZZER:1` `C:LED:1` `C:SERVO:90` `C:LCD:ALERT`

> 펌웨어 핀 번호는 키트 매뉴얼로 확인 후 `firmware/*.ino` 상단 PIN MAP만 교체.
