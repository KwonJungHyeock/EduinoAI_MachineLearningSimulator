// author: eduino
// 비전 지구 CCTV 장면 12종 (Kenney 로우폴리 CC0). 장면마다 평소(base) + 사건(event) 두 장을 렌더한다.
// 축척: 1 단위 ≈ 1.75 m. 도로 칸 1개 = 4, 건물 · 소품 ×4, 차 ×1, 사람(blocky) ×0.6 (CCTV 거리에서 알아보도록 조금 크게).
export interface Item { m: string; x: number; z: number; y?: number; r?: number; s?: number; rx?: number; rz?: number; pose?: string; poseT?: number }
export interface SceneDef {
  id: string; name: string; situation: string; detail: string; base: Item[]; event: Item[];
  cam: [number, number, number]; look: [number, number, number]; fov?: number;
  sky?: string; ground?: string; sun?: [number, number, number]; exposure?: number;
}

const T = 4;
const road = (m: string, gx: number, gz: number, r = 0): Item => ({ m: `city-kit-roads/${m}`, x: gx * T, z: gz * T, r, s: T });
const prop = (m: string, x: number, z: number, r = 0, s = T): Item => ({ m: `city-kit-roads/${m}`, x, z, r, s });
const shop = (m: string, x: number, z: number, r = 0): Item => ({ m: `commercial/${m}`, x, z, r, s: T });
const home = (m: string, x: number, z: number, r = 0, s = T): Item => ({ m: `suburban/${m}`, x, z, r, s });
const car = (m: string, x: number, z: number, r = 0): Item => ({ m: `car-kit/${m}`, x, z, r, s: 1 });
const kit = (m: string, x: number, z: number, r = 0, s = 1, y = 0): Item => ({ m: `car-kit/${m}`, x, z, r, s, y });
const man = (c: string, x: number, z: number, r = 0, pose = 'idle', poseT?: number): Item => ({ m: `blocky/character-${c}`, x, z, r, s: 0.6, pose, poseT });

// 동서로 뻗은 길 + 양쪽 보도 (gx: -n..n)
function street(n = 3, crossingAt: number | null = null): Item[] {
  const it: Item[] = [];
  for (let gx = -n; gx <= n; gx++) {
    it.push(road(gx === crossingAt ? 'road-crossing' : 'road-straight', gx, 0, gx === crossingAt ? 90 : 0));
    it.push(road('tile-low', gx, 1), road('tile-low', gx, -1));
  }
  return it;
}
// 교차로 + 네 방향 + 모서리 보도
function crossroad(n = 3): Item[] {
  const it: Item[] = [road('road-crossroad', 0, 0)];
  for (let d = 1; d <= n; d++) it.push(road('road-straight', d, 0), road('road-straight', -d, 0), road('road-straight', 0, d, 90), road('road-straight', 0, -d, 90));
  for (let gx = -n; gx <= n; gx++) for (let gz = -n; gz <= n; gz++) if (gx && gz) it.push(road('tile-low', gx, gz));
  return it;
}
// 보도 블록 판
function plaza(x0: number, x1: number, z0: number, z1: number): Item[] {
  const it: Item[] = [];
  for (let gx = x0; gx <= x1; gx++) for (let gz = z0; gz <= z1; gz++) it.push(road('tile-low', gx, gz));
  return it;
}
const rowShops = (z: number, r: number, list: string[], x0 = -9, dx = 4.5) => list.map((m, i) => shop(m, x0 + i * dx, z, r));

export const SCENES: SceneDef[] = [
  {
    id: 'cam01', name: '교차로', situation: '신호 위반 차량',
    detail: '빨간불인데 스포츠카가 교차로 한가운데로 들어왔다. 옆 방향 차들은 멈춰 서 있다.',
    base: [
      ...crossroad(),
      shop('building-a', -9, -9), shop('building-d', -4.6, -9.5), shop('building-c', 9, -9), shop('building-b', 4.6, -9.5), shop('building-e', -9, 6, 90),
      home('tree-large', 6.5, 6.5), home('tree-large', 9, 7.5), home('tree-large', -6.5, 9),
      prop('light-square', 5.2, 2.4), prop('light-square', -5.2, -2.4, 180),
      car('sedan', 1.0, 7.2, 180), car('taxi', -1.0, -7.5, 0), car('suv', -7.2, -1.0, 90),
      man('b', 4.5, 4.8, 200, 'idle'), man('h', -5, 5.5, 160, 'walk')
    ],
    event: [car('sedan-sports', 0.4, 0.2, 140)],
    cam: [11, 9, 12], look: [0, 0, 0], fov: 50
  },
  {
    id: 'cam02', name: '횡단보도', situation: '무단횡단',
    detail: '차가 다가오는데 한 사람이 빨간불에 횡단보도를 뛰어 건너고 있다.',
    base: [
      ...street(3, 0),
      ...rowShops(-7, 0, ['building-f', 'building-g', 'building-h', 'building-i', 'building-j']),
      prop('light-square', -4, 2.4), prop('light-square', 4, -2.4, 180),
      man('c', -1.4, 2.7, 180, 'idle'), man('f', -0.6, 2.9, 170, 'idle'), man('k', 1.3, -2.8, 0, 'idle'),
      car('van', -7.5, 0.9, 90)
    ],
    event: [man('n', 0.2, -0.3, 15, 'sprint'), car('sedan', -4.2, 0.9, 90)],
    cam: [7, 8, 10], look: [0, 0, -1], fov: 50
  },
  {
    id: 'cam03', name: '상가 골목', situation: '쓰러진 사람',
    detail: '골목 한가운데 사람이 쓰러져 움직이지 않는다. 지나가던 사람은 아직 보지 못했다.',
    base: [
      ...plaza(-2, 2, -4, 3),
      shop('building-j', -7, -8, 90), shop('building-k', -7, -3.5, 90), shop('building-l', -7, 1, 90),
      shop('building-m', 7, -8, -90), shop('building-n', 7, -3.5, -90), shop('building-a', 7, 1, -90),
      prop('dumpster', 4, -4, -90), prop('construction-cone', -3.5, 3), prop('construction-cone', -4.2, 2.3),
      man('d', -1.5, -8, 0, 'walk')
    ],
    event: [man('q', 0.8, -0.5, 70, 'die')],
    cam: [2, 9, 10], look: [0, 0, -1.5], fov: 50
  },
  {
    id: 'cam04', name: '주차장', situation: '접촉 사고',
    detail: '후진하던 차가 옆 차를 들이받았다. 바닥에 부서진 범퍼 조각이 떨어져 있다.',
    base: [
      ...plaza(-3, 3, -2, 2),
      car('sedan', -6, -4, 0), car('suv', -2, -4, 0), car('hatchback-sports', 2, -4, 0), car('van', 6, -4, 0),
      car('taxi', -6, 4, 180), car('sedan', 6, 4, 180),
      shop('low-detail-building-wide-a', 0, -11), home('tree-large', -10, 0), home('tree-large', 10, 1),
      man('a', 9, 6.5, 210, 'walk')
    ],
    event: [car('suv-luxury', 1.2, 2.6, 155), kit('debris-bumper', -0.3, 1.1, 30, 1.2), kit('debris-plate-a', 0.6, 0.4, 70, 1.2)],
    cam: [9, 10, 12], look: [0, 0, 0], fov: 50
  },
  {
    id: 'cam05', name: '버스정류장', situation: '방치된 가방',
    detail: '정류장 의자 옆에 주인 없는 상자가 30분째 놓여 있다.',
    base: [
      ...street(3),
      ...rowShops(-7.5, 0, ['building-b', 'building-c', 'building-d', 'building-e', 'building-f']),
      shop('detail-awning-wide', -1, -3.2), prop('road-sign-empty', 2.6, -2.4),
      man('e', -2.4, -2.6, 0, 'idle'), man('g', -3.2, -2.8, 20, 'idle'),
      car('truck', 4, 0.9, 270)
    ],
    event: [kit('box', 1.2, -2.6, 20, 0.7)],
    cam: [5, 7, 8.5], look: [0, 0, -2.2], fov: 50
  },
  {
    id: 'cam06', name: '학교 앞', situation: '차도로 뛰어든 아이',
    detail: '공을 쫓던 아이가 갑자기 차도로 뛰어들었다. 차가 바로 앞에 있다.',
    base: [
      ...street(3, -2),
      home('building-type-m', -6, -8), home('building-type-n', 0, -8.5), home('building-type-o', 6, -8),
      home('fence-1x4', -6, -4.6), home('fence-1x4', 0, -4.6), home('fence-1x4', 6, -4.6),
      prop('road-sign-object-warning', 3.5, 2.4), home('tree-small', -9, 3),
      man('i', -5, -2.8, 90, 'walk'), car('sedan', 7, -0.9, 90)
    ],
    event: [{ m: 'blocky/character-p', x: 1.0, z: -0.6, r: 170, s: 0.45, pose: 'sprint' }, car('hatchback-sports', 3.6, -0.9, 270)],
    cam: [-6, 7.5, 10], look: [1, 0, -1], fov: 50
  },
  {
    id: 'cam07', name: '공사장', situation: '쓰러진 공사 펜스',
    detail: '강풍에 공사 펜스가 차도로 밀려 나와 한 차로를 막았다. 콘도 쓰러져 있다.',
    base: [
      ...street(3),
      prop('construction-fence', -3, -2.8), prop('construction-fence', 5, -2.8),
      prop('construction-light', -5.5, -2.4, 0, 2), prop('construction-cone', -1, -2.2), prop('construction-cone', 3, -2.2),
      shop('building-c', -4, -9), shop('building-e', 1, -9), shop('building-h', 6, -9), home('tree-large', 9, -5),
      car('truck-flat', -8, -0.9, 90)
    ],
    event: [prop('construction-fence', 1.2, -1.0, 18), prop('construction-barrier', -0.6, -0.6, 70), { m: 'city-kit-roads/construction-cone', x: 0.2, z: 0.6, y: 0.2, r: 0, rz: 1.5, s: T }, car('sedan', -3.5, 0.9, 90)],
    cam: [8, 7.5, 9], look: [0, 0, -1.5], fov: 50
  },
  {
    id: 'cam08', name: '주택가', situation: '담을 넘는 사람',
    detail: '밤늦게 한 사람이 남의 집 담장을 넘어 들어가고 있다.',
    base: [
      ...street(3),
      home('building-type-a', -6, -7.5), home('building-type-c', 0.5, -7.5), home('building-type-f', 7, -7.5),
      home('fence-1x4', -6, -3.6), home('fence-1x4', 0.5, -3.6), home('fence-1x4', 7, -3.6),
      home('tree-large', -9.5, -5), home('tree-small', 3.6, -5), prop('light-curved', -2.5, -2.4, 90),
      car('suv', 6, 0.9, 270)
    ],
    event: [{ m: 'blocky/character-r', x: 1.6, z: -3.5, y: 0.9, r: 200, s: 0.6, pose: 'pick-up' }],
    cam: [4, 6.5, 7.5], look: [0, 0.4, -3], fov: 52, sky: '#5d7393', exposure: 0.92, sun: [4, 8, 8]
  },
  {
    id: 'cam09', name: '공원 입구', situation: '쓰러진 노인',
    detail: '산책로에서 노인이 갑자기 쓰러졌다. 주변에 사람이 없다.',
    base: [
      ...plaza(-1, 1, -3, 3),
      home('tree-large', -6, -4), home('tree-large', -7, 2), home('tree-large', 6, -5), home('tree-large', 7, 3), home('tree-small', -4, 6), home('tree-small', 4.5, 6.5),
      home('planter', -2.6, -6), home('planter', 2.6, -6), home('path-stones-long', 0, -9),
      man('l', 2.2, -7, 180, 'walk')
    ],
    event: [man('o', -0.6, 0.4, 110, 'die')],
    cam: [3, 7, 8], look: [0, 0, -1], fov: 50, ground: '#6f9a55'
  },
  {
    id: 'cam10', name: '큰길', situation: '역주행 차량',
    detail: '한 차가 반대 차로로 거꾸로 달려오고 있다. 마주 오는 차가 급히 멈췄다.',
    base: [
      ...street(4),
      ...rowShops(-7.5, 0, ['building-skyscraper-a', 'building-g', 'building-skyscraper-c', 'building-k', 'building-skyscraper-b'], -10, 5),
      car('sedan', -6, 0.9, 90), car('van', 8, -0.9, 270), car('taxi', -12, 0.9, 90)
    ],
    event: [car('suv', 2, 0.9, 270), car('hatchback-sports', -1.6, 0.9, 80)],
    cam: [10, 8, 9], look: [0, 0, -1], fov: 50
  },
  {
    id: 'cam11', name: '외곽 도로', situation: '고장으로 멈춘 트럭',
    detail: '트럭이 차로 한가운데 멈춰 비상등만 켜 놓았다. 뒤에서 차가 다가온다.',
    base: [
      ...street(4),
      prop('bridge-pillar-wide', -4, 2.6), prop('bridge-pillar-wide', 4, 2.6), prop('bridge-pillar-wide', 0, 2.6),
      shop('building-i', -6, -9), shop('building-l', 0, -9), shop('building-n', 6, -9),
      car('sedan', 9, -0.9, 270)
    ],
    event: [car('truck', 0, 0.9, 80), kit('cone', -3.2, 0.9, 0, 1), car('taxi', -8, 0.9, 90)],
    cam: [9, 6.5, 9], look: [0, 0.3, 0], fov: 52, exposure: 0.95
  },
  {
    id: 'cam12', name: '시장 거리', situation: '가방을 낚아채 달아나는 사람',
    detail: '한 사람이 다른 사람의 가방을 낚아채 인파 사이로 뛰어가고 있다.',
    base: [
      ...plaza(-3, 3, -2, 2),
      shop('detail-parasol-a', -6, -2.8), shop('detail-parasol-b', -2, -2.8), shop('detail-parasol-a', 2, -2.8), shop('detail-parasol-b', 6, -2.8),
      ...rowShops(-8, 0, ['building-h', 'building-i', 'building-j', 'building-l', 'building-m']),
      man('a', -5, -1.6, 180, 'idle'), man('e', -3.6, 0.5, 90, 'walk'), man('g', 4.5, 1.2, 270, 'walk'), man('j', 6, -1.4, 200, 'idle')
    ],
    event: [man('m', 0.8, 0.6, 80, 'sprint'), man('c', -1.8, 1.4, 60, 'emote-no')],
    cam: [4, 8.5, 10], look: [0, 0, -1], fov: 52
  }
];
