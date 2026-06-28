// 경량 캔버스 플롯 헬퍼 — 좌표 변환·격자·축·점·직선·잔차. (차트 라이브러리 X)
export default class Plot {
  constructor(canvas, { xRange = [0, 10], yRange = [0, 10] } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.pad = { l: 48, r: 20, t: 18, b: 38 };
    this.xR = xRange;
    this.yR = yRange;
  }
  get W() { return this.canvas.width; }   // 캔버스 실제 크기를 동적으로(반응형)
  get H() { return this.canvas.height; }
  get pw() { return this.W - this.pad.l - this.pad.r; }
  get ph() { return this.H - this.pad.t - this.pad.b; }

  toPx(x, y) {
    const px = this.pad.l + ((x - this.xR[0]) / (this.xR[1] - this.xR[0])) * this.pw;
    const py = this.pad.t + (1 - (y - this.yR[0]) / (this.yR[1] - this.yR[0])) * this.ph;
    return [px, py];
  }
  toData(px, py) {
    const x = this.xR[0] + ((px - this.pad.l) / this.pw) * (this.xR[1] - this.xR[0]);
    const y = this.yR[0] + (1 - (py - this.pad.t) / this.ph) * (this.yR[1] - this.yR[0]);
    return [x, y];
  }
  // 캔버스 픽셀(클라이언트) → 논리 좌표
  evToData(ev) {
    const r = this.canvas.getBoundingClientRect();
    const px = ((ev.clientX - r.left) / r.width) * this.W;
    const py = ((ev.clientY - r.top) / r.height) * this.H;
    return { px, py, data: this.toData(px, py) };
  }

  clear(bg = '#0c1422') {
    const c = this.ctx;
    c.fillStyle = bg;
    c.fillRect(0, 0, this.W, this.H);
  }
  grid(step = 1) {
    const c = this.ctx;
    c.strokeStyle = 'rgba(40,60,92,0.5)';
    c.lineWidth = 1;
    c.beginPath();
    for (let x = Math.ceil(this.xR[0]); x <= this.xR[1]; x += step) {
      const [px] = this.toPx(x, 0);
      c.moveTo(px, this.pad.t); c.lineTo(px, this.H - this.pad.b);
    }
    for (let y = Math.ceil(this.yR[0]); y <= this.yR[1]; y += step) {
      const [, py] = this.toPx(0, y);
      c.moveTo(this.pad.l, py); c.lineTo(this.W - this.pad.r, py);
    }
    c.stroke();
  }
  axes(xLabel = 'x', yLabel = 'y') {
    const c = this.ctx;
    c.strokeStyle = 'rgba(120,140,175,0.7)';
    c.lineWidth = 1.5;
    c.beginPath();
    c.moveTo(this.pad.l, this.pad.t); c.lineTo(this.pad.l, this.H - this.pad.b);
    c.lineTo(this.W - this.pad.r, this.H - this.pad.b);
    c.stroke();
    c.fillStyle = '#93a1b8';
    c.font = '12px Pretendard, sans-serif';
    c.textAlign = 'center';
    c.fillText(xLabel, this.pad.l + this.pw / 2, this.H - 8);
    c.save();
    c.translate(14, this.pad.t + this.ph / 2); c.rotate(-Math.PI / 2);
    c.fillText(yLabel, 0, 0);
    c.restore();
  }
  points(arr, color = '#6fb7ff', r = 6) {
    const c = this.ctx;
    for (const p of arr) {
      const [px, py] = this.toPx(p.x, p.y);
      c.beginPath();
      c.fillStyle = color;
      c.arc(px, py, r, 0, Math.PI * 2);
      c.fill();
      c.lineWidth = 1.5;
      c.strokeStyle = 'rgba(255,255,255,0.25)';
      c.stroke();
    }
  }
  line(w, b, color = '#3ddc91', width = 2.5) {
    const c = this.ctx;
    const x0 = this.xR[0], x1 = this.xR[1];
    const [p0x, p0y] = this.toPx(x0, w * x0 + b);
    const [p1x, p1y] = this.toPx(x1, w * x1 + b);
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(p0x, p0y); c.lineTo(p1x, p1y);
    c.stroke();
  }
  residuals(arr, w, b, color = 'rgba(255,90,60,0.55)') {
    const c = this.ctx;
    c.strokeStyle = color;
    c.lineWidth = 1.5;
    c.beginPath();
    for (const p of arr) {
      const pred = w * p.x + b;
      const [px, py] = this.toPx(p.x, p.y);
      const [, py2] = this.toPx(p.x, pred);
      c.moveTo(px, py); c.lineTo(px, py2);
    }
    c.stroke();
  }
}
