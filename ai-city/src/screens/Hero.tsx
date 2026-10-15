// author: eduino
// 첫 화면: 도시 위를 흐르는 신경망 + 기술 이름 트랙 소개
import { motion } from 'framer-motion';
import { DISTRICTS } from '../data/districts';
import { HeroCanvas } from '../components/Canvases';
import { TopBar } from '../components/TopBar';

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
          <button className="btn btn--primary" onClick={() => onEnter()}>도시 입장</button>
          <span className="hero__hint">공통 기초부터 차시 순서대로 열립니다</span>
        </motion.div>
      </motion.div>

      <motion.ul className="hero__strip" initial="hidden" animate="show" transition={{ staggerChildren: 0.07, delayChildren: 0.9 }}>
        {DISTRICTS.map((d) => (
          <motion.li key={d.id} variants={up} transition={{ duration: 0.6, ease: EASE }}>
            <button className="strip-item" style={{ ['--k' as string]: d.color }} onClick={() => onEnter(d.id)}>
              <span className="strip-item__order">{d.order}</span>
              <span className="strip-item__tech">{d.tech}</span>
              <span className="strip-item__en">{d.techEn}</span>
            </button>
          </motion.li>
        ))}
      </motion.ul>
      <p className="src-line hero__src">지구 · 현장 이름은 가칭 · 배경 움직임은 코드로 생성한 추상 모션</p>
    </section>
  );
}
