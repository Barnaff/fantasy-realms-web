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
  private riverCards: CardObject[] = [];

  // --- Score panel ---
  private scoreText!: Phaser.GameObjects.Text;
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

  // --- Drag state ---
  private dragStartX = 0;
  private dragStartY = 0;
  private dragCardIndex = -1;

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

    // Initial render
    this.refreshAll();

    // Listen to GameManager events
    this.boundOnStateChanged = (_s: GameState) => this.onStateChanged();
    this.boundOnHandChanged = (_s: GameState) => this.onHandChanged();
    this.gm.events.on('stateChanged', this.boundOnStateChanged);
    this.gm.events.on('handChanged', this.boundOnHandChanged);

    // Cleanup on scene shutdown
    this.events.on('shutdown', this.cleanup, this);
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

    // Deck pile
    const deckX = 10 + CARD.WIDTH * this.scales.river / 2 + 4;
    const deckY = this.riverStartY + 18 + CARD.HEIGHT * this.scales.river / 2;
    const deckCount = this.gm.state.river?.deck.length ?? 0;
    this.deckPile = new DeckPileObject(this, deckX, deckY, deckCount, this.scales.river);

    // Make deck interactive
    this.deckPile.setSize(CARD.WIDTH * this.scales.river, CARD.HEIGHT * this.scales.river);
    this.deckPile.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(
        -CARD.WIDTH / 2,
        -CARD.HEIGHT / 2,
        CARD.WIDTH,
        CARD.HEIGHT,
      ),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.deckPile.on('pointerdown', () => this.onDeckTap());
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
    for (const c of this.riverCards) c.destroy();
    this.riverCards = [];

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

    for (let i = 0; i < riverCards.length; i++) {
      const resolved = resolveCard(riverCards[i]);
      const pos = positions[i];
      const card = CardFactory.create(this, resolved, pos.x, pos.y, this.scales.river);

      if (isDraw) {
        card.setGlowing(true, 'green');
      }

      // Make river card interactive
      card.setSize(CARD.WIDTH, CARD.HEIGHT);
      card.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-CARD.WIDTH / 2, -CARD.HEIGHT / 2, CARD.WIDTH, CARD.HEIGHT),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });

      const riverIndex = i;
      card.on('pointerdown', () => this.onRiverCardTap(riverIndex));

      this.riverCards.push(card);
    }
  }

  private onDeckTap(): void {
    const state = this.gm.state;
    if (state.phase !== 'player_turn' || state.turnPhase !== 'draw') return;
    if (!state.river || state.river.deck.length === 0) return;

    this.gm.drawFromDeckAction();
  }

  private onRiverCardTap(riverIndex: number): void {
    const state = this.gm.state;
    if (state.phase !== 'player_turn' || state.turnPhase !== 'draw') return;

    // Animate card flying to hand area
    const card = this.riverCards[riverIndex];
    if (card) {
      this.tweens.add({
        targets: card,
        x: this.width / 2,
        y: this.handBottomY - CARD.HEIGHT * this.scales.hand / 2,
        scaleX: this.scales.hand,
        scaleY: this.scales.hand,
        alpha: 0.5,
        duration: DURATION.cardDraw,
        ease: 'Quad.easeIn',
      });
    }

    this.gm.drawCard(riverIndex);
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
  }

  private refreshScorePanel(): void {
    const result = this.gm.getLiveScore();
    const score = result?.totalScore ?? 0;
    this.scoreText.setText(`Score: ${score}`);

    // Only allow finalize when there are cards in hand
    const hasCards = this.gm.state.hand.cards.length > 0;
    this.finalizeBtn.setEnabled(hasCards);
  }

  private onFinalize(): void {
    this.gm.finalizeHand();
    this.scene.start('ScoringScene');
  }

  // ═══════════════════════════════════════════════════════
  //  HAND ZONE
  // ═══════════════════════════════════════════════════════

  private createHandZone(): void {
    const handY = this.handBottomY - CARD.HEIGHT * this.scales.hand - 30;
    this.handLabel = this.add.text(10, handY, '', {
      fontFamily: FONTS.body,
      fontSize: '10px',
      color: '#6b5c4e',
    });
  }

  private refreshHand(): void {
    // Clear old hand cards
    for (const c of this.handCards) c.destroy();
    this.handCards = [];

    const handCards = this.gm.state.hand.cards;
    if (handCards.length === 0) {
      this.handLabel.setText('HAND (0)');
      return;
    }

    this.handLabel.setText(`HAND (${handCards.length})`);

    const cx = this.width / 2;
    const positions = LayoutHelper.fanLayout(
      handCards.length,
      cx,
      this.handBottomY - CARD.HEIGHT * this.scales.hand / 2 - 10,
      this.scales.hand,
    );

    for (let i = 0; i < handCards.length; i++) {
      const resolved = resolveCard(handCards[i]);
      const pos = positions[i];
      const card = CardFactory.create(this, resolved, pos.x, pos.y, this.scales.hand);
      card.setRotation(pos.rotation);
      card.setDepth(i);

      // Make card draggable
      card.setSize(CARD.WIDTH, CARD.HEIGHT);
      card.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(-CARD.WIDTH / 2, -CARD.HEIGHT / 2, CARD.WIDTH, CARD.HEIGHT),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
        draggable: true,
      });

      // Store hand index as data
      card.setData('handIndex', i);
      card.setData('originX', pos.x);
      card.setData('originY', pos.y);
      card.setData('originRotation', pos.rotation);

      this.input.setDraggable(card);

      // Desktop hover: enlarge on pointerover
      card.on('pointerover', () => {
        if (card.getData('isDragging')) return;
        this.tweens.add({
          targets: card,
          scaleX: this.scales.hand * 1.3,
          scaleY: this.scales.hand * 1.3,
          y: pos.y - 25,
          rotation: 0,
          duration: DURATION.hoverEnlarge,
          ease: 'Back.easeOut',
        });
        card.setDepth(100);
      });

      card.on('pointerout', () => {
        if (card.getData('isDragging')) return;
        this.tweens.add({
          targets: card,
          scaleX: this.scales.hand,
          scaleY: this.scales.hand,
          y: pos.y,
          rotation: pos.rotation,
          duration: DURATION.hoverEnlarge,
          ease: 'Back.easeOut',
        });
        card.setDepth(i);
      });

      this.handCards.push(card);
    }

    // Set up drag handlers on the scene input (idempotent; Phaser handles it)
    this.setupDragHandlers();
  }

  private dragHandlersSet = false;

  private setupDragHandlers(): void {
    if (this.dragHandlersSet) return;
    this.dragHandlersSet = true;

    this.input.on('dragstart', (_pointer: Phaser.Input.Pointer, gameObject: CardObject) => {
      this.dragStartX = gameObject.x;
      this.dragStartY = gameObject.y;
      this.dragCardIndex = gameObject.getData('handIndex') as number;
      gameObject.setData('isDragging', true);
      gameObject.setDepth(200);
    });

    this.input.on('drag', (_pointer: Phaser.Input.Pointer, gameObject: CardObject, dragX: number, dragY: number) => {
      gameObject.x = dragX;
      gameObject.y = dragY;
      gameObject.setRotation(0);
    });

    this.input.on('dragend', (_pointer: Phaser.Input.Pointer, gameObject: CardObject) => {
      gameObject.setData('isDragging', false);
      const dy = this.dragStartY - gameObject.y; // positive = dragged UP
      const dx = gameObject.x - this.dragStartX;
      const handIndex = this.dragCardIndex;

      // Discard: drag UP past threshold during discard phase
      const discardThreshold = CARD.HEIGHT * this.scales.hand * 0.8;
      if (
        dy > discardThreshold &&
        this.gm.state.turnPhase === 'discard' &&
        this.gm.state.phase === 'player_turn'
      ) {
        // Animate card flying to river area
        this.tweens.add({
          targets: gameObject,
          y: this.riverStartY + 50,
          alpha: 0,
          duration: DURATION.cardDiscard,
          ease: 'Quad.easeIn',
          onComplete: () => {
            this.gm.discardCard(handIndex);
          },
        });
        return;
      }

      // Reorder: horizontal drag past card width
      const reorderThreshold = CARD.WIDTH * this.scales.hand * 0.5;
      if (Math.abs(dx) > reorderThreshold) {
        // Calculate target slot
        const positions = LayoutHelper.fanLayout(
          this.gm.state.hand.cards.length,
          this.width / 2,
          this.handBottomY - CARD.HEIGHT * this.scales.hand / 2 - 10,
          this.scales.hand,
        );
        let targetIndex = handIndex;
        let minDist = Infinity;
        for (let i = 0; i < positions.length; i++) {
          const dist = Math.abs(gameObject.x - positions[i].x);
          if (dist < minDist) {
            minDist = dist;
            targetIndex = i;
          }
        }
        if (targetIndex !== handIndex) {
          this.gm.reorderHand(handIndex, targetIndex);
          return;
        }
      }

      // Snap back to original position
      const originX = gameObject.getData('originX') as number;
      const originY = gameObject.getData('originY') as number;
      const originRot = gameObject.getData('originRotation') as number;
      const idx = gameObject.getData('handIndex') as number;

      this.tweens.add({
        targets: gameObject,
        x: originX,
        y: originY,
        rotation: originRot,
        scaleX: this.scales.hand,
        scaleY: this.scales.hand,
        duration: DURATION.springIn,
        ease: 'Back.easeOut',
        onComplete: () => {
          gameObject.setDepth(idx);
        },
      });
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

    // Remove drag handlers
    this.input.off('dragstart');
    this.input.off('drag');
    this.input.off('dragend');
    this.dragHandlersSet = false;
  }
}
