// author: eduino
import { useCallback, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Hero } from './screens/Hero';
import { Select } from './screens/Select';
import { Brief } from './screens/Brief';

type Screen = 'hero' | 'select' | 'brief';

export default function App() {
  const [screen, setScreen] = useState<Screen>('hero');
  const [selected, setSelected] = useState('vision');

  const home = useCallback(() => setScreen('hero'), []);
  const enterCity = useCallback((id?: string) => { if (id) setSelected(id); setScreen('select'); }, []);
  const enterDistrict = useCallback((id: string) => { setSelected(id); setScreen('brief'); }, []);

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={screen}
        className="frame"
        initial={{ opacity: 0, scale: 1.015 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.99 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {screen === 'hero' && <Hero onEnter={enterCity} />}
        {screen === 'select' && <Select selected={selected} onSelect={setSelected} onEnter={enterDistrict} onHome={home} />}
        {screen === 'brief' && <Brief id={selected} onBack={() => setScreen('select')} onHome={home} />}
      </motion.div>
    </AnimatePresence>
  );
}
