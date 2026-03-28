# Changelog

## 0.7.0 — 2026-03-28

### New Features
- Clickable version tag on title screen with scrollable changelog overlay
- Changelog read from CHANGELOG.md file at build time
- Drag-scrollable changelog panel with wheel support

### Improvements
- Title screen buttons migrated to reliable ButtonObject
- Version tag centered and larger (12px) with "v0.7.0 · Changelog" label
- Gold reward rebalanced: 8-15 base (by tier) + 1 gold per 5 points over target
- Tags and score circle repositioned for better visibility in card fan

### Fixes
- Changelog drag-scroll no longer closes the overlay (tap vs drag detection)
- Scroll listeners properly cleaned up when changelog overlay closes
- Scroll uses pointer delta tracking instead of unreliable velocity

## 0.6.0 — 2026-03-28

### New Features
- Tutorial overlay with 7 slides: welcome, drawing, discarding, synergies, blanking, modifiers, winning
- "Don't show again" checkbox persists to localStorage
- Tutorial appears on first encounter of a run
- River starts with 1 face-up card for immediate strategic choice
- Green glow on hand cards during discard phase (matches deck/river draw glow)
- Card relationship arrows between hovered card and river cards
- Visual blanked overlay on blanked cards (gray tint + "BLANKED" label)
- Map improvements: gold trail for completed path, "YOU" marker on current node, checkmarks on visited nodes
- 20 thematic encounter modifiers displayed as colored pills (green bonus, red penalty)

### Improvements
- Buttons completely refactored for reliability: transparent Rectangle hit target, pointerup firing, pressed-state tracking
- All scenes use ButtonObject with 14px padding for easy mobile tapping
- Tags moved to left side of card (visible in fan layout where right side overlaps)
- Score circle moved tighter to card corner
- River card hover preview matches hand card size (scales to hand × 1.5)
- Reward cards bigger with center-pivot hover scaling (1.5×)
- Card text formatting: black text, colored tag references, bold keywords
- Higher resolution text rendering throughout (resolution: 2)
- Deck pile interactive area covers full card (not just label)

### Fixes
- Buttons no longer fail to fire when scene-level pointerdown handlers are active
- Cards interactive across full area (not just art image)
- Hover preview in river no longer gets stuck after interactions
- Encounter modifiers applied to scoring engine

## 0.5.0 — 2026-03-27

### Major: Phaser 3 Rewrite
- Complete migration from React/framer-motion to Phaser 3 game engine
- All rendering now in canvas — no DOM elements, no React
- 11 Phaser Scenes replace React components (Boot, Title, Map, Encounter, BossIntro, Scoring, PostEncounter, Merchant, Event, Rest, GameOver)
- GameManager singleton replaces Zustand store with event-driven state
- CardObject renders cards as Phaser Containers with art, borders, tags, effects
- Full encounter gameplay: draw from deck/river, discard from hand, reorder cards
- Fan layout for hand cards with drag-to-discard and drag-to-reorder
- Map scene with node selection, connection lines, and type-colored nodes
- Responsive scaling via Phaser.Scale.RESIZE
- All pure TypeScript game logic (types, data, engine, scoring) kept unchanged

### Removed
- React, framer-motion, Zustand, Tailwind CSS, clsx dependencies
- All React components, hooks, and CSS

## 0.4.0 — 2026-03-27

### Balance Overhaul
- Multi-tag cards reduced from 21 (28%) to 5 (6%) — now rare and impactful
- Card power curve rebalanced: low cards (5-12) have mild/no penalties, high cards (26-40) have severe penalties or blanking
- 17 thematic penalties added to bonus-only cards (fire vs flood, nature vs war, leader vs undead tensions)
- 5 new blanking effects: Enchanted Armor, Crown of Command, Frozen Lake, Mountain Pass, Battle Hymn
- First level target score raised to 130 (from ~80) for meaningful challenge
- Encounter thresholds scaled: Act 1 (130-175), Act 2 (160-205), Act 3 (190-235)

### New Features
- 20 thematic encounter modifiers with tag bonuses/penalties (e.g., "The Black Swamps": +3 Beast, -4 Fire)
- Encounter modifiers displayed as colored pill badges below level header
- Deck draw hint: bouncing "Tap to draw!" tooltip after 2 seconds on first turn
- Drag-to-reorder cards in hand with live preview (other cards shift to show drop position)
- Removed click-to-select discard flow — discard is now drag-only (cleaner UX)

### Improvements
- All scoring effects shown on compact cards (no more truncated text with "...")
- Penalty effects colored red, blank effects bold red with icon
- Level modifier pills: green for bonuses, red for penalties
- Encounter flavor text shown below modifiers
- Hand cards stay visible during drag-reorder (fixed framer-motion conflicts)
- Hover disabled on all cards while any card is being dragged

### Fixes
- Cards no longer duplicate in hand after drag-discard
- Hover/inspect no longer interrupts drag gestures
- Removed dead click-selection code and unused state

## 0.3.0 — 2026-03-26

### New Features
- Firebase integration: Google sign-in and anonymous auto-login
- Cloud save/restore: game state saved at checkpoints, restored on refresh
- Player stats tracking: runs, victories, best score, win rate (viewable from title screen)
- Desktop hover preview: large card preview appears near hovered card on all screens
- Forfeit run option with confirmation dialog on map screen
- Non-crossing map paths: connection algorithm ensures paths never overlap
- Map flipped bottom-to-top: start at bottom, boss at top

### Improvements
- Auto sign-in as anonymous guest, upgrade to Google anytime
- Save mid-encounter: refresh restores exact hand, river, and turn state
- Rewards screen restores with same card choices on refresh
- Map auto-scrolls to current node with sticky header bar
- Hover preview works on rewards, scoring, and merchant screens

### Fixes
- Card inspect preview exit animation prevents arrow position jumps
- Scoring phase now saveable and restorable

## 0.2.0 — 2026-03-26

### New Features
- Tutorial overlay with scrollable slides, back/next navigation, and "don't show again" checkbox
- Green glow action indicators: deck/river glow when drawing, hand cards glow when discarding
- Pulsing green ring on selectable map nodes
- Version tag on title screen with tappable changelog modal
- Card art shown on all cards using tag-based placeholder fallbacks
- Animated card inspect preview with exit animation (slide down + fade)

### Improvements
- Card preview dismiss animation prevents arrow position jumps
- All cards display uniform art area size regardless of content
- Drag-proof inner card elements (images no longer hijack drag)
- Rich card text: tag names shown in bold with tag colors, keywords (blank, discard) in bold

### Fixes
- TypeScript build errors for Amplify deployment
- Unused imports and dead code cleanup

## 0.1.0 — 2026-03-26

### Initial Release
- 53 unique cards with synergies, penalties, and blanking mechanics
- Turn-based encounters: draw from deck/river, discard to river
- Scoring engine with bonuses, penalties, and card interactions
- Mobile-first responsive UI with card fan layout
- Long-press card inspection with animated preview
- Bezier arrow relationship visualization between cards (green for bonus, red for penalty)
- Rich card text formatting with colored tag names and bold keywords
- Map-based progression with encounters, merchants, events, rest stops
- Relic system (24 relics across common/rare/legendary)
- Event system (16 events with multiple choices)
- AI-generated card artwork with tag-based fallbacks
- Tutorial overlay for first encounter with "don't show again" option
- Green glow indicators for valid player actions (draw/discard phases)
- Pulsing green indicators on map for selectable nodes
- Visual blank/grayscale effect on blanked cards
- Drag-to-discard and drag-to-draw card interactions
- Score breakdown panel with expandable details
- Post-encounter rewards (add/remove cards from pool)
- Merchant screen for buying cards and relics
- Boss encounters with special stipulations
- Deployed on AWS Amplify
