// author: eduino
// 첫 화면: 도시 위를 흐르는 신경망(마우스 반응) + 기술 이름 트랙 인덱스
import { motion } from 'framer-motion';
import { DISTRICTS } from '../data/districts';
import { HeroCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';
import { MagneticButton, spot } from '../components/Interactive';

const COLORS = DISTRICTS.map((d) => d.color);
const TRACKS = DISTRICTS.filter((d) => d.id !== 'academy');
const up = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } };
const EASE = [0.22, 1, 0.36, 1] as const;

export function Hero({ onEnter }: { onEnter: (id?: string) => void }) {
  return (
    <section className="screen hero">
      <HeroCanvas colors={COLORS} className="hero__canvas" />
      <div className="hero__veil" aria-hidden="true" />
      <TopBar right={<button className="btn btn--ghost" disabled>교사용 안내</button>} />

      <motion.div className="hero__copy" initial="hidden" animate="show" transition={{ staggerChildren: 0.12, delayChildren: 0.2 }}>
        <motion.p className="eyebrow" variants={up} transition={{ duration: 0.7, ease: EASE }}>
          AI LADDER COURSE · {TRACKS.length} DISTRICTS
        </motion.p>
        <motion.h1 variants={up} transition={{ duration: 0.8, ease: EASE }}>
          AI가 움직이는 도시,<br />그 AI를 직접 만듭니다
        </motion.h1>
        <motion.p className="hero__sub" variants={up} transition={{ duration: 0.8, ease: EASE }}>
          영상처리 · 언어 모델 · 음성 · 데이터 예측 · 피지컬 · 생성형 AI. 기술마다 특화된 지구에서 원리를 배우고, 모델을 직접 돌려 보고, 도시의 사건을 해결합니다.
        </motion.p>
        <motion.div className="hero__cta" variants={up} transition={{ duration: 0.8, ease: EASE }}>
          <MagneticButton className="btn btn--primary" onClick={() => onEnter()}>도시 입장</MagneticButton>
          <span className="hero__hint">공통 기초부터 차시 순서대로 열립니다</span>
        </motion.div>
      </motion.div>

      <motion.nav className="index" aria-label="학습 트랙" initial="hidden" animate="show" transition={{ staggerChildren: 0.06, delayChildren: 0.9 }}>
        {DISTRICTS.map((d, i) => (
          <motion.button
            key={d.id}
            className="index__item"
            style={{ ['--k' as string]: d.color }}
            variants={up} transition={{ duration: 0.6, ease: EASE }}
            onPointerMove={spot}
            onClick={() => onEnter(d.id)}
          >
            <span className="index__no">{String(i).padStart(2, '0')}</span>
            <span className="index__order"><i />{d.order}</span>
            <span className="index__tech">{d.tech}</span>
            <span className="index__en">{d.techEn}</span>
            <span className="index__go" aria-hidden="true">→</span>
          </motion.button>
        ))}
      </motion.nav>
      <p className="src-line hero__src">지구 · 현장 이름은 가칭 · 배경 움직임은 코드로 생성한 추상 모션 · 마우스를 움직이거나 눌러 보세요</p>
    </section>
  );
}
