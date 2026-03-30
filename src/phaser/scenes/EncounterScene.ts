import Phaser from 'phaser';
import { COLORS, FONTS, CARD, DURATION } from '../../config.ts';
import { GameManager } from '../systems/GameManager.ts';
import { CardFactory } from '../systems/CardFactory.ts';
import { LayoutHelper } from '../systems/LayoutHelper.ts';
import { CardObject } from '../gameobjects/CardObject.ts';
import { DeckPileObject } from '../gameobjects/DeckPileObject.ts';
import { ButtonObject } from '../gameobjects/ButtonObject.ts';
import type { GameState } from '../../types/game.ts';
import { resolveCard } from '../../engine/scoring.ts';
import { CARD_DEFS } from '../../data/cards.ts';
import { createKeywordTooltips, getPoolCardIds } from '../utils/KeywordTooltips.ts';
import { getCardRelations } from '../utils/CardRelations.ts';
import { TutorialOverlay } from '../gameobjects/TutorialOverlay.ts';

/**
 * Core gameplay scene: draw cards, discard cards, manage hand.
 *
 * Layout (top to bottom):
 *  - Header zone (encounter name, target, turns, phase indicator, modifiers)
 *  - River zone (deck pile + river card grid)
 *  - Score panel (live score + finalize button)
 *  - Hand zone (fan of draggable hand cards)
 */
export class EncounterScene extends Phaser.Scene {
  // --- References ---
  private gm!: GameManager;
  private width!: number;
  private height!: number;

  // --- Header elements ---
  private encounterNameText!: Phaser.GameObjects.Text;
  private targetText!: Phaser.GameObjects.Text;
  private phaseText!: Phaser.GameObjects.Text;
  private modifierTexts: Phaser.GameObjects.Text[] = [];

  // --- River elements ---
  private riverLabel!: Phaser.GameObjects.Text;
  private deckPile!: DeckPileObject;
  private deckPilePos = { x: 0, y: 0 };
  private riverCards: CardObject[] = [];

  // --- Score panel ---
  private scoreText!: Phaser.GameObjects.Text;
  private scoreBreakdownTexts: Phaser.GameObjects.Text[] = [];
  private finalizeBtn!: ButtonObject;

  // --- Hand elements ---
  private handLabel!: Phaser.GameObjects.Text;
  private handCards: CardObject[] = [];

  // --- Layout constants ---
  private scales!: { hand: number; river: number };
  private headerH = 80;
  private scorePanelY = 0;
  private handBottomY = 0;
  private riverStartY = 0;
  private layoutW = 0;
  private layoutOffsetX = 0;

  // --- Exhaust tracking ---
  private lastActionLogLen = 0;
  private exhaustAnimating = false;

  // --- Rival intent marker ---
  private rivalMarkers: Phaser.GameObjects.Container[] = [];

  // --- River blocked icons (ongoing effects) ---
  private riverBlockedIcons: Phaser.GameObjects.Text[] = [];

  // --- River hover state ---
  private hoveredRiverIndex = -1;
  private riverPositions: { x: number; y: number }[] = [];

  // --- Relationship arrows ---
  private arrowGraphics!: Phaser.GameObjects.Graphics;

  // --- Keyword tooltips + hover shadow ---
  private keywordTooltips: Phaser.GameObjects.Container | null = null;
  private hoverShadow: Phaser.GameObjects.Graphics | null = null;

  // --- First-level hints ---
  private isFirstLevel = false;
  private hintContainer: Phaser.GameObjects.Container | null = null;

  // --- Hand hover/drag state ---
  private hoveredHandIndex = -1;
  private draggingCard: CardObject | null = null;
  private dragPreviewIndex = -1; // where the dragged card would land
  private dragStartY = 0;
  private dragCardIndex = -1;
  private handPositions: { x: number; y: number; rotation: number }[] = [];

  // --- Bound listeners (for cleanup) ---
  private boundOnStateChanged!: (state: GameState) => void;
  private boundOnHandChanged!: (state: GameState) => void;

  constructor() {
    super({ key: 'EncounterScene' });
  }

  create(): void {
    this.gm = GameManager.getInstance();
    this.width = this.scale.width;
    this.height = this.scale.height;
    const bounds = LayoutHelper.getLayoutBounds(this.width, this.height);
    this.layoutW = bounds.layoutW;
    this.layoutOffsetX = bounds.offsetX;
    this.scales = LayoutHelper.getScales(this.width, this.height);

    this.cameras.main.setBackgroundColor(COLORS.parchment100);

    // Compute vertical layout zones
    this.riverStartY = this.headerH + 10;
    const riverH = CARD.HEIGHT * this.scales.river + 40;
    this.scorePanelY = this.riverStartY + riverH + 10;
    this.handBottomY = this.height - 30;

    this.createHeader();
    this.createRiverZone();
    this.createScorePanel();
    this.createHandZone();

    // Arrow overlay (on top of everything)
    this.arrowGraphics = this.add.graphics();
    this.arrowGraphics.setDepth(150);

    // Initial render
    this.refreshAll();

    // Listen to GameManager events
    this.boundOnStateChanged = (_s: GameState) => this.onStateChanged();
    this.boundOnHandChanged = (_s: GameState) => this.onHandChanged();
    this.gm.events.on('stateChanged', this.boundOnStateChanged);
    this.gm.events.on('handChanged', this.boundOnHandChanged);

    // Cheats panel (localhost only)
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      this.createCheatsPanel();
    }

    // Cleanup on scene shutdown
    this.events.on('shutdown', this.cleanup, this);

    // Show tutorial + hints on first encounter
    const isFirstEncounter = (this.gm.state.run?.encountersCleared ?? 0) === 0;
    this.isFirstLevel = isFirstEncounter;
    if (isFirstEncounter && TutorialOverlay.shouldShow()) {
      new TutorialOverlay(this, () => {
        // Tutorial dismissed — show hints
        this.refreshHeader();
      });
    } else {
      // No tutorial — show hints immediately
      this.refreshHeader();
    }
  }

  // ═══════════════════════════════════════════════════════
  //  HEADER ZONE
  // ═══════════════════════════════════════════════════════

  private createHeader(): void {
    const cx = this.width / 2;
    const encounterName = this.gm.state.encounter?.name ?? 'Encounter';

    this.encounterNameText = this.add.text(cx, 12, encounterName, {
      fontFamily: FONTS.display,
      fontSize: '20px',
      color: '#2c1810',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.targetText = this.add.text(cx, 34, '', {
      fontFamily: FONTS.body,
      fontSize: '11px',
      color: '#6b5c4e',
      align: 'center',
    }).setOrigin(0.5, 0);

    this.phaseText = this.add.text(cx, 52, '', {
      fontFamily: FONTS.body,
      fontSize: '13px',
      color: '#2c1810',
      align: 'center',
    }).setOrigin(0.5, 0);

    // Modifiers
    this.renderModifiers();
  }

  private renderModifiers(): void {
    // Clean up previous
    for (const t of this.modifierTexts) t.destroy();
    this.modifierTexts = [];

    const mods = this.gm.state.encounter?.modifiers;
    if (!mods || mods.length === 0) return;

    const startX = 10;
    const y = 70;
    let xOffset = startX;

    for (const mod of mods) {
      const sign = mod.value > 0 ? '+' : '';
      const colorHex = mod.value > 0
        ? '#' + COLORS.bonus.toString(16).padStart(6, '0')
        : '#' + COLORS.penalty.toString(16).padStart(6, '0');
      const txt = this.add.text(xOffset, y, `${mod.tag} ${sign}${mod.value}`, {
        fontFamily: FONTS.body,
        fontSize: '9px',
        color: colorHex,
      });
      this.modifierTexts.push(txt);
      xOffset += txt.width + 10;
    }
  }

  private refreshHeader(): void {
    const state = this.gm.state;
    this.encounterNameText.setText(state.encounter?.name ?? 'Encounter');
    const threshold = state.encounter?.scoreThreshold ?? 0;
    const discards = state.riverDiscardCount;
    const maxDiscards = 10;
    const filled = Math.min(discards, maxDiscards);
    const empty = maxDiscards - filled;
    const turnBar = '\u2588'.repeat(filled) + '\u2591'.repeat(empty);

    this.targetText.setText(`Target: ${threshold}   Turns: ${turnBar} ${discards}`);

    if (state.turnPhase === 'draw') {
      this.phaseText.setText('\u2191 Draw a card');
      this.phaseText.setColor('#22c55e');
    } else {
      this.phaseText.setText('\u2193 Discard a card');
      this.phaseText.setColor('#c4433a');
    }

    // First-level hints
    if (this.isFirstLevel && state.phase === 'player_turn') {
      this.showPhaseHint(state.turnPhase);
    } else {
      this.clearPhaseHint();
    }
  }

  // ═══════════════════════════════════════════════════════
  //  RIVER ZONE
  // ═══════════════════════════════════════════════════════

  private createRiverZone(): void {
    // River label
    this.riverLabel = this.add.text(this.layoutOffsetX + 10, this.riverStartY, '', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#6b5c4e',
    });

    // Deck pile (no Phaser interactive — taps handled at scene level)
    const deckX = this.layoutOffsetX + 10 + CARD.WIDTH * this.scales.river / 2 + 4;
    const deckY = this.riverStartY + 18 + CARD.HEIGHT * this.scales.river / 2;
    const deckCount = this.gm.state.river?.deck.length ?? 0;
    this.deckPile = new DeckPileObject(this, deckX, deckY, deckCount, this.scales.river);
    this.deckPilePos = { x: deckX, y: deckY };
  }

  private refreshRiver(): void {
    const state = this.gm.state;
    const riverCards = state.river?.cards ?? [];
    const deckCount = state.river?.deck.length ?? 0;
    const isDraw = state.turnPhase === 'draw' && state.phase === 'player_turn';

    // Update labels
    this.riverLabel.setText(`RIVER (${riverCards.length})`);
    this.deckPile.setCount(deckCount);
    this.deckPile.setCanDraw(isDraw && deckCount > 0);

    // Clear old river cards and blocked icons
    this.hoveredRiverIndex = -1;
    for (const c of this.riverCards) { this.tweens.killTweensOf(c); c.destroy(); }
    this.riverCards = [];
    this.riverPositions = [];
    for (const ic of this.riverBlockedIcons) ic.destroy();
    this.riverBlockedIcons = [];

    if (riverCards.length === 0) return;

    // Grid layout: start after deck pile
    const deckRight = this.layoutOffsetX + 10 + CARD.WIDTH * this.scales.river + 16;
    const gridY = this.riverStartY + 18;
    const maxCols = Math.max(1, Math.floor((this.layoutW - 10 - CARD.WIDTH * this.scales.river - 16 - 10) / (CARD.WIDTH * this.scales.river + 6)));
    const positions = LayoutHelper.gridLayout(
      riverCards.length,
      deckRight,
      gridY,
      this.scales.river,
      maxCols,
      6,
    );
    this.riverPositions = positions;

    const riverBlocked = this.gm.isRiverDrawBlocked();

    for (let i = 0; i < riverCards.length; i++) {
      const resolved = resolveCard(riverCards[i]);
      const pos = positions[i];
      const card = CardFactory.create(this, resolved, pos.x, pos.y, this.scales.river);

      if (isDraw && !riverBlocked) {
        card.setGlowing(true, 'green');
      } else if (isDraw && riverBlocked) {
        // Show blocked indication — dim the card and add lock icon
        card.setAlpha(0.5);
        const lockIcon = this.add.text(pos.x, pos.y, '🔒', {
          fontSize: `${Math.round(18 * this.scales.river)}px`,
          resolution: 2,
        }).setOrigin(0.5).setDepth(card.depth + 1);
        this.riverBlockedIcons.push(lockIcon);
      }

      // No Phaser interactive — taps handled at scene level
      card.setData('riverIndex', i);
      card.setData('instanceId', riverCards[i].instanceId);

      this.riverCards.push(card);
    }

    // ── Rival intent marker ──
    this.clearRivalMarkers();
    const intent = this.gm.state.rivalIntent;
    if (intent) {
      if (intent.type === 'river') {
        const targetIdx = riverCards.findIndex(c => c.instanceId === intent.cardInstanceId);
        if (targetIdx >= 0 && this.riverCards[targetIdx]) {
          const card = this.riverCards[targetIdx];
          const resolved = resolveCard(riverCards[targetIdx]);
          const marker = this.createRivalMarker(
            card.x, card.y - CARD.HEIGHT * this.scales.river / 2 - 10,
            `Rival wants: ${resolved.name}`,
          );
          this.rivalMarkers.push(marker);
        }
      } else if (intent.type === 'deck') {
        const marker = this.createRivalMarker(
          this.deckPilePos.x, this.deckPilePos.y - CARD.HEIGHT * this.scales.river / 2 - 10,
          'Rival wants a card from the deck',
        );
        this.rivalMarkers.push(marker);
      }
    }
  }

  private createRivalMarker(x: number, y: number, tooltipText: string): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setDepth(90);
    // Skull icon background
    const bg = this.add.circle(0, 0, 12, 0x000000, 0.6);
    const icon = this.add.text(0, 0, '👁', {
      fontSize: '14px',
      resolution: 2,
    }).setOrigin(0.5);
    container.add([bg, icon]);

    // Tooltip (hidden by default, shown on hover)
    const tooltip = this.add.text(0, -22, tooltipText, {
      fontFamily: FONTS.body,
      fontSize: '11px',
      color: '#ffffff',
      backgroundColor: '#000000cc',
      padding: { x: 8, y: 4 },
      resolution: 2,
    }).setOrigin(0.5).setAlpha(0);
    container.add(tooltip);

    // Make interactive for hover
    const hitArea = new Phaser.Geom.Circle(0, 0, 16);
    container.setInteractive(hitArea, Phaser.Geom.Circle.Contains);
    container.on('pointerover', () => tooltip.setAlpha(1));
    container.on('pointerout', () => tooltip.setAlpha(0));

    // Pulsing animation
    this.tweens.add({
      targets: container,
      scaleX: 1.2,
      scaleY: 1.2,
      alpha: 0.7,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    return container;
  }

  private clearRivalMarkers(): void {
    for (const m of this.rivalMarkers) {
      this.tweens.killTweensOf(m);
      m.destroy();
    }
    this.rivalMarkers = [];
  }

  /** Check if pointer is over the deck pile */
  private isDeckAtPointer(px: number, py: number): boolean {
    const s = this.scales.river;
    const halfW = (CARD.WIDTH * s) / 2 + 10;
    const halfH = (CARD.HEIGHT * s) / 2 + 10;
    const dp = this.deckPilePos;
    return px >= dp.x - halfW && px <= dp.x + halfW &&
           py >= dp.y - halfH && py <= dp.y + halfH;
  }

  /** Scene-level river hover: find which river card pointer is over */
  private getRiverCardAtPointer(px: number, py: number): number {
    const s = this.scales.river;
    const halfW = (CARD.WIDTH * s) / 2;
    const halfH = (CARD.HEIGHT * s) / 2;
    for (let i = this.riverPositions.length - 1; i >= 0; i--) {
      const pos = this.riverPositions[i];
      if (px >= pos.x - halfW && px <= pos.x + halfW &&
          py >= pos.y - halfH && py <= pos.y + halfH) {
        return i;
      }
    }
    return -1;
  }

  private setHoveredRiverIndex(newIndex: number): void {
    if (newIndex === this.hoveredRiverIndex) return;
    const oldIndex = this.hoveredRiverIndex;
    this.hoveredRiverIndex = newIndex;

    // Un-hover old
    if (oldIndex >= 0 && oldIndex < this.riverCards.length) {
      const card = this.riverCards[oldIndex];
      const pos = this.riverPositions[oldIndex];
      this.tweens.killTweensOf(card);
      this.tweens.add({
        targets: card,
        x: pos.x, y: pos.y,
        scaleX: this.scales.river, scaleY: this.scales.river,
        duration: 120, ease: 'Quad.easeOut',
      });
      card.setDepth(oldIndex);
    }

    // Clear shadow
    this.clearHoverShadow();

    // Hover new — scale to match hand hover size
    if (newIndex >= 0 && newIndex < this.riverCards.length) {
      const card = this.riverCards[newIndex];
      const pos = this.riverPositions[newIndex];
      const targetScale = this.scales.hand * 1.5;
      this.tweens.killTweensOf(card);
      this.tweens.add({
        targets: card,
        y: pos.y - 20,
        scaleX: targetScale, scaleY: targetScale,
        duration: 150, ease: 'Back.easeOut',
      });
      // Add shadow behind hovered river card
      this.hoverShadow = this.add.graphics();
      this.hoverShadow.setDepth(99);
      const sw = CARD.WIDTH * targetScale;
      const sh = CARD.HEIGHT * targetScale;
      const sx = pos.x - sw / 2;
      const sy = pos.y - 20 - sh / 2;
      this.hoverShadow.fillStyle(0x000000, 0.06);
      this.hoverShadow.fillRoundedRect(sx - 20, sy - 20, sw + 40, sh + 40, 22);
      this.hoverShadow.fillStyle(0x000000, 0.10);
      this.hoverShadow.fillRoundedRect(sx - 14, sy - 14, sw + 28, sh + 28, 18);
      this.hoverShadow.fillStyle(0x000000, 0.16);
      this.hoverShadow.fillRoundedRect(sx - 8, sy - 8, sw + 16, sh + 16, 14);
      this.hoverShadow.fillStyle(0x000000, 0.24);
      this.hoverShadow.fillRoundedRect(sx - 3, sy - 3, sw + 6, sh + 6, 10);

      card.setDepth(100);

      // Show keyword tooltips
      this.clearKeywordTooltips();
      const resolved = card.getCard();
      if (resolved) {
        this.keywordTooltips = createKeywordTooltips(
          this, resolved, pos.x, pos.y - 20, targetScale, getPoolCardIds(),
        );
      }
    }

    // Clear tooltips when un-hovering
    if (newIndex < 0) {
      this.clearKeywordTooltips();
    }
  }

  private isDrawAnimating = false;

  private onDeckTap(): void {
    const state = this.gm.state;
    if (state.phase !== 'player_turn' || state.turnPhase !== 'draw') return;
    if (!state.river || state.river.deck.length === 0) return;
    if (this.isDrawAnimating) return;

    // Peek at the top card before drawing
    const topCard = state.river.deck[0];
    if (!topCard) return;

    this.isDrawAnimating = true;
    const resolved = resolveCard(topCard);
    const cx = this.width / 2;
    const cy = this.height * 0.4;

    // Create a preview card at the deck position
    const previewScale = Math.min(1.8, this.width / (CARD.WIDTH * 1.2));
    const preview = CardFactory.create(this, resolved, this.deckPilePos.x, this.deckPilePos.y, this.scales.river);
    preview.setDepth(300);
    preview.setAlpha(0.8);

    // Phase 1: Fly from deck to center + enlarge (300ms)
    this.tweens.add({
      targets: preview,
      x: cx,
      y: cy,
      scaleX: previewScale,
      scaleY: previewScale,
      alpha: 1,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Phase 2: Hold at center for 800ms
        this.time.delayedCall(800, () => {
          // Phase 3: Fly to hand
          this.animateCardToHand(preview, () => {
            this.isDrawAnimating = false;
            this.gm.drawFromDeckAction();
          });
        });
      },
    });
  }

  private onRiverCardTap(riverIndex: number): void {
    const state = this.gm.state;
    if (state.phase !== 'player_turn' || state.turnPhase !== 'draw') return;
    if (this.isDrawAnimating) return;
    if (this.gm.isRiverDrawBlocked()) return; // Ongoing: can't draw from river

    const riverCard = state.river?.cards[riverIndex];
    if (!riverCard) return;

    this.isDrawAnimating = true;
    this.setHoveredRiverIndex(-1);

    const resolved = resolveCard(riverCard);
    const cx = this.width / 2;
    const cy = this.height * 0.4;
    const previewScale = Math.min(1.8, this.width / (CARD.WIDTH * 1.2));

    // Hide the original river card
    const origCard = this.riverCards[riverIndex];
    const startX = origCard?.x ?? cx;
    const startY = origCard?.y ?? cy;
    const startScale = origCard?.scaleX ?? this.scales.river;
    if (origCard) origCard.setVisible(false);

    // Create preview at river card position
    const preview = CardFactory.create(this, resolved, startX, startY, startScale);
    preview.setDepth(300);

    // Phase 1: Fly to center + enlarge (300ms)
    this.tweens.add({
      targets: preview,
      x: cx,
      y: cy,
      scaleX: previewScale,
      scaleY: previewScale,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        // Phase 2: Hold for 600ms (shorter since player already saw it in river)
        this.time.delayedCall(600, () => {
          // Phase 3: Fly to hand
          this.animateCardToHand(preview, () => {
            this.isDrawAnimating = false;
            this.gm.drawCard(riverIndex);
          });
        });
      },
    });
  }

  /** Shared animation: fly a preview card into the hand area then call onDone */
  private animateCardToHand(preview: CardObject, onDone: () => void): void {
    const handY = this.handBottomY - CARD.HEIGHT * this.scales.hand / 2 - 10;
    const cx = this.width / 2;

    this.tweens.add({
      targets: preview,
      x: cx,
      y: handY,
      scaleX: this.scales.hand,
      scaleY: this.scales.hand,
      duration: 350,
      ease: 'Cubic.easeInOut',
      onComplete: () => {
        // Brief settle at hand position
        this.tweens.add({
          targets: preview,
          alpha: 0,
          scaleX: this.scales.hand * 0.9,
          scaleY: this.scales.hand * 0.9,
          duration: 150,
          ease: 'Quad.easeIn',
          onComplete: () => {
            preview.destroy();
            onDone();
          },
        });
      },
    });
  }

  // ═══════════════════════════════════════════════════════
  //  SCORE PANEL
  // ═══════════════════════════════════════════════════════

  private createScorePanel(): void {
    this.scoreText = this.add.text(this.layoutOffsetX + 14, this.scorePanelY, 'Score: 0', {
      fontFamily: FONTS.display,
      fontSize: '14px',
      color: '#2c1810',
    });

    this.finalizeBtn = new ButtonObject(this, this.layoutOffsetX + this.layoutW - 90, this.scorePanelY + 10, 'Finalize', {
      width: 120,
      height: 32,
      fontSize: '13px',
      color: COLORS.tag.Leader,
      onClick: () => this.onFinalize(),
    });

    // View Deck button
    const deckLabel = this.add.text(this.layoutOffsetX + this.layoutW - 14, this.scorePanelY + 36, '📋 Deck', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#8a7a5c',
      resolution: 2,
    }).setOrigin(1, 0);
    const deckZone = this.add.zone(deckLabel.x - deckLabel.width / 2, deckLabel.y + 6, deckLabel.width + 16, 18)
      .setInteractive({ useHandCursor: true });
    deckZone.on('pointerdown', () => {
      this.scene.pause();
      this.scene.launch('PoolViewerScene', { returnScene: 'EncounterScene' });
    });
  }

  private refreshScorePanel(): void {
    const result = this.gm.getLiveScore();
    const score = result?.totalScore ?? 0;
    this.scoreText.setText(`Score: ${score}`);

    // Clear old breakdown
    for (const t of this.scoreBreakdownTexts) t.destroy();
    this.scoreBreakdownTexts = [];

    // Show per-card mini breakdown
    if (result && result.breakdown.length > 0) {
      const startY = this.scorePanelY + 22;
      const cols = Math.min(result.breakdown.length, 4);
      const colW = Math.min(160, (this.layoutW - 20) / cols);

      for (let i = 0; i < result.breakdown.length; i++) {
        const entry = result.breakdown[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = this.layoutOffsetX + 14 + col * colW;
        const y = startY + row * 13;

        const name = entry.cardName.length > 12 ? entry.cardName.slice(0, 11) + '…' : entry.cardName;
        const sign = entry.finalValue >= 0 ? '' : '';
        const color = entry.blanked ? '#c4433a' : (entry.finalValue >= entry.baseValue ? '#2c1810' : '#c4433a');

        const txt = this.add.text(x, y, `${name}: ${sign}${entry.finalValue}`, {
          fontFamily: FONTS.body,
          fontSize: '9px',
          color,
        });
        this.scoreBreakdownTexts.push(txt);
      }
    }

    // Only allow finalize during draw phase with cards in hand (not during discard)
    const hasCards = this.gm.state.hand.cards.length > 0;
    const isDiscardPhase = this.gm.state.turnPhase === 'discard' && this.gm.state.phase === 'player_turn';
    this.finalizeBtn.setEnabled(hasCards && !isDiscardPhase);
  }

  // ═══════════════════════════════════════════════════════
  //  FIRST-LEVEL HINTS
  // ═══════════════════════════════════════════════════════

  private showPhaseHint(phase: string): void {
    this.clearPhaseHint();

    this.hintContainer = this.add.container(0, 0);
    this.hintContainer.setDepth(5); // behind cards (cards are 10+)

    if (phase === 'draw') {
      // Position below the deck/river area, left-aligned
      const riverBottom = this.riverStartY + 18 + CARD.HEIGHT * this.scales.river + 8;
      const hintX = 14;
      const hintY = riverBottom;

      // Background pill
      const bg = this.add.graphics();
      const pillW = 220;
      bg.fillStyle(0x22c55e, 0.15);
      bg.fillRoundedRect(hintX, hintY, pillW, 24, 12);
      bg.lineStyle(1.5, 0x22c55e, 0.4);
      bg.strokeRoundedRect(hintX, hintY, pillW, 24, 12);
      this.hintContainer.add(bg);

      const hint = this.add.text(hintX + pillW / 2, hintY + 4, '▲ Tap deck or river card to draw', {
        fontFamily: FONTS.card, fontSize: '10px', color: '#166534',
        fontStyle: 'bold', resolution: 2,
      }).setOrigin(0.5, 0);
      this.hintContainer.add(hint);

      // Pulse
      this.tweens.add({
        targets: [bg, hint],
        alpha: { from: 0.5, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    } else if (phase === 'discard') {
      // Position just above hand cards
      const dcx = this.width / 2;
      const handTopY = this.handBottomY - CARD.HEIGHT * this.scales.hand - 50;
      const hintY = handTopY;
      const pillW = 260;

      // Background pill
      const bg = this.add.graphics();
      bg.fillStyle(0xc4433a, 0.12);
      bg.fillRoundedRect(dcx - pillW / 2, hintY - 4, pillW, 28, 14);
      bg.lineStyle(1.5, 0xc4433a, 0.4);
      bg.strokeRoundedRect(dcx - pillW / 2, hintY - 4, pillW, 28, 14);
      this.hintContainer.add(bg);

      const hint = this.add.text(dcx, hintY + 2, '▲  Drag a card up to the river  ▲', {
        fontFamily: FONTS.card, fontSize: '10px', color: '#991b1b',
        fontStyle: 'bold', resolution: 2,
      }).setOrigin(0.5, 0);
      this.hintContainer.add(hint);

      // Pulse
      this.tweens.add({
        targets: [bg, hint],
        alpha: { from: 0.5, to: 1 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private clearPhaseHint(): void {
    if (this.hintContainer) {
      this.tweens.killTweensOf(this.hintContainer.list);
      this.hintContainer.destroy(true);
      this.hintContainer = null;
    }
  }

  private clearHoverShadow(): void {
    if (this.hoverShadow) {
      this.hoverShadow.destroy();
      this.hoverShadow = null;
    }
  }

  private clearKeywordTooltips(): void {
    if (this.keywordTooltips) {
      this.keywordTooltips.destroy(true);
      this.keywordTooltips = null;
    }
  }

  private onFinalize(): void {
    this.gm.finalizeHand();
    // Only go to scoring if we're not resolving on-end effects
    if (this.gm.state.phase === 'scoring') {
      this.scene.start('ScoringScene');
    }
    // If phase is 'on_end_resolution', the popup will be shown via onStateChanged
  }

  // ═══════════════════════════════════════════════════════
  //  HAND ZONE — scene-level pointer tracking for hover
  // ═══════════════════════════════════════════════════════

  private createHandZone(): void {
    const handY = this.handBottomY - CARD.HEIGHT * this.scales.hand - 30;
    this.handLabel = this.add.text(this.layoutOffsetX + 10, handY, '', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#6b5c4e',
    });

    // ── All pointer handling at scene level (no Phaser drag system) ──

    let pointerDownIdx = -1;
    const DRAG_THRESHOLD = 8; // px before we start dragging

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.onEndPopupGroup) return;
      if (this.draggingCard) return;

      // Check hand cards first (for drag initiation)
      const idx = this.getHandCardAtPointer(pointer.x, pointer.y);
      if (idx >= 0) {
        pointerDownIdx = idx;
        return;
      }
      pointerDownIdx = -1;

      // Check deck tap
      if (this.isDeckAtPointer(pointer.x, pointer.y)) {
        this.clearHoverShadow();
        this.clearKeywordTooltips();
        this.onDeckTap();
        return;
      }

      // Check river card tap (skip if river draw is blocked by ongoing effect)
      if (!this.gm.isRiverDrawBlocked()) {
        const riverIdx = this.getRiverCardAtPointer(pointer.x, pointer.y);
        if (riverIdx >= 0) {
          // Clear hover effects before drawing
          this.clearHoverShadow();
          this.clearKeywordTooltips();
          this.setHoveredRiverIndex(-1);
          this.onRiverCardTap(riverIdx);
          return;
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      // Block scene-level input when a popup overlay is active
      if (this.onEndPopupGroup) return;

      // If we're dragging, move the card
      if (this.draggingCard) {
        this.draggingCard.x = pointer.x;
        this.draggingCard.y = pointer.y;
        this.updateDragPreview(pointer.x);
        return;
      }

      // Check if we should initiate a drag (pointer is down on a hand card + moved enough)
      if (pointer.isDown && pointerDownIdx >= 0 && pointerDownIdx < this.handCards.length) {
        const card = this.handCards[pointerDownIdx];
        const pos = this.handPositions[pointerDownIdx];
        if (pos) {
          const dx = pointer.x - pos.x;
          const dy = pointer.y - pos.y;
          if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) {
            this.onHandDragStart(card);
            pointerDownIdx = -1;
          }
        }
        return;
      }

      // Hover detection
      const handIdx = this.getHandCardAtPointer(pointer.x, pointer.y);
      this.setHoveredIndex(handIdx);
      const riverIdx = handIdx < 0 ? this.getRiverCardAtPointer(pointer.x, pointer.y) : -1;
      this.setHoveredRiverIndex(riverIdx);
    });

    this.input.on('pointerup', (_pointer: Phaser.Input.Pointer) => {
      if (this.onEndPopupGroup) return;
      if (this.draggingCard) {
        this.onHandDragEnd(this.draggingCard);
      }
      pointerDownIdx = -1;
    });
  }

  private refreshHand(): void {
    // Clear old hand cards
    this.hoveredHandIndex = -1;
    this.draggingCard = null;
    for (const c of this.handCards) {
      this.tweens.killTweensOf(c);
      c.destroy();
    }
    this.handCards = [];
    this.handPositions = [];

    const handCards = this.gm.state.hand.cards;
    if (handCards.length === 0) {
      this.handLabel.setText('HAND (0)');
      return;
    }

    this.handLabel.setText(`HAND (${handCards.length})`);

    const cx = this.width / 2;
    this.handPositions = LayoutHelper.fanLayout(
      handCards.length,
      cx,
      this.handBottomY - CARD.HEIGHT * this.scales.hand / 2 - 10,
      this.scales.hand,
    );

    // Get live score to know which cards are blanked and which tags are cleared
    const liveScore = this.gm.getLiveScore();
    const blankedCardIds = new Set<string>();
    const clearedTags = new Set<string>(liveScore?.clearedTags ?? []);
    if (liveScore) {
      for (const entry of liveScore.breakdown) {
        if (entry.blanked) blankedCardIds.add(entry.cardId);
      }
    }

    for (let i = 0; i < handCards.length; i++) {
      const resolved = resolveCard(handCards[i]);
      const pos = this.handPositions[i];
      const card = CardFactory.create(this, resolved, pos.x, pos.y, this.scales.hand, clearedTags.size > 0 ? clearedTags : undefined);
      card.setRotation(pos.rotation);
      card.setDepth(i);

      // Apply blanked visual
      if (blankedCardIds.has(handCards[i].defId)) {
        card.setBlanked(true);
      }

      // Glow during discard phase to indicate cards can be discarded
      const isDiscardPhase = this.gm.state.phase === 'player_turn' && this.gm.state.turnPhase === 'discard';
      if (isDiscardPhase) {
        card.setGlowing(true, 'green');
      }

      // Store index (no Phaser interactive needed — drag handled at scene level)
      card.setData('handIndex', i);

      this.handCards.push(card);
    }
  }

  /**
   * Find which hand card the pointer is over, using world-space distance.
   * Returns index or -1 if pointer is not near any card.
   * Cards on the right (higher index) take priority since they overlap to the front.
   */
  private getHandCardAtPointer(px: number, py: number): number {
    if (this.handPositions.length === 0) return -1;

    const s = this.scales.hand;
    const halfW = (CARD.WIDTH * s) / 2;
    const halfH = (CARD.HEIGHT * s) / 2;

    // Check from rightmost (topmost in fan) to leftmost
    for (let i = this.handPositions.length - 1; i >= 0; i--) {
      const pos = this.handPositions[i];
      // Use a generous bounding box around the card's origin
      if (
        px >= pos.x - halfW - 5 &&
        px <= pos.x + halfW + 5 &&
        py >= pos.y - halfH - 10 &&
        py <= pos.y + halfH + 10
      ) {
        return i;
      }
    }
    return -1;
  }

  /** Set which hand card index is hovered (or -1 for none). Handles transitions. */
  private setHoveredIndex(newIndex: number): void {
    if (newIndex === this.hoveredHandIndex) return;

    this.hoveredHandIndex = newIndex;

    // Push neighboring cards outward and return all non-hovered cards to rest
    const hoverExtraHalfW = CARD.WIDTH * (this.scales.hand * 1.5 - this.scales.hand) * 0.9;
    for (let i = 0; i < this.handCards.length; i++) {
      if (i === newIndex) continue;
      const c = this.handCards[i];
      const p = this.handPositions[i];
      if (!c || !p) continue;

      let pushX = 0;
      if (newIndex >= 0) {
        const dist = Math.abs(i - newIndex);
        if (dist <= 4) {
          const factor = 1 - (dist - 1) / 4; // 1.0, 0.75, 0.5, 0.25
          pushX = (i < newIndex ? -1 : 1) * hoverExtraHalfW * Math.max(factor, 0);
        }
      }

      this.tweens.killTweensOf(c);
      this.tweens.add({
        targets: c,
        x: p.x + pushX,
        y: p.y,
        rotation: p.rotation,
        scaleX: this.scales.hand,
        scaleY: this.scales.hand,
        duration: 120,
        ease: 'Quad.easeOut',
      });
      c.setDepth(i);
    }

    // Remove old shadow
    this.clearHoverShadow();

    // Hover new card
    if (newIndex >= 0 && newIndex < this.handCards.length) {
      const card = this.handCards[newIndex];
      const pos = this.handPositions[newIndex];
      this.tweens.killTweensOf(card);
      this.tweens.add({
        targets: card,
        x: pos.x,
        y: pos.y - 40,
        rotation: 0,
        scaleX: this.scales.hand * 1.5,
        scaleY: this.scales.hand * 1.5,
        duration: 150,
        ease: 'Back.easeOut',
      });
      // Add dark shadow behind hovered card
      const hoverScale = this.scales.hand * 1.5;
      this.hoverShadow = this.add.graphics();
      this.hoverShadow.setDepth(99);
      const sw = CARD.WIDTH * hoverScale;
      const sh = CARD.HEIGHT * hoverScale;
      const sx = pos.x - sw / 2;
      const sy = pos.y - 40 - sh / 2;
      this.hoverShadow.fillStyle(0x000000, 0.06);
      this.hoverShadow.fillRoundedRect(sx - 20, sy - 20, sw + 40, sh + 40, 22);
      this.hoverShadow.fillStyle(0x000000, 0.10);
      this.hoverShadow.fillRoundedRect(sx - 14, sy - 14, sw + 28, sh + 28, 18);
      this.hoverShadow.fillStyle(0x000000, 0.16);
      this.hoverShadow.fillRoundedRect(sx - 8, sy - 8, sw + 16, sh + 16, 14);
      this.hoverShadow.fillStyle(0x000000, 0.24);
      this.hoverShadow.fillRoundedRect(sx - 3, sy - 3, sw + 6, sh + 6, 10);

      card.setDepth(100);

      // Show keyword tooltips
      this.clearKeywordTooltips();
      const resolved = card.getCard();
      if (resolved) {
        this.keywordTooltips = createKeywordTooltips(
          this, resolved, pos.x, pos.y - 40, hoverScale, getPoolCardIds(),
        );
      }
    }

    // Clear tooltips when un-hovering
    if (newIndex < 0) {
      this.clearKeywordTooltips();
    }

    // Draw relationship arrows (with animation follow)
    if (newIndex >= 0) {
      this.drawRelationArrows(newIndex);
      this.startArrowRedraw();
    } else {
      this.stopArrowRedraw();
      this.arrowGraphics.clear();
    }
  }

  // ── Relationship arrows ──

  /** Get the top-center point of a card in world space, reading its actual position */
  private getCardTopCenter(card: CardObject): { x: number; y: number } {
    const halfH = (CARD.HEIGHT * card.scaleY) / 2;
    return { x: card.x, y: card.y - halfH };
  }

  private drawRelationArrows(hoveredIndex: number): void {
    this.arrowGraphics.clear();

    if (hoveredIndex < 0 || hoveredIndex >= this.handCards.length) return;

    const resolvedHand = this.gm.getResolvedHand();
    if (!resolvedHand || resolvedHand.length === 0) return;

    const focused = resolvedHand[hoveredIndex];
    if (!focused) return;

    // Also resolve river cards for cross-zone arrows
    const riverInstances = this.gm.state.river?.cards ?? [];
    const resolvedRiver = riverInstances.map(c => resolveCard(c));
    const allCards = [...resolvedHand, ...resolvedRiver];

    const relations = getCardRelations(focused, allCards);
    if (relations.length === 0) return;

    // Build instanceId → card object map (hand + river)
    const idToCard = new Map<string, CardObject>();
    for (let i = 0; i < resolvedHand.length; i++) {
      if (this.handCards[i]) idToCard.set(resolvedHand[i].instanceId, this.handCards[i]);
    }
    for (let i = 0; i < resolvedRiver.length; i++) {
      if (this.riverCards[i]) idToCard.set(resolvedRiver[i].instanceId, this.riverCards[i]);
    }

    for (const rel of relations) {
      const fromCard = idToCard.get(rel.fromInstanceId);
      const toCard = idToCard.get(rel.toInstanceId);
      if (!fromCard || !toCard) continue;
      if (fromCard === toCard) continue;

      // Read actual positions from the card objects (accounts for hover lift + scale)
      const from = this.getCardTopCenter(fromCard);
      const to = this.getCardTopCenter(toCard);

      const color = rel.type === 'bonus' ? 0x22c55e : 0xc4433a;
      const alpha = 0.8;

      // Bezier curve arching upward
      const midX = (from.x + to.x) / 2;
      const dist = Math.abs(to.x - from.x) + Math.abs(to.y - from.y) * 0.5;
      const arcH = Math.min(80, dist * 0.3 + 30);
      const cpY = Math.min(from.y, to.y) - arcH;

      this.arrowGraphics.lineStyle(2.5, color, alpha);
      const curve = new Phaser.Curves.QuadraticBezier(
        new Phaser.Math.Vector2(from.x, from.y),
        new Phaser.Math.Vector2(midX, cpY),
        new Phaser.Math.Vector2(to.x, to.y),
      );
      curve.draw(this.arrowGraphics, 32);

      // Arrowhead
      const endT = curve.getPoint(0.94);
      const endP = curve.getPoint(1.0);
      const angle = Math.atan2(endP.y - endT.y, endP.x - endT.x);
      const headLen = 8;
      const headAngle = Math.PI / 6;

      this.arrowGraphics.fillStyle(color, alpha);
      this.arrowGraphics.fillTriangle(
        endP.x, endP.y,
        endP.x - headLen * Math.cos(angle - headAngle),
        endP.y - headLen * Math.sin(angle - headAngle),
        endP.x - headLen * Math.cos(angle + headAngle),
        endP.y - headLen * Math.sin(angle + headAngle),
      );
    }
  }

  /** Redraw arrows on a timer so they follow the hover animation */
  private arrowRedrawTimer: Phaser.Time.TimerEvent | null = null;

  private startArrowRedraw(): void {
    this.stopArrowRedraw();
    // Redraw arrows every frame for 200ms to follow the tween animation
    let frames = 0;
    this.arrowRedrawTimer = this.time.addEvent({
      delay: 16,
      repeat: 12, // ~200ms
      callback: () => {
        if (this.hoveredHandIndex >= 0) {
          this.drawRelationArrows(this.hoveredHandIndex);
        }
        frames++;
      },
    });
  }

  private stopArrowRedraw(): void {
    if (this.arrowRedrawTimer) {
      this.arrowRedrawTimer.destroy();
      this.arrowRedrawTimer = null;
    }
  }

  // ── Drag reorder preview ──

  private updateDragPreview(pointerX: number): void {
    if (!this.draggingCard || this.handPositions.length <= 1) return;
    // Find which slot the dragged card is closest to
    let closest = this.dragCardIndex;
    let minDist = Infinity;
    for (let i = 0; i < this.handPositions.length; i++) {
      const dist = Math.abs(pointerX - this.handPositions[i].x);
      if (dist < minDist) { minDist = dist; closest = i; }
    }
    if (closest === this.dragPreviewIndex) return;
    this.dragPreviewIndex = closest;

    // Compute shifted positions: move other cards to make room
    const from = this.dragCardIndex;
    const to = closest;
    for (let i = 0; i < this.handCards.length; i++) {
      if (this.handCards[i] === this.draggingCard) continue;
      // Where should card i visually go?
      let visualIdx = i;
      if (from < to) {
        // Dragging right: cards between from+1..to shift left by 1
        if (i > from && i <= to) visualIdx = i - 1;
        else if (i <= from) visualIdx = i;
        else visualIdx = i;
      } else if (from > to) {
        // Dragging left: cards between to..from-1 shift right by 1
        if (i >= to && i < from) visualIdx = i + 1;
        else if (i >= from) visualIdx = i;
        else visualIdx = i;
      }
      const targetPos = this.handPositions[visualIdx];
      if (!targetPos) continue;
      this.tweens.killTweensOf(this.handCards[i]);
      this.tweens.add({
        targets: this.handCards[i],
        x: targetPos.x,
        y: targetPos.y,
        rotation: targetPos.rotation,
        duration: 120,
        ease: 'Quad.easeOut',
      });
    }
  }

  private resetDragPreview(): void {
    // Return all non-dragged cards to their original positions
    for (let i = 0; i < this.handCards.length; i++) {
      if (this.handCards[i] === this.draggingCard) continue;
      const pos = this.handPositions[i];
      if (!pos) continue;
      this.tweens.killTweensOf(this.handCards[i]);
      this.tweens.add({
        targets: this.handCards[i],
        x: pos.x, y: pos.y, rotation: pos.rotation,
        duration: 120, ease: 'Quad.easeOut',
      });
    }
    this.dragPreviewIndex = -1;
  }

  // ── Drag handlers ──

  private onHandDragStart(card: CardObject): void {
    // Clear hover + arrows
    this.setHoveredIndex(-1);
    this.setHoveredRiverIndex(-1);
    this.arrowGraphics.clear();
    this.draggingCard = card;

    const idx = card.getData('handIndex') as number;
    const pos = this.handPositions[idx];
    this.dragStartY = pos?.y ?? card.y;
    this.dragCardIndex = idx;
    this.dragPreviewIndex = idx;

    this.tweens.killTweensOf(card);
    card.setScale(this.scales.hand);
    card.setRotation(0);
    card.setDepth(200);
  }

  private onHandDragEnd(card: CardObject): void {
    const dy = this.dragStartY - card.y; // positive = dragged UP
    const handIndex = this.dragCardIndex;
    const previewIndex = this.dragPreviewIndex;

    this.draggingCard = null;
    this.dragPreviewIndex = -1;

    // Discard: drag UP past 50px during discard phase
    if (
      dy > 50 &&
      this.gm.state.turnPhase === 'discard' &&
      this.gm.state.phase === 'player_turn'
    ) {
      this.resetDragPreview();
      this.tweens.add({
        targets: card,
        y: this.riverStartY + 50,
        alpha: 0,
        scaleX: this.scales.river,
        scaleY: this.scales.river,
        duration: DURATION.cardDiscard,
        ease: 'Quad.easeIn',
        onComplete: () => this.gm.discardCard(handIndex),
      });
      return;
    }

    // Reorder: use the preview index (where other cards already shifted to)
    if (previewIndex >= 0 && previewIndex !== handIndex) {
      this.gm.reorderHand(handIndex, previewIndex);
      return;
    }

    // Snap back + reset preview positions
    this.resetDragPreview();
    const pos = this.handPositions[handIndex];
    if (!pos) return;
    this.tweens.add({
      targets: card,
      x: pos.x,
      y: pos.y,
      rotation: pos.rotation,
      scaleX: this.scales.hand,
      scaleY: this.scales.hand,
      duration: DURATION.springIn,
      ease: 'Back.easeOut',
      onComplete: () => card.setDepth(handIndex),
    });
  }

  // ═══════════════════════════════════════════════════════
  //  REFRESH HELPERS
  // ═══════════════════════════════════════════════════════

  private refreshAll(): void {
    this.refreshHeader();
    this.refreshRiver();
    this.refreshScorePanel();
    this.refreshHand();
  }

  private onStateChanged(): void {
    // Check if encounter ended -> scoring
    if (this.gm.state.phase === 'scoring') {
      this.scene.start('ScoringScene');
      return;
    }

    // Check for on-end resolution popup
    if (this.gm.state.phase === 'on_end_resolution' && this.gm.state.pendingChoice?.type === 'on_end_pick_from_discard') {
      this.showOnEndPickPopup();
      return;
    }

    // Check for rival hand pick popup (Hedge Witch)
    if (this.gm.state.pendingChoice?.type === 'pick_from_rival_hand') {
      this.showRivalHandPickPopup();
      return;
    }

    // Check for new exhaust and rival_take events — animate before refreshing river
    const log = this.gm.state.actionLog;
    let hasDelayedAnim = false;
    for (let i = this.lastActionLogLen; i < log.length; i++) {
      const evt = log[i];
      if (evt.type === 'exhaust') {
        const orphanIdx = this.riverCards.findIndex(
          c => c.getData('instanceId') === evt.cardInstanceId
        );
        if (orphanIdx >= 0) {
          const orphanCard = this.riverCards[orphanIdx];
          this.riverCards.splice(orphanIdx, 1);
          this.playExhaustAnimation(orphanCard, evt.cardName);
          hasDelayedAnim = true;
        } else {
          this.showExhaustToast(evt.cardName);
        }
      }
      if (evt.type === 'rival_take') {
        if (evt.cardInstanceId && !evt.fromDeck) {
          // Rival took a river card — find the visual and animate it
          const rivalIdx = this.riverCards.findIndex(
            c => c.getData('instanceId') === evt.cardInstanceId
          );
          if (rivalIdx >= 0) {
            const rivalCard = this.riverCards[rivalIdx];
            this.riverCards.splice(rivalIdx, 1);
            this.playRivalTakeAnimation(rivalCard);
            hasDelayedAnim = true;
          }
        } else {
          // Rival took from deck — animate a card-back sliding off the deck
          this.playRivalTakeDeckAnimation();
          hasDelayedAnim = true;
        }
      }
    }
    this.lastActionLogLen = log.length;

    this.refreshHeader();
    if (hasDelayedAnim) {
      // Delay river refresh so the exhaust/rival animation is visible
      this.exhaustAnimating = true;
      this.time.delayedCall(2000, () => {
        this.exhaustAnimating = false;
        this.refreshRiver();
        this.refreshScorePanel();
        // Deferred popup check — pending choice may have been set during animation delay
        if (this.gm.state.pendingChoice?.type === 'pick_from_rival_hand' && !this.onEndPopupGroup) {
          this.showRivalHandPickPopup();
        }
      });
    } else {
      this.refreshRiver();
      this.refreshScorePanel();
    }

    // Deferred popup check — catches cases where the early return was missed
    if ((this.gm.state.pendingChoice as any)?.type === 'pick_from_rival_hand' && !this.onEndPopupGroup) {
      this.time.delayedCall(50, () => {
        if ((this.gm.state.pendingChoice as any)?.type === 'pick_from_rival_hand' && !this.onEndPopupGroup) {
          this.showRivalHandPickPopup();
        }
      });
    }
  }

  private onHandChanged(): void {
    // Clear any lingering hover effects
    this.clearHoverShadow();
    this.clearKeywordTooltips();
    this.hoveredRiverIndex = -1;

    // Check for scoring transition after discard
    if (this.gm.state.phase === 'scoring') {
      this.scene.start('ScoringScene');
      return;
    }

    // Check for rival hand pick popup (Hedge Witch) — may fire during discard
    if (this.gm.state.pendingChoice?.type === 'pick_from_rival_hand') {
      this.refreshHand();
      this.showRivalHandPickPopup();
      return;
    }

    this.refreshHand();
    this.refreshScorePanel();
    // Also refresh river since draw removes a card from it (but not during exhaust animation)
    if (!this.exhaustAnimating) {
      this.refreshRiver();
    }
    this.refreshHeader();
  }

  // ═══════════════════════════════════════════════════════
  //  CHEATS PANEL (localhost only)
  // ═══════════════════════════════════════════════════════

  private playRivalTakeDeckAnimation(): void {
    // Create a card-back visual at the deck position
    const s = this.scales.river;
    const w = CARD.WIDTH * s;
    const h = CARD.HEIGHT * s;
    const cardBack = this.add.container(this.deckPilePos.x, this.deckPilePos.y).setDepth(400);

    // Card back rectangle
    const rect = this.add.rectangle(0, 0, w, h, 0x5c3d2e).setStrokeStyle(2, 0x3a2517);
    const pattern = this.add.text(0, 0, 'FR', {
      fontFamily: FONTS.display,
      fontSize: `${Math.round(20 * s)}px`,
      color: '#8b6914',
      resolution: 2,
    }).setOrigin(0.5).setAlpha(0.5);
    cardBack.add([rect, pattern]);

    // Slide off to the right and fade (same as river take)
    this.tweens.add({
      targets: cardBack,
      alpha: 0.6,
      duration: 200,
    });
    this.tweens.add({
      targets: cardBack,
      x: cardBack.x + 200,
      alpha: 0,
      scaleX: 0.7,
      scaleY: 0.7,
      duration: 600,
      delay: 300,
      ease: 'Quad.easeIn',
      onComplete: () => cardBack.destroy(),
    });

    // Show toast
    this.showRivalToast();
  }

  private showRivalToast(): void {
    const cx = this.width / 2;
    const cy = this.riverStartY + 60;
    const toast = this.add.text(cx, cy, '👁 Rival took a card', {
      fontFamily: FONTS.body,
      fontSize: '14px',
      color: '#c4433a',
      fontStyle: 'bold',
      backgroundColor: '#00000040',
      padding: { x: 12, y: 6 },
      resolution: 2,
    }).setOrigin(0.5).setDepth(500).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: cy - 20,
      duration: 300,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.tweens.add({
          targets: toast,
          alpha: 0,
          y: cy - 40,
          duration: 400,
          delay: 1000,
          onComplete: () => toast.destroy(),
        });
      },
    });
  }

  private playRivalTakeAnimation(card: Phaser.GameObjects.Container): void {
    card.setDepth(400);

    // Dark tint overlay
    this.tweens.add({
      targets: card,
      alpha: 0.6,
      duration: 200,
    });

    // Slide off to the right and fade
    this.tweens.add({
      targets: card,
      x: card.x + 200,
      alpha: 0,
      scaleX: card.scaleX * 0.7,
      scaleY: card.scaleY * 0.7,
      duration: 600,
      delay: 300,
      ease: 'Quad.easeIn',
      onComplete: () => card.destroy(),
    });

    this.showRivalToast();
  }

  private playExhaustAnimation(card: Phaser.GameObjects.Container, cardName: string): void {
    card.setDepth(400);

    const cx = card.x;
    const cy = card.y;
    const cardW = CARD.WIDTH * this.scales.river;
    const cardH = CARD.HEIGHT * this.scales.river;
    const hasTex = this.textures.exists('particle-glow');
    const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
    const zoneRect = new Phaser.Geom.Rectangle(-cardW / 2, -cardH / 4, cardW, cardH * 0.75);
    const zoneConfig = { type: 'random', source: zoneRect } as Phaser.Types.GameObjects.Particles.ParticleEmitterRandomZoneConfig;

    if (hasTex) {
      // Layer 1 — big fire tongues rising from bottom half
      emitters.push(this.add.particles(cx, cy, 'particle-glow', {
        speed: { min: 40, max: 100 },
        angle: { min: 245, max: 295 },
        scale: { start: 0.9, end: 0.1 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 600, max: 1200 },
        tint: [0xff2200, 0xff4400, 0xff6600, 0xffaa00],
        emitZone: zoneConfig,
        frequency: 25,
        quantity: 4,
      }));

      // Layer 2 — small hot embers that drift upward slowly
      emitters.push(this.add.particles(cx, cy, 'particle-glow', {
        speed: { min: 10, max: 50 },
        angle: { min: 250, max: 290 },
        scale: { start: 0.35, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 800, max: 1800 },
        tint: [0xffdd00, 0xffaa00, 0xff8800],
        emitZone: zoneConfig,
        frequency: 40,
        quantity: 2,
      }));

      // Layer 3 — faint purple/dark ash drifting outward
      emitters.push(this.add.particles(cx, cy, 'particle-glow', {
        speed: { min: 15, max: 45 },
        angle: { min: 0, max: 360 },
        scale: { start: 0.5, end: 0.15 },
        alpha: { start: 0.6, end: 0 },
        lifespan: { min: 1000, max: 2200 },
        tint: [0x4a2060, 0x222222, 0x553366, 0x111111],
        emitZone: zoneConfig,
        frequency: 60,
        quantity: 2,
      }));

      emitters.forEach((e, i) => e.setDepth(401 + i));
    }

    // Phase 1 — red tint flash (card "ignites")
    this.tweens.add({
      targets: card,
      alpha: 0.7,
      duration: 250,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut',
    });

    // Phase 2 — main dissolve: shrink, fade, rise (slower)
    this.tweens.add({
      targets: card,
      scaleX: card.scaleX * 0.15,
      scaleY: card.scaleY * 0.15,
      alpha: 0,
      y: card.y - 60,
      duration: 1400,
      delay: 500,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        card.destroy();
        // Stop emitting, let remaining particles finish their lifespan
        emitters.forEach(e => e.stop());
        this.time.delayedCall(2200, () => {
          emitters.forEach(e => { if (e.active) e.destroy(); });
        });
      },
    });

    // Show toast after a short beat
    this.time.delayedCall(400, () => this.showExhaustToast(cardName));
  }

  private showExhaustToast(cardName: string): void {
    const cx = this.width / 2;
    const cy = this.riverStartY + 60;
    const toast = this.add.text(cx, cy, `⚰ Exhausted: ${cardName}`, {
      fontFamily: 'MedievalSharp, serif',
      fontSize: '22px',
      color: '#9b59b6',
      stroke: '#1a1a2e',
      strokeThickness: 3,
      align: 'center',
    }).setOrigin(0.5).setDepth(500).setAlpha(0);

    this.tweens.add({
      targets: toast,
      alpha: 1,
      y: cy - 30,
      duration: 400,
      ease: 'Back.easeOut',
      onComplete: () => {
        this.time.delayedCall(1200, () => {
          this.tweens.add({
            targets: toast,
            alpha: 0,
            y: cy - 60,
            duration: 500,
            ease: 'Quad.easeIn',
            onComplete: () => toast.destroy(),
          });
        });
      },
    });
  }

  private createCheatsPanel(): void {
    const panelX = 6;
    const panelY = this.height - 44;
    const btnW = 70;
    const btnH = 28;
    const gap = 4;

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.6);
    bg.fillRoundedRect(panelX - 4, panelY - 4, (btnW + gap) * 3 + gap + 4, btnH + 8, 6);
    bg.setDepth(400);

    const makeBtn = (x: number, label: string, color: number, onClick: () => void) => {
      const btn = this.add.graphics();
      btn.fillStyle(color, 0.9);
      btn.fillRoundedRect(0, 0, btnW, btnH, 4);
      btn.setPosition(x, panelY);
      btn.setDepth(401);
      btn.setInteractive(new Phaser.Geom.Rectangle(0, 0, btnW, btnH), Phaser.Geom.Rectangle.Contains);
      btn.on('pointerdown', onClick);

      const txt = this.add.text(x + btnW / 2, panelY + btnH / 2, label, {
        fontFamily: FONTS.body,
        fontSize: '11px',
        color: '#ffffff',
      }).setOrigin(0.5).setDepth(402);

      return { btn, txt };
    };

    let x = panelX;
    makeBtn(x, 'Win', 0x22c55e, () => {
      this.gm.cheatWin();
    });
    x += btnW + gap;
    makeBtn(x, 'Lose', 0xc4433a, () => {
      this.gm.cheatLose();
    });
    x += btnW + gap;
    makeBtn(x, 'Reroll', 0x3b82f6, () => {
      this.gm.cheatRerollHand();
    });
    x += btnW + gap;
    makeBtn(x, 'Discard+', 0x9333ea, () => {
      this.showCheatCardSelector();
    });
  }

  // ═══════════════════════════════════════════════════════
  //  CHEAT: CARD SELECTOR FOR DISCARD
  // ═══════════════════════════════════════════════════════

  private cheatSelectorGroup: Phaser.GameObjects.Container | null = null;

  private showCheatCardSelector(): void {
    if (this.cheatSelectorGroup) { this.cheatSelectorGroup.destroy(); this.cheatSelectorGroup = null; }
    if (!this.gm.state.river) return;

    const allCards = CARD_DEFS;
    const w = this.width;
    const h = this.height;

    const group = this.add.container(0, 0).setDepth(600);
    this.cheatSelectorGroup = group;

    // Blocking overlay
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setInteractive();
    overlay.on('pointerdown', () => { group.destroy(); this.cheatSelectorGroup = null; });
    group.add(overlay);

    // Title
    const title = this.add.text(w / 2, 20, 'Select card to add to discard', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#ffffff',
      resolution: 2,
    }).setOrigin(0.5, 0);
    group.add(title);

    // Card grid — show all game cards as small cards
    // Larger cards — aim for ~5 cols with scroll
    const targetCols = Math.max(4, Math.min(7, Math.floor(w / 140)));
    const gap = 8;
    const cardScale = Math.min(0.55, (w - 40 - (targetCols - 1) * gap) / (targetCols * CARD.WIDTH));
    const cardW = CARD.WIDTH * cardScale;
    const cardH = CARD.HEIGHT * cardScale;
    const cols = Math.floor((w - 20) / (cardW + gap));
    const startY = 52;
    const startX = (w - cols * (cardW + gap) + gap) / 2 + cardW / 2;

    // Scroll container
    const scrollContainer = this.add.container(0, 0);
    group.add(scrollContainer);

    const cardObjects: CardObject[] = [];
    const hoverPreviewGroup = this.add.container(0, 0).setDepth(700);
    group.add(hoverPreviewGroup);

    for (let i = 0; i < allCards.length; i++) {
      const def = allCards[i];
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * (cardW + gap);
      const cy = startY + row * (cardH + gap) + cardH / 2;

      // Create a fake CardInstance to resolve
      const inst: import('../../types/card.ts').CardInstance = {
        instanceId: `cheat_sel_${i}`,
        defId: def.id,
        modifiers: [],
      };
      const resolved = resolveCard(inst);
      const card = CardFactory.create(this, resolved, cx, cy, cardScale);
      card.setInteractive(
        new Phaser.Geom.Rectangle(
          -CARD.WIDTH / 2, -CARD.HEIGHT / 2, CARD.WIDTH, CARD.HEIGHT
        ),
        Phaser.Geom.Rectangle.Contains
      );

      // Check if card is in pool/deck/rival
      const inDeck = this.gm.state.river!.deck.some(c => c.defId === def.id);
      const inRival = this.gm.state.rivalHand.some(c => c.defId === def.id);
      const inRiver = this.gm.state.river!.cards.some(c => c.defId === def.id);
      const inHand = this.gm.state.hand.cards.some(c => c.defId === def.id);

      // Dim cards already in hand or river
      if (inHand || inRiver) {
        card.setAlpha(0.4);
      }

      // Source indicator
      let sourceLabel = '';
      if (inDeck) sourceLabel = '📦';
      else if (inRival) sourceLabel = '👁';
      else if (!inHand && !inRiver) sourceLabel = '✨';

      if (sourceLabel) {
        const badge = this.add.text(cx + cardW / 2 - 4, cy - cardH / 2 + 2, sourceLabel, {
          fontSize: `${Math.max(12, Math.round(14 * cardScale))}px`,
          resolution: 2,
        }).setOrigin(1, 0);
        scrollContainer.add(badge);
      }

      // Hover preview
      card.on('pointerover', () => {
        hoverPreviewGroup.removeAll(true);
        const previewScale = this.scales.hand * 1.5;
        const previewCard = CardFactory.create(this, resolved, w / 2, h / 2, previewScale);
        hoverPreviewGroup.add(previewCard);

        // Shadow
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillRoundedRect(
          w / 2 - CARD.WIDTH * previewScale / 2 + 4,
          h / 2 - CARD.HEIGHT * previewScale / 2 + 4,
          CARD.WIDTH * previewScale,
          CARD.HEIGHT * previewScale,
          8
        );
        shadow.setDepth(-1);
        hoverPreviewGroup.add(shadow);
        hoverPreviewGroup.sendToBack(shadow);
      });
      card.on('pointerout', () => {
        hoverPreviewGroup.removeAll(true);
      });

      // Click to add to discard
      card.on('pointerdown', (p: Phaser.Input.Pointer) => {
        p.event.stopPropagation();
        this.cheatAddToDiscard(def.id);
        group.destroy();
        this.cheatSelectorGroup = null;
      });

      scrollContainer.add(card);
      cardObjects.push(card);
    }

    // Scroll support
    const maxRows = Math.ceil(allCards.length / cols);
    const totalH = maxRows * (cardH + gap) + startY + 20;
    if (totalH > h) {
      this.input.on('wheel', (_pointer: Phaser.Input.Pointer, _gos: any, _dx: number, dy: number) => {
        if (!this.cheatSelectorGroup) return;
        const newY = Phaser.Math.Clamp(scrollContainer.y - dy * 0.5, -(totalH - h), 0);
        scrollContainer.y = newY;
      });
    }
  }

  private cheatAddToDiscard(defId: string): void {
    if (!this.gm.state.river) return;
    const state = this.gm.state;

    // Try to find in deck first
    const deckIdx = state.river!.deck.findIndex(c => c.defId === defId);
    if (deckIdx >= 0) {
      const card = state.river!.deck[deckIdx];
      const newDeck = [...state.river!.deck];
      newDeck.splice(deckIdx, 1);
      this.gm.state = {
        ...state,
        river: { cards: [...state.river!.cards, card], deck: newDeck },
      };
      this.gm.events.emit('stateChanged', this.gm.state);
      return;
    }

    // Try to find in rival hand
    const rivalIdx = state.rivalHand.findIndex(c => c.defId === defId);
    if (rivalIdx >= 0) {
      const card = state.rivalHand[rivalIdx];
      const newRival = [...state.rivalHand];
      newRival.splice(rivalIdx, 1);
      this.gm.state = {
        ...state,
        rivalHand: newRival,
        river: { cards: [...state.river!.cards, card], deck: state.river!.deck },
      };
      this.gm.events.emit('stateChanged', this.gm.state);
      return;
    }

    // Not in pool — create a new instance
    const newCard: import('../../types/card.ts').CardInstance = {
      instanceId: `cheat_discard_${Date.now()}`,
      defId,
      modifiers: [],
    };
    this.gm.state = {
      ...state,
      river: { cards: [...state.river!.cards, newCard], deck: state.river!.deck },
    };
    this.gm.events.emit('stateChanged', this.gm.state);
  }

  // ═══════════════════════════════════════════════════════
  //  ON-END EFFECT POPUP
  // ═══════════════════════════════════════════════════════

  private onEndPopupGroup: Phaser.GameObjects.Container | null = null;

  private showOnEndPickPopup(): void {
    // Clean up previous popup and hover state
    if (this.onEndPopupGroup) { this.onEndPopupGroup.destroy(); this.onEndPopupGroup = null; }
    this.clearHoverShadow();
    this.clearKeywordTooltips();
    this.hoveredRiverIndex = -1;

    const choice = this.gm.state.pendingChoice!;
    const riverCards = choice.options as import('../../types/card.ts').CardInstance[];
    if (riverCards.length === 0) { this.gm.resolveOnEndChoice([]); return; }

    const w = this.width;
    const h = this.height;
    const group = this.add.container(0, 0).setDepth(500);
    this.onEndPopupGroup = group;

    // Dark overlay
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setInteractive();
    group.add(overlay);

    // Panel background
    const panelW = Math.min(w - 40, 800);
    const panelH = Math.min(h - 60, 600);
    const panelX = w / 2;
    const panelY = h / 2;
    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0xfdf6e3, 1).setStrokeStyle(3, 0x8b6914);
    panel.setOrigin(0.5);
    group.add(panel);

    // Source card indicator (e.g. "Necromancer — On End")
    const sourceName = choice.sourceCardName || 'Unknown';
    const sourceLabel = this.add.text(panelX, panelY - panelH / 2 + 20, `☠ ${sourceName} — On End`, {
      fontFamily: FONTS.body,
      fontSize: '18px',
      color: '#6b3a6b',
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0.5, 0);
    group.add(sourceLabel);

    // Prompt text
    const promptText = this.add.text(panelX, panelY - panelH / 2 + 50, choice.prompt, {
      fontFamily: FONTS.body,
      fontSize: '15px',
      color: '#333',
      resolution: 2,
    }).setOrigin(0.5, 0);
    group.add(promptText);

    // Card grid
    const cardScale = 0.7;
    const cardSpacing = CARD.WIDTH * cardScale + 10;
    const maxCols = Math.max(1, Math.floor((panelW - 40) / cardSpacing));
    const gridStartY = panelY - panelH / 2 + 90;
    const gridStartX = panelX - (Math.min(riverCards.length, maxCols) * cardSpacing - 10) / 2 + (CARD.WIDTH * cardScale) / 2;

    let selectedIndex = -1;
    const cardObjects: Phaser.GameObjects.Container[] = [];
    const highlights: Phaser.GameObjects.Rectangle[] = [];

    for (let i = 0; i < riverCards.length; i++) {
      const col = i % maxCols;
      const row = Math.floor(i / maxCols);
      const cx = gridStartX + col * cardSpacing;
      const cy = gridStartY + row * (CARD.HEIGHT * cardScale + 10) + (CARD.HEIGHT * cardScale) / 2;

      const resolved = resolveCard(riverCards[i]);
      const cardObj = CardFactory.create(this, resolved, cx, cy, cardScale);
      cardObj.setDepth(501);

      // Selection highlight (hidden initially)
      const hl = this.add.rectangle(cx, cy, CARD.WIDTH * cardScale + 6, CARD.HEIGHT * cardScale + 6, 0x22c55e, 0.4)
        .setStrokeStyle(3, 0x22c55e)
        .setVisible(false)
        .setDepth(500);
      highlights.push(hl);

      // Make card interactive
      cardObj.setSize(CARD.WIDTH * cardScale, CARD.HEIGHT * cardScale);
      cardObj.setInteractive({ useHandCursor: true });
      const idx = i;
      const resolvedCopy = resolved; // capture for hover

      cardObj.on('pointerdown', () => {
        // Deselect previous
        if (selectedIndex >= 0) highlights[selectedIndex].setVisible(false);
        selectedIndex = idx;
        highlights[idx].setVisible(true);
        confirmBtn.setAlpha(1);
        confirmBg.setInteractive({ useHandCursor: true });
      });

      cardObj.on('pointerover', () => {
        if (hoverPreview) { hoverPreview.destroy(); hoverPreview = null; }
        const previewScale = this.scales.hand * 1.5;
        const previewW = CARD.WIDTH * previewScale;
        const previewH = CARD.HEIGHT * previewScale;
        // Position preview to the right of the card, or left if it would overflow
        let px = cx + (CARD.WIDTH * cardScale) / 2 + previewW / 2 + 12;
        if (px + previewW / 2 > panelX + panelW / 2 - 10) {
          px = cx - (CARD.WIDTH * cardScale) / 2 - previewW / 2 - 12;
        }
        let py = Phaser.Math.Clamp(cy, panelY - panelH / 2 + previewH / 2 + 10, panelY + panelH / 2 - previewH / 2 - 10);
        hoverPreview = new CardObject(this, px, py, resolvedCopy);
        hoverPreview.setScale(previewScale);
        hoverPreview.setDepth(600);
      });

      cardObj.on('pointerout', () => {
        if (hoverPreview) { hoverPreview.destroy(); hoverPreview = null; }
      });

      group.add(hl);
      group.add(cardObj);
      cardObjects.push(cardObj);
    }

    // Hover preview card (managed outside the group so it renders on top)
    let hoverPreview: CardObject | null = null;

    // Confirm button (disabled until selection)
    const btnY = panelY + panelH / 2 - 40;
    const confirmBg = this.add.rectangle(panelX, btnY, 200, 44, 0x22c55e, 1).setOrigin(0.5);
    confirmBg.setStrokeStyle(2, 0x1a9e48);
    const confirmLabel = this.add.text(panelX, btnY, 'Confirm', {
      fontFamily: FONTS.display,
      fontSize: '20px',
      color: '#fff',
      resolution: 2,
    }).setOrigin(0.5);
    const confirmBtn = this.add.container(0, 0, [confirmBg, confirmLabel]).setAlpha(0.4);

    confirmBg.on('pointerdown', () => {
      if (selectedIndex < 0) return;
      // Clean up hover preview
      if (hoverPreview) { hoverPreview.destroy(); hoverPreview = null; }
      // Clean up popup
      group.destroy();
      this.onEndPopupGroup = null;
      // Resolve the choice
      this.gm.resolveOnEndChoice([selectedIndex]);
    });

    group.add(confirmBtn);
  }

  // ═══════════════════════════════════════════════════════
  //  RIVAL HAND PICK POPUP (Hedge Witch)
  // ═══════════════════════════════════════════════════════

  private showRivalHandPickPopup(): void {
    if (this.onEndPopupGroup) { this.onEndPopupGroup.destroy(); this.onEndPopupGroup = null; }
    // Clear any lingering hover state and reset river cards to normal
    this.clearHoverShadow();
    this.clearKeywordTooltips();
    this.hoveredRiverIndex = -1;
    this.clearRivalMarkers();
    // Reset all river card scales
    for (const c of this.riverCards) { this.tweens.killTweensOf(c); c.setScale(this.scales.river); c.setDepth(10); }

    const choice = this.gm.state.pendingChoice!;
    const rivalCards = this.gm.state.rivalHand;
    if (rivalCards.length === 0) { this.gm.resolveRivalHandPick(''); return; }

    const w = this.width;
    const h = this.height;
    const group = this.add.container(0, 0).setDepth(500);
    this.onEndPopupGroup = group;

    // Dark overlay
    const overlay = this.add.rectangle(w / 2, h / 2, w, h, 0x000000, 0.7).setInteractive();
    group.add(overlay);

    // Panel
    const panelW = Math.min(w - 40, 800);
    const panelH = Math.min(h - 60, 600);
    const panelX = w / 2;
    const panelY = h / 2;
    const panel = this.add.rectangle(panelX, panelY, panelW, panelH, 0xfdf6e3, 1).setStrokeStyle(3, 0x6b3a6b);
    panel.setOrigin(0.5);
    group.add(panel);

    // Source card indicator
    const sourceName = choice.sourceCardName || 'Hedge Witch';
    const sourceLabel = this.add.text(panelX, panelY - panelH / 2 + 20, `🔮 ${sourceName} — On Discard`, {
      fontFamily: FONTS.body,
      fontSize: '18px',
      color: '#6b3a6b',
      fontStyle: 'bold',
      resolution: 2,
    }).setOrigin(0.5, 0);
    group.add(sourceLabel);

    // Prompt
    const promptText = this.add.text(panelX, panelY - panelH / 2 + 50, choice.prompt, {
      fontFamily: FONTS.body,
      fontSize: '15px',
      color: '#333',
      resolution: 2,
    }).setOrigin(0.5, 0);
    group.add(promptText);

    // Card grid
    const cardScale = 0.7;
    const cardSpacing = CARD.WIDTH * cardScale + 10;
    const maxCols = Math.max(1, Math.floor((panelW - 40) / cardSpacing));
    const gridStartY = panelY - panelH / 2 + 90;
    const gridStartX = panelX - (Math.min(rivalCards.length, maxCols) * cardSpacing - 10) / 2 + (CARD.WIDTH * cardScale) / 2;

    let selectedInstanceId = '';
    const highlights: Phaser.GameObjects.Rectangle[] = [];
    let hoverPreview: CardObject | null = null;

    for (let i = 0; i < rivalCards.length; i++) {
      const col = i % maxCols;
      const row = Math.floor(i / maxCols);
      const cx = gridStartX + col * cardSpacing;
      const cy = gridStartY + row * (CARD.HEIGHT * cardScale + 10) + (CARD.HEIGHT * cardScale) / 2;

      const resolved = resolveCard(rivalCards[i]);
      const cardObj = CardFactory.create(this, resolved, cx, cy, cardScale);
      cardObj.setDepth(501);

      // Highlight
      const hl = this.add.rectangle(cx, cy, CARD.WIDTH * cardScale + 6, CARD.HEIGHT * cardScale + 6, 0xc4433a, 0.4)
        .setStrokeStyle(3, 0xc4433a)
        .setVisible(false)
        .setDepth(500);
      highlights.push(hl);

      // Make interactive
      cardObj.setSize(CARD.WIDTH * cardScale, CARD.HEIGHT * cardScale);
      cardObj.setInteractive({ useHandCursor: true });
      const instId = rivalCards[i].instanceId;
      const resolvedCopy = resolved;
      const idx = i;

      cardObj.on('pointerdown', () => {
        highlights.forEach(h => h.setVisible(false));
        selectedInstanceId = instId;
        highlights[idx].setVisible(true);
        confirmBtn.setAlpha(1);
        confirmBg.setInteractive({ useHandCursor: true });
      });

      cardObj.on('pointerover', () => {
        if (hoverPreview) { hoverPreview.destroy(); hoverPreview = null; }
        const previewScale = this.scales.hand * 1.5;
        const previewW = CARD.WIDTH * previewScale;
        let px = cx + (CARD.WIDTH * cardScale) / 2 + previewW / 2 + 12;
        if (px + previewW / 2 > panelX + panelW / 2 - 10) {
          px = cx - (CARD.WIDTH * cardScale) / 2 - previewW / 2 - 12;
        }
        const previewH = CARD.HEIGHT * previewScale;
        const py = Phaser.Math.Clamp(cy, panelY - panelH / 2 + previewH / 2 + 10, panelY + panelH / 2 - previewH / 2 - 10);
        hoverPreview = new CardObject(this, px, py, resolvedCopy);
        hoverPreview.setScale(previewScale);
        hoverPreview.setDepth(600);
      });

      cardObj.on('pointerout', () => {
        if (hoverPreview) { hoverPreview.destroy(); hoverPreview = null; }
      });

      group.add(hl);
      group.add(cardObj);
    }

    // Confirm button
    const btnY = panelY + panelH / 2 - 40;
    const confirmBg = this.add.rectangle(panelX, btnY, 200, 44, 0xc4433a, 1).setOrigin(0.5);
    confirmBg.setStrokeStyle(2, 0x9a2f2f);
    const confirmLabel = this.add.text(panelX, btnY, 'Discard to River', {
      fontFamily: FONTS.display,
      fontSize: '18px',
      color: '#fff',
      resolution: 2,
    }).setOrigin(0.5);
    const confirmBtn = this.add.container(0, 0, [confirmBg, confirmLabel]).setAlpha(0.4);

    confirmBg.on('pointerdown', () => {
      if (!selectedInstanceId) return;
      if (hoverPreview) { hoverPreview.destroy(); hoverPreview = null; }
      group.destroy();
      this.onEndPopupGroup = null;
      this.gm.resolveRivalHandPick(selectedInstanceId);
    });

    group.add(confirmBtn);
  }

  // ═══════════════════════════════════════════════════════
  //  CLEANUP
  // ═══════════════════════════════════════════════════════

  private cleanup(): void {
    this.gm.events.off('stateChanged', this.boundOnStateChanged);
    this.gm.events.off('handChanged', this.boundOnHandChanged);

    // Remove pointer handlers
    this.input.off('pointerdown');
    this.input.off('pointermove');
    this.input.off('pointerup');
  }
}
