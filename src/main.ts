import Phaser from 'phaser';
import { BootScene } from './phaser/scenes/BootScene.ts';
import { TitleScene } from './phaser/scenes/TitleScene.ts';
import { MapScene } from './phaser/scenes/MapScene.ts';
import { EncounterScene } from './phaser/scenes/EncounterScene.ts';
import { BossIntroScene } from './phaser/scenes/BossIntroScene.ts';
import { ScoringScene } from './phaser/scenes/ScoringScene.ts';
import { PostEncounterScene } from './phaser/scenes/PostEncounterScene.ts';
import { MerchantScene } from './phaser/scenes/MerchantScene.ts';
import { EventScene } from './phaser/scenes/EventScene.ts';
import { RestScene } from './phaser/scenes/RestScene.ts';
import { GameOverScene } from './phaser/scenes/GameOverScene.ts';
import { DraftScene } from './phaser/scenes/DraftScene.ts';
import { PoolViewerScene } from './phaser/scenes/PoolViewerScene.ts';
import { COLORS } from './config.ts';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  backgroundColor: COLORS.parchment100,
  scene: [
    BootScene,
    TitleScene,
    DraftScene,
    MapScene,
    EncounterScene,
    BossIntroScene,
    ScoringScene,
    PostEncounterScene,
    MerchantScene,
    EventScene,
    RestScene,
    GameOverScene,
    PoolViewerScene,
  ],
  input: {
    activePointers: 2,
  },
};

const game = new Phaser.Game(config);
(window as any).__PHASER_GAME__ = game;
