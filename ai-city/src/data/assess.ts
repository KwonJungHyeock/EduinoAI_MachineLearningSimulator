// author: eduino
// 차시 평가 문항 (OX · 단답 · 서술형). 채점은 코드로만 — 서술형은 핵심어 확인 + 교사 확인(점수를 지어내지 않음).
export interface OX { kind: 'ox'; q: string; answer: boolean; why: string }
export interface Short { kind: 'short'; q: string; accept: string[]; why: string }
export interface Essay { kind: 'essay'; q: string; keys: { label: string; any: string[] }[]; model: string }
export type Item = OX | Short | Essay;

export const ASSESS: Record<string, { title: string; items: Item[] }> = {
  'vision-2': {
    title: '이미지는 숫자다',
    items: [
      { kind: 'ox', q: '컴퓨터에게 사진은 칸마다 밝기 숫자가 적힌 표와 같다.', answer: true, why: '픽셀마다 0(검정)~255(흰색) 숫자가 들어 있습니다.' },
      { kind: 'ox', q: '해상도를 높일수록 헛알림은 항상 줄어든다.', answer: false, why: '칸이 많아지면 잡음으로 흔들리는 숫자도 많아져 헛알림이 늘 수 있습니다.' },
      { kind: 'ox', q: '해상도를 너무 낮추면 작은 물체의 변화가 평균에 묻혀 사라질 수 있다.', answer: true, why: '큰 칸으로 평균하면 작은 변화가 흐려집니다.' },
      { kind: 'short', q: '이미지를 이루는 가장 작은 칸(한 점)을 무엇이라 할까?', accept: ['픽셀', 'pixel', '화소'], why: '픽셀(화소)입니다.' },
      { kind: 'essay', q: '해상도와 기준값을 어떻게 골라 목표를 맞췄는지, 해상도가 너무 높거나 낮을 때 생긴 문제와 함께 써 보세요.',
        keys: [{ label: '해상도 높음 → 헛알림', any: ['헛알림', '잡음', '노이즈'] }, { label: '해상도 낮음 → 놓침', any: ['놓', '흐려', '못 찾', '묻혀'] }, { label: '기준값 조정', any: ['기준값', '기준'] }],
        model: '64×40처럼 해상도가 높으면 잡음 때문에 조용한 화면에서도 헛알림이 생겼고, 8×5처럼 낮으면 작은 사건이 평균에 묻혀 놓쳤다. 32×20에 기준값 15를 쓰니 모두 찾고 헛알림도 없었다.' }
    ]
  },
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
