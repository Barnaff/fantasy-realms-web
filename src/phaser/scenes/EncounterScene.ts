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

  // --- River hover state ---
  private hoveredRiverIndex = -1;
  private riverPositions: { x: number; y: number }[] = [];

  // --- Relationship arrows ---
  private arrowGraphics!: Phaser.GameObjects.Graphics;

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

    // Cleanup on scene shutdown
    this.events.on('shutdown', this.cleanup, this);

    // Show tutorial on first encounter
    const isFirstEncounter = (this.gm.state.run?.encountersCleared ?? 0) === 0;
    if (isFirstEncounter && TutorialOverlay.shouldShow()) {
      new TutorialOverlay(this, () => {
        // Tutorial dismissed — game continues
      });
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
  }

  // ═══════════════════════════════════════════════════════
  //  RIVER ZONE
  // ═══════════════════════════════════════════════════════

  private createRiverZone(): void {
    // River label
    this.riverLabel = this.add.text(10, this.riverStartY, '', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#6b5c4e',
    });

    // Deck pile (no Phaser interactive — taps handled at scene level)
    const deckX = 10 + CARD.WIDTH * this.scales.river / 2 + 4;
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

    // Clear old river cards
    this.hoveredRiverIndex = -1;
    for (const c of this.riverCards) { this.tweens.killTweensOf(c); c.destroy(); }
    this.riverCards = [];
    this.riverPositions = [];

    if (riverCards.length === 0) return;

    // Grid layout: start after deck pile
    const deckRight = 10 + CARD.WIDTH * this.scales.river + 16;
    const gridY = this.riverStartY + 18;
    const maxCols = Math.max(1, Math.floor((this.width - deckRight - 10) / (CARD.WIDTH * this.scales.river + 6)));
    const positions = LayoutHelper.gridLayout(
      riverCards.length,
      deckRight,
      gridY,
      this.scales.river,
      maxCols,
      6,
    );
    this.riverPositions = positions;

    for (let i = 0; i < riverCards.length; i++) {
      const resolved = resolveCard(riverCards[i]);
      const pos = positions[i];
      const card = CardFactory.create(this, resolved, pos.x, pos.y, this.scales.river);

      if (isDraw) {
        card.setGlowing(true, 'green');
      }

      // No Phaser interactive — taps handled at scene level
      card.setData('riverIndex', i);

      this.riverCards.push(card);
    }
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

    // Hover new — scale to match hand hover size
    if (newIndex >= 0 && newIndex < this.riverCards.length) {
      const card = this.riverCards[newIndex];
      const pos = this.riverPositions[newIndex];
      // Target the same absolute scale as hand hover (hand * 1.5)
      const targetScale = this.scales.hand * 1.5;
      this.tweens.killTweensOf(card);
      this.tweens.add({
        targets: card,
        y: pos.y - 20,
        scaleX: targetScale, scaleY: targetScale,
        duration: 150, ease: 'Back.easeOut',
      });
      card.setDepth(100);
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
    this.scoreText = this.add.text(14, this.scorePanelY, 'Score: 0', {
      fontFamily: FONTS.display,
      fontSize: '14px',
      color: '#2c1810',
    });

    this.finalizeBtn = new ButtonObject(this, this.width - 90, this.scorePanelY + 10, 'Finalize', {
      width: 120,
      height: 32,
      fontSize: '13px',
      color: COLORS.tag.Leader,
      onClick: () => this.onFinalize(),
    });

    // View Deck button
    const deckLabel = this.add.text(this.width - 14, this.scorePanelY + 36, '📋 Deck', {
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
      const colW = Math.min(160, (this.width - 20) / cols);

      for (let i = 0; i < result.breakdown.length; i++) {
        const entry = result.breakdown[i];
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = 14 + col * colW;
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

  private onFinalize(): void {
    this.gm.finalizeHand();
    this.scene.start('ScoringScene');
  }

  // ═══════════════════════════════════════════════════════
  //  HAND ZONE — scene-level pointer tracking for hover
  // ═══════════════════════════════════════════════════════

  private createHandZone(): void {
    const handY = this.handBottomY - CARD.HEIGHT * this.scales.hand - 30;
    this.handLabel = this.add.text(10, handY, '', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#6b5c4e',
    });

    // ── All pointer handling at scene level (no Phaser drag system) ──

    let pointerDownIdx = -1;
    const DRAG_THRESHOLD = 8; // px before we start dragging

    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
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
        this.onDeckTap();
        return;
      }

      // Check river card tap
      const riverIdx = this.getRiverCardAtPointer(pointer.x, pointer.y);
      if (riverIdx >= 0) {
        this.onRiverCardTap(riverIdx);
        return;
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
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

    // Get live score to know which cards are blanked
    const liveScore = this.gm.getLiveScore();
    const blankedCardIds = new Set<string>();
    if (liveScore) {
      for (const entry of liveScore.breakdown) {
        if (entry.blanked) blankedCardIds.add(entry.cardId);
      }
    }

    for (let i = 0; i < handCards.length; i++) {
      const resolved = resolveCard(handCards[i]);
      const pos = this.handPositions[i];
      const card = CardFactory.create(this, resolved, pos.x, pos.y, this.scales.hand);
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

    const oldIndex = this.hoveredHandIndex;
    this.hoveredHandIndex = newIndex;

    // Un-hover old card
    if (oldIndex >= 0 && oldIndex < this.handCards.length) {
      const card = this.handCards[oldIndex];
      const pos = this.handPositions[oldIndex];
      this.tweens.killTweensOf(card);
      this.tweens.add({
        targets: card,
        x: pos.x,
        y: pos.y,
        rotation: pos.rotation,
        scaleX: this.scales.hand,
        scaleY: this.scales.hand,
        duration: 120,
        ease: 'Quad.easeOut',
      });
      card.setDepth(oldIndex);
    }

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
      card.setDepth(100);
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
    this.refreshHeader();
    this.refreshRiver();
    this.refreshScorePanel();
  }

  private onHandChanged(): void {
    // Check for scoring transition after discard
    if (this.gm.state.phase === 'scoring') {
      this.scene.start('ScoringScene');
      return;
    }
    this.refreshHand();
    this.refreshScorePanel();
    // Also refresh river since draw removes a card from it
    this.refreshRiver();
    this.refreshHeader();
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
