// EduinoAI · 머신러닝 학습 프로그램 — 엔트리.
import './styles.css';
import { createRouter } from './app/Router.js';
import { Home } from './screens/Home.js';
import { Lesson } from './screens/Lesson.js';

const app = document.getElementById('app');
createRouter({ home: Home, lesson: Lesson }, app);
