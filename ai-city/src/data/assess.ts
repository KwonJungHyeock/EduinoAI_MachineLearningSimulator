// author: eduino
// 차시 평가 문항 (OX · 단답 · 서술형). 채점은 코드로만 — 서술형은 핵심어 확인 + 교사 확인(점수를 지어내지 않음).
export interface OX { kind: 'ox'; q: string; answer: boolean; why: string }
export interface Short { kind: 'short'; q: string; accept: string[]; why: string }
export interface Essay { kind: 'essay'; q: string; keys: { label: string; any: string[] }[]; model: string }
export type Item = OX | Short | Essay;

export const ASSESS: Record<string, { title: string; items: Item[] }> = {
  'vision-5': {
    title: '분류 대결: kNN vs CNN',
    items: [
      { kind: 'ox', q: 'kNN은 학습 조각을 기억해 두었다가 가장 비슷한 조각들의 정답으로 다수결한다.', answer: true, why: '가장 가까운 k개(여기서는 3개)의 정답을 따릅니다.' },
      { kind: 'ox', q: 'CNN의 필터 숫자는 사람이 하나하나 정해 주어야 한다.', answer: false, why: 'CNN은 정답을 보며 틀린 만큼 필터 숫자를 스스로 고칩니다.' },
      { kind: 'ox', q: '학습 조각이 적을 때는 kNN이 CNN보다 나을 수 있다.', answer: true, why: '실험에서 조각 100개 이하일 때 kNN이 앞섰습니다.' },
      { kind: 'short', q: '학습 조각 전체를 한 번 복습하는 것을 무엇이라 할까?', accept: ['에폭', 'epoch', '에포크'], why: '에폭(epoch)입니다.' },
      { kind: 'essay', q: '정확도 95%를 넘기기 위해 모델 · 학습 조각 수 · 에폭을 어떻게 정했는지, 실험 결과를 근거로 설명해 보세요.',
        keys: [{ label: 'CNN 선택', any: ['CNN', 'cnn', '합성곱', '필터'] }, { label: '조각(데이터) 많이', any: ['1000', '많', '늘'] }, { label: '에폭 · 손실', any: ['에폭', '손실', '복습', 'epoch'] }],
        model: '조각 100개일 때는 kNN이 더 정확했지만 1000개에서는 CNN이 앞섰다. 그래서 CNN을 고르고 학습 조각을 1000개로 늘렸고, 에폭 2에서는 손실이 아직 높아 에폭을 8로 늘리니 시험 정확도가 97%가 되었다.' }
    ]
  },
  'vision-4': {
    title: '색으로 물체 골라내기',
    items: [
      { kind: 'ox', q: '색 범위만 정하면 같은 색의 다른 물체와 진짜 물체를 구별할 수 있다.', answer: false, why: '교차로에서 다른 주황색 차까지 골라 정밀도가 낮았습니다.' },
      { kind: 'ox', q: 'HSV는 색을 색상 · 채도 · 밝기로 나누어 표현한다.', answer: true, why: '사람이 말하는 "주황색"을 색상 범위로 정하기 쉽습니다.' },
      { kind: 'ox', q: '정밀도는 진짜 물체 중에서 몇 %를 골라냈는지를 뜻한다.', answer: false, why: '그것은 재현율입니다. 정밀도는 고른 것 중 진짜 물체의 비율이에요.' },
      { kind: 'short', q: '고른 것 중 진짜 물체의 비율을 무엇이라 할까?', accept: ['정밀도', 'precision', '정확도(정밀도)'], why: '정밀도(precision)입니다.' },
      { kind: 'essay', q: '세 장면을 한 설정으로 맞추기 위해 어떤 단서를 함께 썼는지, 색만 썼을 때의 문제와 함께 설명해 보세요.',
        keys: [{ label: '색만 쓰면 다른 물체도 골라짐', any: ['다른', '같은 색', '주황', '헛', '잘못'] }, { label: '변화(바뀐 곳) 함께 사용', any: ['변화', '바뀐', 'change', '차이'] }, { label: '정밀도 · 재현율', any: ['정밀', '재현'] }],
        model: '색만 쓰면 교차로의 다른 주황색 차까지 골라 정밀도가 낮았다. 그래서 2차시의 변화(바뀐 곳) 단서를 함께 켜서 주황색이면서 새로 나타난 픽셀만 골랐더니 세 장면 모두 정밀도 80%, 재현율 50%를 넘었다.' }
    ]
  },
  'vision-3': {
    title: '필터로 윤곽 찾기',
    items: [
      { kind: 'ox', q: '필터는 화면 위를 한 칸씩 옮겨 가며 곱하고 더하는 작은 숫자 표다.', answer: true, why: '이 계산을 합성곱(convolution)이라고 합니다.' },
      { kind: 'ox', q: '흐리게(평균) 필터를 쓰면 물체의 윤곽이 가장 잘 드러난다.', answer: false, why: '평균은 경계를 뭉개서 물체 대비가 거의 1배 그대로였습니다.' },
      { kind: 'ox', q: '윤곽 필터는 숫자의 합을 0에 가깝게 만들면 평평한 곳이 사라지고 경계만 남는다.', answer: true, why: '밝기가 같은 곳에서는 +와 −가 서로 지워져 0이 됩니다.' },
      { kind: 'short', q: '작은 숫자 표를 화면 위로 옮기며 곱해 더하는 계산의 이름은?', accept: ['합성곱', 'convolution', '컨볼루션', '콘볼루션'], why: '합성곱(convolution)입니다.' },
      { kind: 'essay', q: '내가 만든 필터의 숫자를 어떻게 정했는지, 왜 물체가 돋보였는지(또는 안 됐는지) 실험 결과로 설명해 보세요.',
        keys: [{ label: '+ · − 배치(좌우 · 위아래 차이)', any: ['+', '−', '-', '양수', '음수', '차이', '왼쪽', '오른쪽'] }, { label: '합을 0으로', any: ['합', '0'] }, { label: '윤곽 · 경계', any: ['윤곽', '경계', '모서리'] }],
        model: '왼쪽 열은 −, 오른쪽 열은 +로 넣고 가운데는 0으로 해서 합을 0으로 맞췄다. 그러면 밝기가 같은 바닥은 0이 되고, 사람과 기둥처럼 좌우 밝기가 바뀌는 경계만 크게 남아 물체 대비가 1.9배가 되었다.' }
    ]
  },
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
