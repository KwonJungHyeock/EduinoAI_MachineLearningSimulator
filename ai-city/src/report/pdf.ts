// author: eduino
// 학습 리포트 PDF — 저장된 진도(계산값 · 학생 답)만으로 만든다. 한글 글꼴은 누를 때만 불러옴(TrueType 부분집합).
import type { Progress } from '../store/progress';
import { ASSESS } from '../data/assess';
import { LAB_PLAN, DISTRICTS } from '../data/districts';

async function fontB64(url: string) {
  const buf = await (await fetch(url)).arrayBuffer();
  let s = ''; const b = new Uint8Array(buf);
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}
const pct = (x: number) => `${Math.round(x * 100)}%`;
const day = (t?: number) => (t ? new Date(t).toLocaleDateString('ko-KR') : '-');

export async function downloadReport(p: Progress, lab = 'vision') {
  const plan = LAB_PLAN[lab] ?? LAB_PLAN.vision, VISION_LESSONS = plan.lessons, track = plan.track, pre = plan.prefix, labName = DISTRICTS.find((d) => d.id === lab)?.district ?? 'Vision Lab';
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const [r, b] = await Promise.all([fontB64('./fonts/NotoSansKR-400.ttf'), fontB64('./fonts/NotoSansKR-700.ttf')]);
  doc.addFileToVFS('NotoR.ttf', r); doc.addFont('NotoR.ttf', 'Noto', 'normal');
  doc.addFileToVFS('NotoB.ttf', b); doc.addFont('NotoB.ttf', 'Noto', 'bold');
  const W = 210, M = 16; let y = 18;
  const font = (w: 'normal' | 'bold', size: number, color = '#18201d') => { doc.setFont('Noto', w); doc.setFontSize(size); doc.setTextColor(color); };
  // 글꼴 부분집합에 없는 기호는 비슷한 글자로
  const fix = (s: string) => s.replace(/−/g, '-').replace(/✕/g, 'X').replace(/≠/g, '!=').replace(/[①②]/g, (c) => (c === '①' ? '1' : '2'));
  const text = (s: string, x: number, maxW = W - M * 2, lh = 5.2) => { const lines = doc.splitTextToSize(fix(s), maxW); doc.text(lines, x, y); y += lines.length * lh; };
  const need = (h: number) => { if (y + h > 285) { doc.addPage(); y = 18; } };

  // 머리
  font('bold', 18); doc.text(`${track} 학습 결과 보고서`, M, y); y += 8;
  font('normal', 10, '#4b5552'); doc.text(`학생: ${p.student || '(이름 미입력)'}   ·   발행일: ${new Date().toLocaleDateString('ko-KR')}   ·   EDUINO AI · AI LabCity · ${labName}`, M, y); y += 4;
  doc.setDrawColor('#18201d'); doc.setLineWidth(0.8); doc.line(M, y, W - M, y); y += 8;

  // 차시 요약 표
  font('bold', 12); doc.text('차시별 결과', M, y); y += 6;
  font('bold', 9, '#ffffff'); doc.setFillColor('#18201d'); doc.rect(M, y - 4.2, W - M * 2, 6.5, 'F');
  const cols = [M + 2, M + 12, M + 78, M + 118, M + 150];
  ['차시', '제목', '상태', '평가 (OX · 단답 · 서술 핵심어)', ''].forEach((h, i) => doc.text(h, cols[i], y));
  y += 6;
  for (const l of VISION_LESSONS) {
    const rec = p.lessons[`${pre}-${l.n}`]; const a = rec?.assess;
    font('normal', 9);
    doc.text(String(l.n), cols[0], y); doc.text(l.title, cols[1], y);
    doc.text(rec?.status === 'done' ? `완료 ${day(rec.updatedAt)}` : rec ? '열림 (아직 안 함)' : '잠김', cols[2], y);
    doc.text(a ? `OX ${a.ox[0]}/${a.ox[1]} · 단답 ${a.short[0]}/${a.short[1]} · 핵심어 ${a.essay.filter((e) => e.hit).length}/${a.essay.length}` : '-', cols[3], y);
    doc.setDrawColor('#c9cfcc'); doc.setLineWidth(0.2); doc.line(M, y + 2, W - M, y + 2); y += 6.5;
  }
  { const f = p.lessons[`${pre}-final`], a = f?.assess; font('bold', 9);
    doc.text('종합', cols[0], y); doc.text('단원 종합평가', cols[1], y); font('normal', 9);
    doc.text(f?.status === 'done' ? `완료 ${day(f.updatedAt)}` : f ? '열림 (아직 안 함)' : '잠김', cols[2], y);
    doc.text(a ? `OX ${a.ox[0]}/${a.ox[1]} · 단답 ${a.short[0]}/${a.short[1]} · 핵심어 ${a.essay.filter((e) => e.hit).length}/${a.essay.length}` : '-', cols[3], y);
    y += 6.5; }
  y += 4;

  // 평가 답(차시 · 종합 공통)
  const answers = (a: NonNullable<Progress['lessons'][string]['assess']>, items: (typeof ASSESS)[string]['items']) => {
    items.forEach((it, i) => {
      need(14); const v = a.answers[i];
      font('normal', 9);
      if (it.kind === 'ox') text(`[OX] ${it.q}  →  내 답 ${v === true ? 'O' : v === false ? 'X' : '-'} (${v === it.answer ? '맞음' : '다시'})`, M);
      if (it.kind === 'short') text(`[단답] ${it.q}  →  내 답 "${v ?? ''}"`, M);
      if (it.kind === 'essay') {
        text(`[서술] ${it.q}`, M); font('normal', 9, '#2b3330'); text(`내 답: ${v ?? ''}`, M + 4, W - M * 2 - 4);
        font('normal', 8.5, '#4b5552'); text(`핵심어 확인: ${a.essay.map((e) => `${e.hit ? '✓' : '✕'} ${e.label}`).join('   ')}`, M + 4);
        need(12); doc.setDrawColor('#18201d'); doc.setLineWidth(0.3); doc.rect(M + 4, y - 3.5, W - M * 2 - 4, 9);
        font('normal', 9); doc.text('교사 확인:   □ 적절    □ 보완 필요     의견: ______________________________', M + 7, y + 2); y += 9;
      }
    });
  };

  // 차시 상세 (완료한 차시만)
  for (const l of VISION_LESSONS) {
    const rec = p.lessons[`${pre}-${l.n}`]; if (!rec || rec.status !== 'done') continue;
    need(60);
    font('bold', 12); doc.text(`${l.n}차시 · ${l.title}`, M, y); y += 7;
    // 내 실험 그래프 (카메라 수 – 놓친 비율)
    const ch = rec.chart;
    if (ch && ch.x.length) {
      font('bold', 10); doc.text(`내 실험: ${ch.title}`, M, y); y += 3;
      const gx = M + 10, gy = y + 2, gw = 110, gh = 34, n = Math.max(2, ch.x.length);
      doc.setDrawColor('#9aa3a0'); doc.setLineWidth(0.2); doc.rect(gx, gy, gw, gh);
      font('normal', 7, '#4b5552'); [0, 0.5, 1].forEach((v) => doc.text(pct(v), gx - 9, gy + gh - v * gh + 1));
      const pts = ch.y.map((v, i) => [gx + (i / (n - 1)) * gw, gy + gh - v * gh, v] as const);
      ch.x.forEach((lab, i) => doc.text(lab, gx + (i / (n - 1)) * gw - 3, gy + gh + 4));
      doc.setDrawColor('#0f6b4c'); doc.setLineWidth(0.6);
      for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      doc.setFillColor('#0f6b4c'); font('bold', 7, '#0f6b4c');
      pts.forEach(([x, yy, v]) => { doc.circle(x, yy, 1, 'F'); doc.text(pct(v), x - 2, yy - 2); });
      y = gy + gh + 12;
    }
    const exp = (rec.exp ?? []).slice().sort((a, b) => a.cameras - b.cameras);
    if (!ch && exp.length) {
      font('bold', 10); doc.text('내 실험: 카메라 수에 따른 놓친 사건 비율 (요원 1명 · AI 없음)', M, y); y += 3;
      const gx = M + 10, gy = y + 2, gw = 110, gh = 34, xs = [4, 8, 16, 32, 64];
      doc.setDrawColor('#9aa3a0'); doc.setLineWidth(0.2); doc.rect(gx, gy, gw, gh);
      font('normal', 7, '#4b5552');
      [0, 0.5, 1].forEach((v) => doc.text(pct(v), gx - 9, gy + gh - v * gh + 1));
      xs.forEach((c, i) => doc.text(`${c}대`, gx + (i / 4) * gw - 2, gy + gh + 4));
      const pts = exp.map((e) => [gx + (xs.indexOf(e.cameras) / 4) * gw, gy + gh - e.missRate * gh, e.missRate] as const).filter((q) => q[0] >= gx);
      doc.setDrawColor('#0f6b4c'); doc.setLineWidth(0.6);
      for (let i = 1; i < pts.length; i++) doc.line(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]);
      doc.setFillColor('#0f6b4c'); font('bold', 7, '#0f6b4c');
      pts.forEach(([x, yy, v]) => { doc.circle(x, yy, 1, 'F'); doc.text(pct(v), x - 2, yy - 2); });
      y = gy + gh + 12;
    }
    const rep = rec.report as { conclusion?: string } | undefined;
    if (rep?.conclusion) { font('bold', 10); doc.text('결론 (내 실험값으로 자동 작성)', M, y); y += 5; font('normal', 9.5); text(rep.conclusion, M); y += 2; }
    // 평가 답
    const a = rec.assess, set = ASSESS[`${pre}-${l.n}`];
    if (a && set) {
      need(40); font('bold', 10); doc.text('형성평가', M, y); y += 5;
      answers(a, set.items);
    }
    y += 6;
  }
  // 트랙 종합 평가
  { const f = p.lessons[`${pre}-final`], set = ASSESS[`${pre}-final`];
    if (f?.assess && set) { need(40); font('bold', 12); doc.text('단원 종합평가', M, y); y += 7; answers(f.assess, set.items); } }
  font('normal', 7.5, '#6b7280');
  doc.text('수치는 모두 시뮬레이션 계산값 · 서술형은 핵심어 자동 확인 후 교사가 최종 확인 · 가정은 임시', M, 290);
  // 파일 이름을 확실히 붙이려고 직접 링크로 내려받기
  const url = URL.createObjectURL(doc.output('blob'));
  const a = document.createElement('a');
  a.href = url; a.download = `${track}_학습리포트_${p.student || '학생'}.pdf`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
