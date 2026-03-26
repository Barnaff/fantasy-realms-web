# Changelog

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
