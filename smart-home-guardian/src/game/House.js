// 저폴리 코지 스마트홈 1채 + 마당 + 낮/밤 + 위협 VFX + 액추에이터 시각 피드백.
// 외부 GLTF가 없으면 절차적 지오메트리로 폴백(여기 전부 절차적).
import * as THREE from 'three';

const C = {
  wall: 0xcdd6e6,
  wallWarm: 0xe9e0d0,
  roof: 0x7a4b3a,
  ground: 0x2f5d3a,
  door: 0x6b4a32,
  window: 0x9fd8ff,
};

export default class House {
  constructor(app) {
    this.app = app;
    this.scene = app.scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this._buildLights();
    this._buildGround();
    this._buildHouse();
    this._buildActuators();
    this._buildThreatVfx();

    this.daylight = 1;
    this.setDaylight(1);
  }

  // ── 조명 ───────────────────────────────
  _buildLights() {
    this.hemi = new THREE.HemisphereLight(0xbfd4ff, 0x20301f, 0.6);
    this.scene.add(this.hemi);
    this.ambient = new THREE.AmbientLight(0xffffff, 0.25);
    this.scene.add(this.ambient);
    this.sun = new THREE.DirectionalLight(0xfff2dc, 1.1);
    this.sun.position.set(6, 10, 4);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(1024, 1024);
    this.sun.shadow.camera.near = 1;
    this.sun.shadow.camera.far = 40;
    const d = 12;
    Object.assign(this.sun.shadow.camera, { left: -d, right: d, top: d, bottom: -d });
    this.scene.add(this.sun);
  }

  _buildGround() {
    const g = new THREE.Mesh(
      new THREE.CircleGeometry(14, 48),
      new THREE.MeshStandardMaterial({ color: C.ground, roughness: 1 }),
    );
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.group.add(g);
    // 길/마당 포인트
    const path = new THREE.Mesh(
      new THREE.PlaneGeometry(1.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 1 }),
    );
    path.rotation.x = -Math.PI / 2;
    path.position.set(0, 0.01, 4.5);
    path.receiveShadow = true;
    this.group.add(path);
  }

  _mat(color, opts = {}) {
    return new THREE.MeshStandardMaterial({ color, roughness: 0.85, metalness: 0.05, ...opts });
  }

  _buildHouse() {
    // 본체
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 2.6, 4), this._mat(C.wall));
    body.position.y = 1.3;
    body.castShadow = body.receiveShadow = true;
    this.group.add(body);

    // 지붕(피라미드)
    const roof = new THREE.Mesh(new THREE.ConeGeometry(3.5, 1.7, 4), this._mat(C.roof, { flatShading: true }));
    roof.position.y = 2.6 + 0.85;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    this.group.add(roof);

    // 문(서보 잠금) — 앞면
    this.doorPivot = new THREE.Group();
    this.doorPivot.position.set(-0.55, 0, 2.0);
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.12), this._mat(C.door));
    door.position.set(0.55, 0.95, 0);
    door.castShadow = true;
    this.doorPivot.add(door);
    this.doorPivot.rotation.y = -Math.PI / 2.4; // 기본 열림(잠그면 닫힘)
    this.group.add(this.doorPivot);
    // 잠금 표시등(기본 미잠금=옐로)
    this.lockLed = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 12), this._emissive(0xffd11a));
    this.lockLed.position.set(0.05, 1.0, 2.07);
    this.group.add(this.lockLed);

    // 창문 2개(LED 조명 발광)
    this.windows = [];
    for (const wx of [-1.3, 1.3]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), this._emissive(C.window, 0.2));
      win.position.set(wx, 1.5, 2.01);
      this.group.add(win);
      this.windows.push(win);
    }
    // 옆창(거실)
    const sideWin = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), this._emissive(C.window, 0.2));
    sideWin.position.set(2.21, 1.5, 0);
    sideWin.rotation.y = Math.PI / 2;
    this.group.add(sideWin);
    this.windows.push(sideWin);

    // 굴뚝
    const ch = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, 0.5), this._mat(0x8a5a44));
    ch.position.set(1.2, 3.4, 0.6);
    ch.castShadow = true;
    this.group.add(ch);
  }

  _emissive(color, intensity = 1) {
    return new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: intensity, roughness: 0.6 });
  }

  // ── 액추에이터(시각 피드백) ───────────────
  _buildActuators() {
    // 환기팬(옆벽) — FAN on 시 회전
    this.fan = new THREE.Group();
    this.fan.position.set(-2.21, 1.9, 0.8);
    this.fan.rotation.y = -Math.PI / 2;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 12), this._mat(0x444c5a, { metalness: 0.6 }));
    hub.rotation.x = Math.PI / 2;
    this.fan.add(hub);
    this.fanBlades = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.02), this._mat(0xaab4c4, { metalness: 0.4 }));
      blade.position.x = 0.28;
      const holder = new THREE.Group();
      holder.rotation.z = (i * Math.PI) / 2;
      holder.add(blade);
      this.fanBlades.add(holder);
    }
    this.fan.add(this.fanBlades);
    this.fanOn = false;
    this.group.add(this.fan);

    // 부저 비콘(지붕) — BUZZER on 시 점멸
    this.beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 16), this._emissive(0xff3b25, 0));
    this.beacon.position.set(0, 4.6, 0);
    this.group.add(this.beacon);
    this.beaconLight = new THREE.PointLight(0xff3b25, 0, 8);
    this.beaconLight.position.copy(this.beacon.position);
    this.group.add(this.beaconLight);
    this.buzzerOn = false;

    // 실내 조명(LED) 포인트라이트
    this.indoor = new THREE.PointLight(0xffe6a8, 0.0, 10, 2);
    this.indoor.position.set(0, 1.6, 0);
    this.group.add(this.indoor);
    this.ledOn = false;
  }

  // ── 위협 VFX ──────────────────────────
  _buildThreatVfx() {
    // 화재: 불꽃 콘 + 적색 라이트(창문 위치)
    this.fire = new THREE.Group();
    this.fire.position.set(-1.3, 1.0, 2.1);
    for (let i = 0; i < 5; i++) {
      const f = new THREE.Mesh(
        new THREE.ConeGeometry(0.18 - i * 0.02, 0.6, 8),
        this._emissive(i % 2 ? 0xffae3b : 0xff4a2c, 1.2),
      );
      f.position.set((Math.random() - 0.5) * 0.4, 0.3 + i * 0.12, (Math.random() - 0.5) * 0.2);
      this.fire.add(f);
    }
    this.fireLight = new THREE.PointLight(0xff5a2c, 0, 9);
    this.fireLight.position.set(-1.3, 1.6, 2.4);
    this.fire.visible = false;
    this.group.add(this.fire);
    this.group.add(this.fireLight);

    // 침입자: 코믹 실루엣(마당 → 문)
    this.intruder = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x10131a, roughness: 1 });
    const ib = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.7, 6, 12), bodyMat);
    ib.position.y = 0.85;
    const ih = new THREE.Mesh(new THREE.SphereGeometry(0.28, 16, 16), bodyMat);
    ih.position.y = 1.5;
    this.intruder.add(ib, ih);
    this.intruder.visible = false;
    this.group.add(this.intruder);

    // 폭염: 주황 분위기 라이트
    this.heatLight = new THREE.PointLight(0xff8030, 0, 12);
    this.heatLight.position.set(0, 3, 3);
    this.group.add(this.heatLight);

    this._t = 0;
  }

  // ── 상태 적용 ─────────────────────────
  setActuator(name, val) {
    if (name === 'FAN') this.fanOn = val === '1' || val === 1;
    else if (name === 'BUZZER') this.buzzerOn = val === '1' || val === 1;
    else if (name === 'LED') {
      this.ledOn = val === '1' || val === 1;
      this.indoor.intensity = this.ledOn ? 1.6 : 0;
      const e = this.ledOn ? 1.1 : 0.2;
      this.windows.forEach((w) => (w.material.emissiveIntensity = e));
    } else if (name === 'SERVO') {
      const locked = Number(val) >= 45;
      this.doorPivot.rotation.y = locked ? 0 : -Math.PI / 2.4; // 잠금=닫힘
      this.lockLed.material.emissive.setHex(locked ? 0x3ddc91 : 0xffd11a);
    }
  }

  setThreat(vfx, active) {
    if (vfx === 'fire') {
      this.fire.visible = active;
      this.fireLight.intensity = active ? 2.4 : 0;
    } else if (vfx === 'intruder') {
      this.intruder.visible = active;
      this._intruderT = 0;
    } else if (vfx === 'heat') {
      this.heatLight.intensity = active ? 1.6 : 0;
    } else if (vfx === 'blackout') {
      this._blackout = active;
    }
  }

  // 낮(1)~밤(0)
  setDaylight(d) {
    this.daylight = d;
    const sunI = 0.12 + d * 1.0;
    this.sun.intensity = this._blackout ? sunI * 0.15 : sunI;
    this.hemi.intensity = 0.18 + d * 0.5;
    this.ambient.intensity = (this._blackout ? 0.05 : 0.12) + d * 0.18;
    const sky = new THREE.Color(0x0a1424).lerp(new THREE.Color(0x9fc4ff), d);
    this.scene.background.copy(sky);
    this.scene.fog.color.copy(sky);
    const night = 1 - d;
    this.windows.forEach((w) => {
      if (!this.ledOn) w.material.emissiveIntensity = 0.15 + night * 0.5;
    });
  }

  setHumidity(h) {
    // 습도↑ → 안개 가까이(축축한 분위기)
    const f = Math.max(0, Math.min(1, (h - 55) / 45));
    this.scene.fog.near = 16 - f * 9;
    this.scene.fog.far = 36 - f * 12;
  }

  reset() {
    this._blackout = false;
    ['fire', 'intruder', 'heat', 'blackout'].forEach((v) => this.setThreat(v, false));
    ['FAN', 'BUZZER', 'LED'].forEach((n) => this.setActuator(n, '0'));
    this.setActuator('SERVO', '0');
    this.setDaylight(0.08);
  }

  update(dt) {
    this._t += dt;
    if (this.fanOn) this.fanBlades.rotation.z += dt * 16;
    // 부저 점멸
    if (this.buzzerOn) {
      const p = (Math.sin(this._t * 12) + 1) / 2;
      this.beacon.material.emissiveIntensity = p * 2;
      this.beaconLight.intensity = p * 2.4;
    } else {
      this.beacon.material.emissiveIntensity = 0;
      this.beaconLight.intensity = 0;
    }
    // 불꽃 흔들림
    if (this.fire.visible) {
      this.fire.children.forEach((f, i) => {
        f.scale.y = 0.8 + Math.sin(this._t * 10 + i) * 0.25;
        f.material.emissiveIntensity = 1 + Math.sin(this._t * 14 + i) * 0.4;
      });
      this.fireLight.intensity = 2 + Math.sin(this._t * 18) * 0.8;
    }
    // 침입자 접근
    if (this.intruder.visible) {
      this._intruderT = Math.min(1, (this._intruderT || 0) + dt * 0.25);
      this.intruder.position.set(2.5 - this._intruderT * 2.0, 0, 6 - this._intruderT * 2.6);
      this.intruder.rotation.y = Math.sin(this._t * 4) * 0.1;
    }
  }
}
