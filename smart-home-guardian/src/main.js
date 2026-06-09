// SMART HOME GUARDIAN — 진입점. 모든 모듈 배선.
import './styles.css';
import ThreeApp from './core/ThreeApp.js';
import SerialManager from './core/serial/SerialManager.js';
import SensorBus from './core/SensorBus.js';
import House from './game/House.js';
import Score from './game/Score.js';
import NightLoop from './game/NightLoop.js';
import HUD from './ui/HUD.js';
import { wireConnect } from './ui/ConnectPanel.js';
import SimInput from './sim/SimInput.js';

const canvas = document.getElementById('scene');
const uiRoot = document.getElementById('ui');

const app = new ThreeApp(canvas);
const house = new House(app);
const serial = new SerialManager();
const bus = new SensorBus(serial);
const score = new Score();

let loop;
const hud = new HUD(uiRoot, bus, {
  onStart: () => loop.start(),
  onRestart: () => {
    house.reset();
    hud.resetActs();
    loop.reset();
    loop.start();
  },
});
loop = new NightLoop({ bus, house, score, hud, app });

// 액추에이터 명령 → 집 시각 피드백(실물은 SensorBus.act 안에서 시리얼로 전송)
bus.onAct((token) => {
  const [name, val] = token.split(':');
  house.setActuator(name, val);
});

wireConnect(hud.connectBtn, serial, hud);
new SimInput(bus, hud);

app.onUpdate((dt) => {
  house.update(dt);
  loop.update(dt);
  hud.updateSensors(bus.state);
});
app.start();
