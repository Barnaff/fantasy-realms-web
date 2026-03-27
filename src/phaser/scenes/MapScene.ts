import Phaser from 'phaser';
import { COLORS, FONTS } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';

export class MapScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MapScene' });
  }

  create() {
    const { width, height } = this.scale;
    const cx = width / 2;
    const gm = GameManager.getInstance();

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    this.add.text(cx, 40, `Act ${gm.state.run?.map?.act ?? 1} of ${gm.state.run?.map?.totalActs ?? 3}`, {
      fontFamily: FONTS.display,
      fontSize: '24px',
      color: '#2c1810',
    }).setOrigin(0.5);

    // HUD
    this.add.text(12, 12, `Pool: ${gm.state.run?.pool.length ?? 0}  Gold: ${gm.state.run?.gold ?? 0}  Score: ${gm.state.run?.totalScore ?? 0}`, {
      fontFamily: FONTS.body,
      fontSize: '12px',
      color: '#6b5c4e',
    });

    // Render map nodes
    const map = gm.state.run?.map;
    if (!map) return;

    const available = new Set(gm.getAvailableMapNodes().map(n => n.id));
    const layerCount = map.layers.length;
    const layerH = (height - 120) / layerCount;

    for (let li = 0; li < layerCount; li++) {
      const layer = map.layers[li];
      const y = height - 60 - li * layerH; // bottom to top
      const nodeCount = layer.nodes.length;

      for (let ni = 0; ni < nodeCount; ni++) {
        const node = layer.nodes[ni];
        const x = (ni + 1) * width / (nodeCount + 1);

        // Draw connections
        for (const connId of node.connections) {
          const targetNode = map.layers.flatMap(l => l.nodes).find(n => n.id === connId);
          if (targetNode) {
            const tli = map.layers.findIndex(l => l.nodes.includes(targetNode));
            const tni = map.layers[tli].nodes.indexOf(targetNode);
            const tx = (tni + 1) * width / (map.layers[tli].nodes.length + 1);
            const ty = height - 60 - tli * layerH;

            const line = this.add.graphics();
            line.lineStyle(2, available.has(node.id) ? COLORS.tag.Beast : COLORS.parchment300, 0.5);
            line.lineBetween(x, y, tx, ty);
          }
        }

        // Node circle
        const isAvail = available.has(node.id);
        const isVisited = node.visited;
        const isCurrent = node.id === gm.state.run?.currentNodeId;

        const circle = this.add.graphics();
        const radius = 20;
        const color = isVisited ? COLORS.parchment400
          : node.type === 'boss' ? COLORS.tag.Fire
          : node.type === 'merchant' ? COLORS.tag.Artifact
          : node.type === 'event' ? COLORS.tag.Wizard
          : node.type === 'rest' ? COLORS.tag.Beast
          : COLORS.tag.Army;

        circle.fillStyle(COLORS.parchment100, 1);
        circle.fillCircle(x, y, radius + 3);
        circle.lineStyle(3, isAvail ? COLORS.tag.Beast : color, isVisited ? 0.4 : 1);
        circle.strokeCircle(x, y, radius);
        circle.fillStyle(color, isVisited ? 0.3 : 0.15);
        circle.fillCircle(x, y, radius);

        if (isCurrent) {
          circle.lineStyle(2, COLORS.tag.Leader, 0.8);
          circle.strokeCircle(x, y, radius + 5);
        }

        // Node icon
        const icons: Record<string, string> = {
          encounter: '⚔', boss: '💀', merchant: '🏪', event: '📜', rest: '🏕', start: '🏠',
        };
        this.add.text(x, y, icons[node.type] ?? '?', {
          fontSize: '16px',
          color: '#2c1810',
        }).setOrigin(0.5);

        // Interactive if available
        if (isAvail) {
          const zone = this.add.zone(x, y, radius * 2, radius * 2).setInteractive({ useHandCursor: true });

          // Pulsing glow
          const glow = this.add.graphics();
          glow.lineStyle(3, COLORS.tag.Beast, 0.5);
          glow.strokeCircle(x, y, radius + 2);
          this.tweens.add({
            targets: glow,
            alpha: { from: 0.3, to: 1 },
            duration: 800,
            yoyo: true,
            repeat: -1,
          });

          zone.on('pointerdown', () => {
            gm.selectMapNode(node.id);
            const phase = gm.state.phase;
            const sceneMap: Record<string, string> = {
              player_turn: 'EncounterScene',
              boss_intro: 'BossIntroScene',
              merchant: 'MerchantScene',
              event: 'EventScene',
              rest: 'RestScene',
            };
            const sceneName = sceneMap[phase] ?? 'MapScene';
            this.scene.start(sceneName);
          });
        }
      }
    }

    // Forfeit button
    const forfeitBtn = this.add.text(width - 12, 12, '✕', {
      fontFamily: FONTS.body,
      fontSize: '20px',
      color: '#9c8a5c',
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    forfeitBtn.on('pointerdown', () => {
      gm.forfeitRun();
      this.scene.start('GameOverScene');
    });
  }
}
