// author: eduino
import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hero } from './screens/Hero';
import { Select } from './screens/Select';
import { Brief } from './screens/Brief';
import { Vision01 } from './lesson/vision01/Vision01';
import { Vision02 } from './lesson/vision02/Vision02';
import { Vision03 } from './lesson/vision03/Vision03';

type Screen = 'hero' | 'select' | 'brief' | 'lesson';

export default function App() {
  const [screen, setScreen] = useState<Screen>('hero');
  const [selected, setSelected] = useState('vision');
  const [lessonN, setLessonN] = useState(1);

  const home = useCallback(() => setScreen('hero'), []);
  const enterCity = useCallback((id?: string) => { if (id) setSelected(id); setScreen('select'); }, []);
  const enterDistrict = useCallback((id: string) => { setSelected(id); setScreen('brief'); }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen === 'lesson' ? `lesson-${lessonN}` : screen}
        className="frame"
        initial={{ opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {screen === 'hero' && <Hero onEnter={enterCity} />}
        {screen === 'select' && <Select selected={selected} onSelect={setSelected} onEnter={enterDistrict} onHome={home} />}
        {screen === 'brief' && <Brief id={selected} onBack={() => setScreen('select')} onHome={home} onStart={(n) => { setLessonN(n); setScreen('lesson'); }} />}
        {screen === 'lesson' && lessonN === 1 && <Vision01 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonN === 2 && <Vision02 onExit={() => setScreen('brief')} onHome={home} />}
        {screen === 'lesson' && lessonN === 3 && <Vision03 onExit={() => setScreen('brief')} onHome={home} />}
      </motion.div>
    </AnimatePresence>
  );
}
