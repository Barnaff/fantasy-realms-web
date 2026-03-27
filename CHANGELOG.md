# Changelog

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
