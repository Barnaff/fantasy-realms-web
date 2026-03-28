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

    // ── HUD ──
    this.add.text(12, 12, `Pool: ${gm.state.run?.pool.length ?? 0}  Gold: ${gm.state.run?.gold ?? 0}  Score: ${gm.state.run?.totalScore ?? 0}`, {
      fontFamily: FONTS.body,
      fontSize: '12px',
      color: '#6b5c4e',
      resolution: 2,
    });

    this.add.text(cx, 40, `Act ${gm.state.run?.map?.act ?? 1} of ${gm.state.run?.map?.totalActs ?? 3}`, {
      fontFamily: FONTS.display,
      fontSize: '24px',
      color: '#2c1810',
      resolution: 2,
    }).setOrigin(0.5);

    // ── Map ──
    const map = gm.state.run?.map;
    if (!map) return;

    const available = new Set(gm.getAvailableMapNodes().map(n => n.id));
    const completedIds = new Set(gm.state.run?.completedNodeIds ?? []);
    const currentId = gm.state.run?.currentNodeId;
    const layerCount = map.layers.length;
    const layerH = (height - 120) / layerCount;

    // Build node position lookup
    const nodePositions = new Map<string, { x: number; y: number }>();
    for (let li = 0; li < layerCount; li++) {
      const layer = map.layers[li];
      const y = height - 60 - li * layerH;
      const nodeCount = layer.nodes.length;
      for (let ni = 0; ni < nodeCount; ni++) {
        const node = layer.nodes[ni];
        const x = (ni + 1) * width / (nodeCount + 1);
        nodePositions.set(node.id, { x, y });
      }
    }

    // ── Draw connections ──
    for (let li = 0; li < layerCount; li++) {
      const layer = map.layers[li];
      for (const node of layer.nodes) {
        const fromPos = nodePositions.get(node.id);
        if (!fromPos) continue;

        for (const connId of node.connections) {
          const toPos = nodePositions.get(connId);
          if (!toPos) continue;

          // Check if this connection is on the completed path
          const isCompletedPath = completedIds.has(node.id) && completedIds.has(connId);
          const isCurrentPath = (completedIds.has(node.id) && connId === currentId) ||
                                (node.id === currentId && completedIds.has(connId));
          const isAvailPath = available.has(node.id) || available.has(connId);

          const line = this.add.graphics();
          if (isCompletedPath || isCurrentPath) {
            // Completed path — bright gold
            line.lineStyle(3, COLORS.tag.Leader, 0.8);
          } else if (isAvailPath) {
            // Available path — green
            line.lineStyle(2, COLORS.tag.Beast, 0.5);
          } else {
            // Unexplored — faint
            line.lineStyle(1.5, COLORS.parchment400, 0.25);
          }
          line.lineBetween(fromPos.x, fromPos.y, toPos.x, toPos.y);
        }
      }
    }

    // ── Draw nodes ──
    for (let li = 0; li < layerCount; li++) {
      const layer = map.layers[li];
      for (const node of layer.nodes) {
        const pos = nodePositions.get(node.id);
        if (!pos) continue;
        const { x, y } = pos;

        const isAvail = available.has(node.id);
        const isVisited = completedIds.has(node.id);
        const isCurrent = node.id === currentId;
        const radius = 20;

        // Node type color
        const typeColor = node.type === 'boss' ? COLORS.tag.Fire
          : node.type === 'merchant' ? COLORS.tag.Artifact
          : node.type === 'event' ? COLORS.tag.Wizard
          : node.type === 'rest' ? COLORS.tag.Beast
          : node.type === 'start' ? COLORS.tag.Leader
          : COLORS.tag.Army;

        // Background circle
        const circle = this.add.graphics();
        circle.fillStyle(COLORS.parchment100, 1);
        circle.fillCircle(x, y, radius + 3);

        if (isVisited && !isCurrent) {
          // Visited: dimmed, checkmark overlay
          circle.lineStyle(2, COLORS.parchment400, 0.5);
          circle.strokeCircle(x, y, radius);
          circle.fillStyle(COLORS.parchment300, 0.4);
          circle.fillCircle(x, y, radius);

          // Checkmark
          this.add.text(x, y, '✓', {
            fontSize: '14px', color: '#8a7a5a', resolution: 2,
          }).setOrigin(0.5).setAlpha(0.7);
        } else {
          // Active node
          circle.lineStyle(isAvail ? 3 : 2, isAvail ? COLORS.tag.Beast : typeColor, 1);
          circle.strokeCircle(x, y, radius);
          circle.fillStyle(typeColor, 0.15);
          circle.fillCircle(x, y, radius);

          // Icon
          const icons: Record<string, string> = {
            encounter: '⚔', boss: '💀', merchant: '🏪', event: '📜', rest: '🏕', start: '🏠',
          };
          this.add.text(x, y, icons[node.type] ?? '?', {
            fontSize: '16px', color: '#2c1810',
          }).setOrigin(0.5);
        }

        // ── Current node indicator ──
        if (isCurrent) {
          // Bright pulsing ring — drawn at origin, positioned at (x,y) so scale works from center
          const currentRing = this.add.graphics();
          currentRing.setPosition(x, y);
          currentRing.lineStyle(3, COLORS.tag.Leader, 0.9);
          currentRing.strokeCircle(0, 0, radius + 6);
          this.tweens.add({
            targets: currentRing,
            alpha: { from: 0.5, to: 1 },
            scaleX: { from: 0.95, to: 1.05 },
            scaleY: { from: 0.95, to: 1.05 },
            duration: 800,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          // "YOU ARE HERE" arrow above
          const arrowY = y - radius - 22;
          const arrow = this.add.text(x, arrowY, '▼', {
            fontFamily: FONTS.display,
            fontSize: '16px',
            color: '#c9a227',
            resolution: 2,
          }).setOrigin(0.5);
          this.tweens.add({
            targets: arrow,
            y: arrowY + 5,
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });

          // Small label
          this.add.text(x, arrowY - 14, 'YOU', {
            fontFamily: FONTS.display,
            fontSize: '8px',
            color: '#c9a227',
            resolution: 2,
          }).setOrigin(0.5);
        }

        // ── Available node — pulsing glow + particles ──
        if (isAvail) {
          const glow = this.add.graphics();
          glow.lineStyle(3, COLORS.tag.Beast, 0.6);
          glow.strokeCircle(x, y, radius + 3);
          this.tweens.add({
            targets: glow,
            alpha: { from: 0.3, to: 1 },
            duration: 700,
            yoyo: true,
            repeat: -1,
          });

          // Particles
          if (this.textures.exists('particle-glow')) {
            this.add.particles(x, y, 'particle-glow', {
              speed: { min: 5, max: 15 },
              scale: { start: 0.12, end: 0 },
              alpha: { start: 0.6, end: 0 },
              lifespan: { min: 400, max: 800 },
              frequency: 100,
              tint: 0x22c55e,
              blendMode: 'ADD',
              emitZone: {
                type: 'edge',
                source: new Phaser.Geom.Circle(0, 0, radius + 2),
                quantity: 16,
              },
            });
          }

          const zone = this.add.zone(x, y, radius * 2.5, radius * 2.5).setInteractive({ useHandCursor: true });
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
            this.scene.start(sceneMap[phase] ?? 'MapScene');
          });
        }
      }
    }

    // ── View Deck button ──
    const deckBtn = this.add.text(12, height - 24, '📋 View Deck', {
      fontFamily: FONTS.body,
      fontSize: '12px',
      color: '#6b5c4e',
      resolution: 2,
    }).setInteractive({ useHandCursor: true });
    const deckZone = this.add.zone(deckBtn.x + deckBtn.width / 2, deckBtn.y + 6, deckBtn.width + 16, 24)
      .setInteractive({ useHandCursor: true });
    deckZone.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('PoolViewerScene', { returnScene: 'MapScene' });
    });

    // ── Forfeit button ──
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
