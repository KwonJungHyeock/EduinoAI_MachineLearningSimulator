// Phaser 게임 부팅 설정. 모든 씬을 등록하고 화면에 맞춘다.
import Phaser from 'phaser';
import { BASE, CSS } from '../shared/theme.js';
import Boot from './scenes/Boot.js';
import Preload from './scenes/Preload.js';
import Splash from './scenes/Splash.js';
import Title from './scenes/Title.js';
import Login from './scenes/Login.js';
import Story from './scenes/Story.js';
import Corridor from './scenes/Corridor.js';
import Room from './scenes/Room.js';
import Dodge from './scenes/Dodge.js';
import ComingSoon from './scenes/ComingSoon.js';

export function startGame(parent) {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    backgroundColor: CSS.bg,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: BASE.w,
      height: BASE.h,
    },
    render: { antialias: true, roundPixels: false },
    scene: [Boot, Preload, Splash, Title, Login, Story, Corridor, Room, Dodge, ComingSoon],
  });
}
