import Phaser from 'phaser';
import { FONTS, COLORS } from '../../config.ts';
import { ButtonObject } from './ButtonObject.ts';

const STORAGE_KEY = 'fr_tutorial_dismissed';

interface TutorialSlide {
  title: string;
  lines: string[];
  icon: string;
}

const SLIDES: TutorialSlide[] = [
  {
    title: 'Welcome!',
    icon: '🃏',
    lines: [
      'Build the strongest 7-card hand',
      'by combining synergistic cards',
      'while avoiding penalties.',
    ],
  },
  {
    title: 'Drawing Cards',
    icon: '📥',
    lines: [
      'Each turn, draw a card from the',
      'deck or the face-up river.',
      '',
      'Tap the deck for a random card,',
      'or tap a river card to take it.',
    ],
  },
  {
    title: 'Discarding Cards',
    icon: '📤',
    lines: [
      'After drawing, you must discard',
      'one card from your hand.',
      '',
      'Drag a hand card upward into',
      'the river area to discard it.',
    ],
  },
  {
    title: 'Card Synergies',
    icon: '✨',
    lines: [
      'Cards give bonuses based on other',
      'cards in your hand.',
      '',
      'Green arrows show bonuses,',
      'red arrows show penalties.',
      'Hover a card to see its relations.',
    ],
  },
  {
    title: 'Blanking',
    icon: '🚫',
    lines: [
      'Some powerful cards can BLANK',
      'other cards, reducing them to 0.',
      '',
      'Watch for blanking effects —',
      'they can devastate your score!',
    ],
  },
  {
    title: 'Level Modifiers',
    icon: '🏔️',
    lines: [
      'Each encounter has tag modifiers',
      'that boost or penalize card types.',
      '',
      'Green pills = bonus per card',
      'Red pills = penalty per card',
      'Adapt your strategy accordingly!',
    ],
  },
  {
    title: 'Winning',
    icon: '🏆',
    lines: [
      'After 10 discards the level ends.',
      'Your hand is scored automatically.',
      '',
      'Meet the target score to advance.',
      'Fail and your run is over!',
      '',
      'Good luck, adventurer!',
    ],
  },
];

export class TutorialOverlay extends Phaser.GameObjects.Container {
  private currentSlide = 0;
  private slideContainer: Phaser.GameObjects.Container;
  private backBtn: ButtonObject;
  private nextBtn: ButtonObject;
  private dotsContainer: Phaser.GameObjects.Container;
  private dots: Phaser.GameObjects.Graphics[] = [];
  private dontShowCheck = false;
  private checkMark: Phaser.GameObjects.Text;
  private onComplete: () => void;

  constructor(scene: Phaser.Scene, onComplete: () => void) {
    super(scene, 0, 0);
    this.onComplete = onComplete;

    const { width, height } = scene.scale;

    // ── Dimmed backdrop ──
    const backdrop = scene.add.graphics();
    backdrop.fillStyle(0x000000, 0.6);
    backdrop.fillRect(0, 0, width, height);
    this.add(backdrop);

    // ── Card-like panel ──
    const panelW = Math.min(width - 40, 320);
    const panelH = Math.min(height - 80, 420);
    const px = width / 2;
    const py = height / 2;

    const panel = scene.add.graphics();
    panel.fillStyle(COLORS.parchment50, 1);
    panel.fillRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 16);
    panel.lineStyle(2, COLORS.parchment400, 1);
    panel.strokeRoundedRect(px - panelW / 2, py - panelH / 2, panelW, panelH, 16);
    this.add(panel);

    // ── Slide content container ──
    this.slideContainer = scene.add.container(px, py - panelH * 0.1);
    this.add(this.slideContainer);

    // ── Dots indicator ──
    this.dotsContainer = scene.add.container(px, py + panelH / 2 - 70);
    this.add(this.dotsContainer);
    this.createDots(scene);

    // ── Buttons ──
    const btnY = py + panelH / 2 - 36;
    const btnW = (panelW - 30) / 2;

    this.backBtn = new ButtonObject(scene, px - btnW / 2 - 5, btnY, 'Skip', {
      width: btnW,
      height: 36,
      color: COLORS.parchment600,
      fontSize: '13px',
      onClick: () => this.onBack(),
    });
    scene.children.remove(this.backBtn);
    this.add(this.backBtn);

    this.nextBtn = new ButtonObject(scene, px + btnW / 2 + 5, btnY, 'Next', {
      width: btnW,
      height: 36,
      color: COLORS.tag.Leader,
      fontSize: '13px',
      onClick: () => this.onNext(),
    });
    scene.children.remove(this.nextBtn);
    this.add(this.nextBtn);

    // ── Don't show again checkbox (only visible on last slide) ──
    const checkY = py + panelH / 2 - 90;

    const checkBox = scene.add.graphics();
    checkBox.lineStyle(2, COLORS.parchment500, 1);
    checkBox.strokeRect(px - 60, checkY - 7, 14, 14);
    this.add(checkBox);

    this.checkMark = scene.add.text(px - 60 + 2, checkY - 8, '✓', {
      fontSize: '13px',
      color: '#c9a227',
      resolution: 2,
    }).setAlpha(0);
    this.add(this.checkMark);

    const checkLabel = scene.add.text(px - 40, checkY, "Don't show again", {
      fontFamily: FONTS.body,
      fontSize: '11px',
      color: '#8a7a5a',
      resolution: 2,
    }).setOrigin(0, 0.5);
    this.add(checkLabel);

    // Make checkbox area tappable
    const checkZone = scene.add.zone(px - 10, checkY, 140, 24).setInteractive({ useHandCursor: true });
    scene.children.remove(checkZone);
    this.add(checkZone);
    checkZone.on('pointerdown', () => {
      this.dontShowCheck = !this.dontShowCheck;
      this.checkMark.setAlpha(this.dontShowCheck ? 1 : 0);
    });

    // Hide checkbox initially (only shown on last slide)
    checkBox.setAlpha(0);
    checkLabel.setAlpha(0);
    checkZone.disableInteractive();
    this.setData('checkBox', checkBox);
    this.setData('checkLabel', checkLabel);
    this.setData('checkZone', checkZone);

    // Show first slide
    this.showSlide(0);

    this.setDepth(1000);
    scene.add.existing(this);
  }

  static shouldShow(): boolean {
    try {
      return localStorage.getItem(STORAGE_KEY) !== 'true';
    } catch {
      return true;
    }
  }

  private createDots(scene: Phaser.Scene): void {
    const totalW = SLIDES.length * 14;
    for (let i = 0; i < SLIDES.length; i++) {
      const dot = scene.add.graphics();
      const dx = -totalW / 2 + i * 14 + 4;
      dot.fillStyle(i === 0 ? COLORS.tag.Leader : COLORS.parchment400, 1);
      dot.fillCircle(dx, 0, 4);
      scene.children.remove(dot);
      this.dotsContainer.add(dot);
      this.dots.push(dot);
    }
  }

  private updateDots(): void {
    for (let i = 0; i < this.dots.length; i++) {
      this.dots[i].clear();
      this.dots[i].fillStyle(i === this.currentSlide ? COLORS.tag.Leader : COLORS.parchment400, 1);
      const totalW = SLIDES.length * 14;
      this.dots[i].fillCircle(-totalW / 2 + i * 14 + 4, 0, 4);
    }
  }

  private showSlide(index: number): void {
    this.currentSlide = index;
    const slide = SLIDES[index];
    const isFirst = index === 0;
    const isLast = index === SLIDES.length - 1;

    // Clear old content
    this.slideContainer.removeAll(true);

    // Icon
    this.scene.add.text(0, -70, slide.icon, {
      fontSize: '36px',
      resolution: 2,
    }).setOrigin(0.5);
    const icon = this.slideContainer.scene.add.text(0, -70, slide.icon, {
      fontSize: '36px',
    }).setOrigin(0.5);
    this.slideContainer.add(icon);

    // Title
    const title = this.slideContainer.scene.add.text(0, -30, slide.title, {
      fontFamily: FONTS.display,
      fontSize: '20px',
      color: '#2c1810',
      resolution: 2,
    }).setOrigin(0.5);
    this.slideContainer.add(title);

    // Body lines
    let ly = 5;
    for (const line of slide.lines) {
      const txt = this.slideContainer.scene.add.text(0, ly, line, {
        fontFamily: FONTS.body,
        fontSize: '12px',
        color: '#4a3c2e',
        align: 'center',
        resolution: 2,
      }).setOrigin(0.5, 0);
      this.slideContainer.add(txt);
      ly += 18;
    }

    // Update buttons
    this.backBtn.setText(isFirst ? 'Skip' : 'Back');
    this.nextBtn.setText(isLast ? "Let's Play!" : 'Next');

    // Show/hide checkbox on last slide
    const checkBox = this.getData('checkBox') as Phaser.GameObjects.Graphics;
    const checkLabel = this.getData('checkLabel') as Phaser.GameObjects.Text;
    const checkZone = this.getData('checkZone') as Phaser.GameObjects.Zone;
    if (isLast) {
      checkBox?.setAlpha(1);
      checkLabel?.setAlpha(1);
      checkZone?.setInteractive({ useHandCursor: true });
    } else {
      checkBox?.setAlpha(0);
      checkLabel?.setAlpha(0);
      checkZone?.disableInteractive();
    }

    this.updateDots();
  }

  private onBack(): void {
    if (this.currentSlide === 0) {
      // Skip — close tutorial
      this.close();
    } else {
      this.showSlide(this.currentSlide - 1);
    }
  }

  private onNext(): void {
    if (this.currentSlide === SLIDES.length - 1) {
      // Let's Play!
      this.close();
    } else {
      this.showSlide(this.currentSlide + 1);
    }
  }

  private close(): void {
    if (this.dontShowCheck) {
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch { /* ignore */ }
    }
    this.onComplete();
    this.destroy();
  }
}
