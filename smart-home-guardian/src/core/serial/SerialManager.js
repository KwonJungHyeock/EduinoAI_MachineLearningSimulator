// Web Serial 연결 관리(ESP32, 115200). 게임과 분리된 순수 통신 계층.
//  - connect(): 사용자 클릭에서 포트 요청 → 읽기 루프 시작
//  - onSensor(fn): 파싱된 센서 객체 콜백
//  - send(token): 'FAN:1' 등 명령 송신
//  - disconnect(): 정리
import { parseSensorLine, buildCommand, createLineSplitter } from './protocol.js';

export default class SerialManager {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.connected = false;
    this._sensorCbs = new Set();
    this._stateCbs = new Set();
    this._keepReading = false;
  }

  get supported() {
    return typeof navigator !== 'undefined' && 'serial' in navigator;
  }

  onSensor(fn) {
    this._sensorCbs.add(fn);
    return () => this._sensorCbs.delete(fn);
  }
  onState(fn) {
    this._stateCbs.add(fn);
    fn(this.connected);
    return () => this._stateCbs.delete(fn);
  }
  _emitState() {
    for (const fn of this._stateCbs) fn(this.connected);
  }

  async connect() {
    if (!this.supported) throw new Error('이 브라우저는 Web Serial을 지원하지 않습니다 (Chrome/Edge 데스크톱 권장).');
    this.port = await navigator.serial.requestPort();
    await this.port.open({ baudRate: 115200 });
    this.writer = this.port.writable.getWriter();
    this.connected = true;
    this._emitState();
    this._readLoop();
    return true;
  }

  async _readLoop() {
    const decoder = new TextDecoderStream();
    this._readableClosed = this.port.readable.pipeTo(decoder.writable).catch(() => {});
    this.reader = decoder.readable.getReader();
    this._keepReading = true;
    const split = createLineSplitter((line) => {
      const s = parseSensorLine(line);
      if (s) for (const fn of this._sensorCbs) fn(s);
    });
    try {
      while (this._keepReading) {
        const { value, done } = await this.reader.read();
        if (done) break;
        if (value) split(value);
      }
    } catch {
      /* 연결 끊김 */
    } finally {
      this._onDropped();
    }
  }

  async send(token) {
    if (!this.connected || !this.writer) return false;
    try {
      await this.writer.write(new TextEncoder().encode(buildCommand(token)));
      return true;
    } catch {
      return false;
    }
  }

  _onDropped() {
    if (!this.connected) return;
    this.connected = false;
    this._emitState();
  }

  async disconnect() {
    this._keepReading = false;
    try {
      await this.reader?.cancel();
    } catch {}
    try {
      this.reader?.releaseLock();
    } catch {}
    try {
      this.writer?.releaseLock();
    } catch {}
    try {
      await this.port?.close();
    } catch {}
    this.connected = false;
    this._emitState();
  }
}
