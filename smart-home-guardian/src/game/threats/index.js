// 위협 레지스트리 — 새 위협은 파일 1개 추가 후 여기 등록만 하면 됨(엔진 수정 X).
import fire from './fire.js';
import heat from './heat.js';
import intruder from './intruder.js';
import blackout from './blackout.js';

export const THREATS = [fire, heat, intruder, blackout];
export const byId = Object.fromEntries(THREATS.map((t) => [t.id, t]));
