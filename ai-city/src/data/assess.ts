// author: eduino
// 차시 평가 문항 (OX · 단답 · 서술형). 채점은 코드로만 — 서술형은 핵심어 확인 + 교사 확인(점수를 지어내지 않음).
export interface OX { kind: 'ox'; q: string; answer: boolean; why: string }
export interface Short { kind: 'short'; q: string; accept: string[]; why: string }
export interface Essay { kind: 'essay'; q: string; keys: { label: string; any: string[] }[]; model: string }
export type Item = OX | Short | Essay;

export const ASSESS: Record<string, { title: string; items: Item[] }> = {
  'vision-1': {
    title: '사람 눈으로는 다 못 본다',
    items: [
      { kind: 'ox', q: '카메라가 늘어나도 요원 1명이 놓치는 사건의 비율은 거의 같다.', answer: false, why: '카메라 4대에서는 0%였지만 32대에서는 절반 넘게 놓쳤습니다.' },
      { kind: 'ox', q: '컴퓨터는 모든 카메라 화면의 변화량을 동시에 잴 수 있다.', answer: true, why: '사람은 한 번에 4칸만 보지만, 컴퓨터는 64칸 전부의 변화량을 매초 잽니다.' },
      { kind: 'ox', q: '변화 감지 기준값은 낮을수록 항상 좋다.', answer: false, why: '너무 낮으면 헛알림이 쏟아져 요원이 다 확인하지 못하고 놓칩니다.' },
      { kind: 'short', q: '컴퓨터가 영상을 숫자로 바꿔 필요한 것을 스스로 찾아내는 기술의 이름은?', accept: ['영상처리', '영상 처리', '컴퓨터비전', '컴퓨터 비전', 'computervision', 'computer vision', 'cv'], why: '영상처리(Computer Vision)입니다.' },
      {
        kind: 'essay', q: '변화 감지 기준값을 너무 낮게 정하면 어떤 일이 생기는지, 내 실험 결과를 근거로 써 보세요.',
        keys: [
          { label: '알림이 많아짐', any: ['알림', '경보', '헛알림'] },
          { label: '확인을 못 함', any: ['확인 못', '확인하지 못', '못 봄', '못 보', '다 못', '처리 못', '감당'] },
          { label: '사건을 놓침', any: ['놓', '못 찾', '못찾', '놓친'] }
        ],
        model: '기준값을 너무 낮추면 바람이나 조명 변화에도 알림이 울려 알림이 너무 많아진다. 요원이 그 알림을 다 확인하지 못해 진짜 사건까지 놓친다.'
      }
    ]
  }
};

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '');
export function gradeShort(it: Short, ans: string) { const a = norm(ans); return a.length > 0 && it.accept.some((x) => norm(x) === a); }
export function gradeEssay(it: Essay, ans: string) {
  const a = ans.replace(/\s+/g, ' ');
  return it.keys.map((k) => ({ label: k.label, hit: k.any.some((w) => a.includes(w)) }));
}
