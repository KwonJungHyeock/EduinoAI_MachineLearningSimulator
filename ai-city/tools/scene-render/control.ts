// author: eduino
// 관제실 장면 렌더(개발용): 어두운 관제실 + 실제 CCTV 장면(1차시 렌더)이 흐르는 영상 벽 + 책상 · 모니터 · 근무자.
// ?control=1&w=1600  → window.__out 에 PNG dataURL. 가구는 Kenney Furniture Kit(CC0), 사람은 Quaternius(CC0).
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

const F = 1.95; // 가구 배율(책상 높이 0.75 m)
const loader = new GLTFLoader(), tl = new THREE.TextureLoader();
const tex = (n: string) => tl.loadAsync(`/models/tex/${n}.webp`).then((t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; });

async function model(m: string, x: number, y: number, z: number, r = 0, s = F, pose?: string) {
  const g = await loader.loadAsync(`/models/${m}.${m.startsWith('people/') ? 'gltf' : 'glb'}`), o = skClone(g.scene);
  if (pose && g.animations.length) { const mx = new THREE.AnimationMixer(o), c = g.animations.find((a) => a.name === pose) ?? g.animations[0]; mx.clipAction(c).play(); mx.setTime(c.duration * 0.3); mx.update(0); }
  o.position.set(x, y, z); o.rotation.y = (r * Math.PI) / 180; o.scale.setScalar(s);
  o.traverse((c) => { const me = c as THREE.Mesh; if (!me.isMesh) return; me.castShadow = true; me.receiveShadow = true;
    const mats = (Array.isArray(me.material) ? me.material : [me.material]) as THREE.MeshStandardMaterial[];
    mats.forEach((mt) => {
      mt.roughness = m.startsWith('people/') ? 0.8 : 0.55; mt.metalness = 0; mt.envMapIntensity = 0.35;
      // 관제실 가구 색: 짙은 회색 계열(밝은 원색 대신)
      if (m.includes('desk') && !m.includes('chair')) { mt.color.set('#2c333c'); mt.roughness = 0.45; }
      if (m.includes('chair')) { mt.color.set('#1b2028'); mt.roughness = 0.6; }
      if (m.includes('Keyboard')) mt.color.set('#15191f');
    });
  });
  return o;
}
// 화면(빛나는 판) + 얇은 테두리
function screen(t: THREE.Texture | null, w: number, h: number, color = '#0b1220', glow = 1) {
  const g = new THREE.Group();
  const bez = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, h + 0.05, 0.06), new THREE.MeshStandardMaterial({ color: '#0c0f14', roughness: 0.35, metalness: 0.4 }));
  bez.castShadow = true; g.add(bez);
  const mat = t ? new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: new THREE.Color(glow, glow, glow) }) : new THREE.MeshBasicMaterial({ color, toneMapped: false });
  const p = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat); p.position.z = 0.032; g.add(p);
  return g;
}
// 모니터 화면용 UI 그림(코드로 그린 추상 화면: 그래프 · 격자)
function uiTex(seed: number) {
  const c = document.createElement('canvas'); c.width = 320; c.height = 200; const x = c.getContext('2d')!;
  x.fillStyle = '#071319'; x.fillRect(0, 0, 320, 200);
  x.strokeStyle = 'rgba(20,184,166,0.25)'; for (let i = 0; i < 320; i += 20) { x.beginPath(); x.moveTo(i, 0); x.lineTo(i, 200); x.stroke(); }
  for (let j = 0; j < 200; j += 20) { x.beginPath(); x.moveTo(0, j); x.lineTo(320, j); x.stroke(); }
  x.strokeStyle = '#2dd4bf'; x.lineWidth = 3; x.beginPath();
  for (let i = 0; i <= 32; i++) { const v = 120 - Math.sin(i * 0.5 + seed) * 30 - Math.cos(i * 0.23 + seed * 2) * 20; i ? x.lineTo(i * 10, v) : x.moveTo(0, v); } x.stroke();
  x.fillStyle = '#f97316'; x.fillRect(16, 16, 70, 10); x.fillStyle = 'rgba(255,255,255,0.7)'; x.fillRect(16, 34, 120, 6); x.fillRect(16, 46, 90, 6);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export async function control(W: number) {
  const H = Math.round(W * 0.625);
  RectAreaLightUniformsLib.init();
  const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  renderer.setSize(W, H); renderer.setPixelRatio(1); renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  document.body.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); scene.background = new THREE.Color('#05080d'); scene.fog = new THREE.Fog('#05080d', 9, 22);
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  scene.add(new THREE.HemisphereLight('#3a5873', '#07090c', 0.2));

  // 방: 광택 있는 어두운 바닥 · 뒷벽 · 옆벽
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#10151c', roughness: 0.32, metalness: 0.2 }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
  const wallM = new THREE.MeshStandardMaterial({ color: '#0f151d', roughness: 0.75 });
  const back = new THREE.Mesh(new THREE.PlaneGeometry(30, 7), wallM); back.position.set(0, 3.5, -6.2); back.receiveShadow = true; scene.add(back);
  for (const sx of [-1, 1]) { const w = new THREE.Mesh(new THREE.PlaneGeometry(16, 7), wallM); w.position.set(sx * 8.5, 3.5, 1.5); w.rotation.y = -sx * Math.PI / 2; w.receiveShadow = true; scene.add(w); }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.MeshStandardMaterial({ color: '#0b0f15', roughness: 0.9 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = 5; scene.add(ceil);

  // 영상 벽: 4 × 3 화면 (1차시 CCTV 장면, 사건 장면 몇 개는 주황 테두리로 강조)
  const ids = Array.from({ length: 12 }, (_, i) => `cam${String(i + 1).padStart(2, '0')}`), hot = new Set([2, 6, 9]);
  const sw = 1.62, sh = 1.0, gap = 0.07, x0 = -((sw + gap) * 4 - gap) / 2 + sw / 2, y0 = 1.25;
  for (let k = 0; k < 12; k++) {
    const c = k % 4, r = Math.floor(k / 4), t = await tex(`${ids[k]}-${hot.has(k) ? 'event' : 'base'}`);
    const s = screen(t, sw, sh, '#000', 1); s.position.set(x0 + c * (sw + gap), y0 + (2 - r) * (sh + gap) + sh / 2, -6.1); scene.add(s);
    if (hot.has(k)) { const f = new THREE.Mesh(new THREE.PlaneGeometry(sw + 0.06, sh + 0.06), new THREE.MeshBasicMaterial({ color: '#f97316', toneMapped: false })); f.position.set(s.position.x, s.position.y, -6.075); const inner = new THREE.Mesh(new THREE.PlaneGeometry(sw, sh), new THREE.MeshBasicMaterial({ map: t, toneMapped: false, color: new THREE.Color(0.92, 0.92, 0.92) })); inner.position.set(s.position.x, s.position.y, -6.06); scene.add(f, inner); }
  }
  // 영상 벽이 방을 비추는 빛 + 벽 아래 청록 띠 조명
  const wallLight = new THREE.RectAreaLight('#cfe6ff', 6, 6.8, 3.2); wallLight.position.set(0, 2.9, -5.95); wallLight.lookAt(0, 2.6, 0); scene.add(wallLight);
  const strip = new THREE.Mesh(new THREE.BoxGeometry(12, 0.03, 0.03), new THREE.MeshBasicMaterial({ color: '#2dd4bf', toneMapped: false })); strip.position.set(0, 0.6, -6.1); scene.add(strip);
  const tealL = new THREE.RectAreaLight('#14b8a6', 3, 12, 0.2); tealL.position.set(0, 0.6, -6.0); tealL.lookAt(0, 0.2, 0); scene.add(tealL);
  // 옆벽 세로 조명 띠
  for (const z of [-4, -1, 2]) for (const sx of [-1, 1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.02, 3.2, 0.06), new THREE.MeshBasicMaterial({ color: '#2dd4bf', toneMapped: false })); b.position.set(sx * 8.48, 2.4, z); scene.add(b); }
  // 천장 조명(부드러운 스포트)
  for (const [x, z] of [[-3, -1.5], [3, -1.5], [-3, 2], [3, 2]]) {
    const l = new THREE.SpotLight('#ffe8cc', 5, 9, 0.7, 0.85, 1.6); l.position.set(x, 4.9, z); l.target.position.set(x, 0, z + 0.3); l.castShadow = true; l.shadow.mapSize.set(1024, 1024); l.shadow.bias = -0.0005; scene.add(l, l.target);
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.03, 24), new THREE.MeshBasicMaterial({ color: '#fff3df', toneMapped: false })); lamp.position.set(x, 4.98, z); scene.add(lamp);
  }

  // 책상 두 줄(각 4개) + 모니터 2대 · 키보드 · 의자
  const dw = 0.734 * F, rows = [{ z: -3.0 }, { z: -0.6 }];
  let seed = 0;
  for (const row of rows) for (let i = 0; i < 4; i++) {
    const x = (i - 1.5) * (dw + 0.04);
    scene.add(await model('furniture/desk', x, 0, row.z, 0));
    for (const dx of [-0.36, 0.36]) {
      const mon = screen(uiTex(seed++), 0.6, 0.36); mon.position.set(x + dx, 0.75 + 0.33, row.z - 0.2); mon.rotation.y = dx < 0 ? 0.12 : -0.12; scene.add(mon);
      const glow = new THREE.RectAreaLight('#2dd4bf', 1.2, 0.6, 0.36); glow.position.set(x + dx, 1.08, row.z - 0.15); glow.lookAt(x + dx, 1.0, row.z + 2); scene.add(glow);
      const stand = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.05), new THREE.MeshStandardMaterial({ color: '#0c0f14', roughness: 0.4 })); stand.position.set(x + dx, 0.88, row.z - 0.24); scene.add(stand);
    }
    scene.add(await model('furniture/computerKeyboard', x, 0.75, row.z + 0.1, 180));
    scene.add(await model('furniture/chairDesk', x, 0, row.z + 0.75, 180));
  }
  // 근무자: 앞줄 둘, 뒷줄 하나, 영상 벽 앞 책임자
  scene.add(await model('people/m-suit', -1.55, 0, -2.2, 180, 1, 'Idle'));
  scene.add(await model('people/f-formal', 1.6, 0, -2.25, 200, 1, 'Interact'));
  scene.add(await model('people/m-casual-hoodie', -0.1, 0, 0.25, 175, 1, 'Idle_Neutral'));
  scene.add(await model('people/f-suit', 2.6, 0, -4.7, 210, 1, 'Idle'));
  scene.add(await model('furniture/pottedPlant', -5.6, 0, -5.5, 0));
  scene.add(await model('furniture/pottedPlant', 5.6, 0, -5.5, 40));

  const cam = new THREE.PerspectiveCamera(42, W / H, 0.1, 60); cam.position.set(3.0, 2.3, 5.8); cam.lookAt(-0.3, 2.0, -6);
  const comp = new EffectComposer(renderer, new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, samples: 4 }));
  comp.setPixelRatio(1); comp.setSize(W, H); comp.addPass(new RenderPass(scene, cam));
  const ao = new GTAOPass(scene, cam, W, H); ao.updateGtaoMaterial({ radius: 0.8, distanceExponent: 1.2, thickness: 1.5, scale: 1.3, samples: 16 }); comp.addPass(ao);
  comp.addPass(new UnrealBloomPass(new THREE.Vector2(W, H), 0.35, 0.6, 0.82));
  comp.addPass(new OutputPass()); comp.render();
  return renderer.domElement.toDataURL('image/png');
}
