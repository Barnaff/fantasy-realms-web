# Fantasy Realms Web - Project Rules

## Card Data — Single Source of Truth: Firestore
- **Firestore is the ONLY source of truth for card data.** The game loads cards from Firestore at startup.
- `src/data/cards.ts` is a **live shim** that re-exports from the gameData singleton. Do NOT edit card definitions there.
- `src/data/cards.archive.ts` is an archived snapshot used as a fallback if Firestore is unavailable. Do NOT rely on it for active data.
- When updating or balancing cards, update them **directly in Firestore** using the admin script:
  ```
  npx tsx scripts/firebase-cards.ts list
  npx tsx scripts/firebase-cards.ts get <card-id>
  npx tsx scripts/firebase-cards.ts update <card-id> '<json>'
  npx tsx scripts/firebase-cards.ts set-effects <card-id> '<effects-json>'
  ```
- The `firebase-service-account.json` file (gitignored) is required for write access. It lives in the project root.
- After updating cards in Firestore, the game and admin dashboard will pick up changes on next load (no code deploy needed).

## Version Pushes
- When pushing a new version, ALWAYS update the changelog and version number displayed on the main/title screen with the latest changes.
- Bump the version string (e.g., v0.13.0 → v0.14.0) in all relevant places.

## Card Updates & Balance
- When updating cards (stats, abilities, balance changes), use the Firebase admin script to update Firestore directly.
- ALWAYS verify the changes are reflected in both the game AND the admin dashboard.
- The admin dashboard at `/admin/cards` also has a "Sync from Code" button for bulk overwriting Firestore with the archive data (preserves art URLs).

## New Mechanics
- When adding new card mechanics (new effect types, new scoring functions):
  1. Add the scoring function to `src/engine/scoring.ts`
  2. Add the effect to the admin dashboard's `EffectEditor.tsx` (EFFECT_META, SCORING_EFFECT_IDS)
  3. Ensure the admin panel's card editor can create and edit cards using the new mechanics
  4. Update any cards using the new mechanic in Firestore via the admin script

## Tech Stack
- Game engine: Phaser 3 (TypeScript)
- Admin dashboard: React (TypeScript, Vite)
- Admin runs on port 5174 with basename `/admin`
- Game dev server runs on port 5173
- Card data: Firebase Firestore (`gameData/cards` document)

## Card Hover Previews
- Unless stated otherwise, **every card shown anywhere in the game must have a hover preview**.
- The preview should match the size of hand card previews (scale to `hand * 1.5`), centered on the hovered card.
- Standard pattern: tween scale up + vertical lift + 4-layer shadow at depth 99, card at depth 100, 150ms 'Back.easeOut'.
- This applies to: encounter river/hand, draft picks, reward cards, scoring screen, pool viewer, on-end popups, and any future card displays.

## Console Commands
- The game exposes `game.*` commands in the browser console for testing/cheats.
- Use `game.help()` to see all available commands.
