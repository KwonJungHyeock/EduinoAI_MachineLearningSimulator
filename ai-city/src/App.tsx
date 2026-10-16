// author: eduino
import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hero } from './screens/Hero';
import { Select } from './screens/Select';
import { Brief } from './screens/Brief';
import { TrackFinal } from './screens/TrackFinal';
import { Vision01 } from './lesson/vision01/Vision01';
import { Vision02 } from './lesson/vision02/Vision02';
import { Vision03 } from './lesson/vision03/Vision03';
import { Vision04 } from './lesson/vision04/Vision04';
import { Vision05 } from './lesson/vision05/Vision05';
import { Vision06 } from './lesson/vision06/Vision06';
import { Vision07 } from './lesson/vision07/Vision07';
import { Vision08 } from './lesson/vision08/Vision08';
import { Found01 } from './lesson/found01/Found01';
import { Found02 } from './lesson/found02/Found02';
import { Found03 } from './lesson/found03/Found03';
import { Found04 } from './lesson/found04/Found04';

type Screen = 'hero' | 'select' | 'brief' | 'lesson' | 'final';

export default function App() {
  const [screen, setScreen] = useState<Screen>('hero');
  const [selected, setSelected] = useState('vision');
  const [lessonN, setLessonN] = useState(1);
  const [lessonLab, setLessonLab] = useState('vision');

  const home = useCallback(() => setScreen('hero'), []);
  const enterCity = useCallback((id?: string) => { if (id) setSelected(id); setScreen('select'); }, []);
  const enterDistrict = useCallback((id: string) => { setSelected(id); setScreen('brief'); }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen === 'lesson' ? `lesson-${lessonLab}-${lessonN}` : screen}
        className="frame"
        initial={{ opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {screen === 'hero' && <Hero onEnter={enterCity} />}
        {screen === 'select' && <Select selected={selected} onSelect={setSelected} onEnter={enterDistrict} onHome={home} onLesson={(lab, n) => { setLessonLab(lab); setSelected(lab); setLessonN(n); setScreen('lesson'); }} />}
        {screen === 'brief' && <Brief id={selected} onBack={() => setScreen('select')} onHome={home} onStart={(n) => { setLessonLab(selected); setLessonN(n); setScreen('lesson'); }} onFinal={() => setScreen('final')} />}
        {screen === 'lesson' && lessonLab === 'academy' && lessonN === 1 && <Found01 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'academy' && lessonN === 2 && <Found02 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'academy' && lessonN === 3 && <Found03 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'academy' && lessonN === 4 && <Found04 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'final' && <TrackFinal lab={selected} onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'vision' && lessonN === 1 && <Vision01 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'vision' && lessonN === 2 && <Vision02 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'vision' && lessonN === 3 && <Vision03 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'vision' && lessonN === 4 && <Vision04 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'vision' && lessonN === 5 && <Vision05 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'vision' && lessonN === 6 && <Vision06 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'vision' && lessonN === 7 && <Vision07 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonLab === 'vision' && lessonN === 8 && <Vision08 onExit={() => setScreen('brief')} onHome={home} />}
      </motion.div>
    </AnimatePresence>
  );
}
