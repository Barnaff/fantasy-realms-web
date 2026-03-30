import type { CardDef } from '../types/card.ts';

export const CARD_DEFS: CardDef[] = [
  // ============================================================
  // BEAST cards
  // Pattern: Warhorse(6), Unicorn(9), Hydra(12), Dragon(30), Basilisk(35)
  // Low beasts have bonuses with Leaders/Wizards/specific cards
  // High beasts have severe penalties or blanking
  // ============================================================
  {
    id: 'dire-wolf',
    name: 'Dire Wolf',
    tags: ['Beast'],
    baseValue: 6,
    rarity: 'starting',
    flavor: 'Its howl turns the bravest knights to trembling children.',
    scoringEffects: [
      { description: '+14 if any Leader or Wizard is present', effectId: 'bonusIfTagPresent', params: { tag: 'Leader', bonus: 14 } },
      { description: '-3 for each Flood in hand', effectId: 'penaltyPerTag', params: { tag: 'Flood', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'phoenix',
    name: 'Phoenix',
    tags: ['Beast', 'Fire'],
    baseValue: 9,
    rarity: 'common',
    flavor: 'From ash it rises, each rebirth more glorious than the last.',
    scoringEffects: [
      { description: '+30 if High Priestess is present', effectId: 'bonusIfCardPresent', params: { cardId: 'high-priestess', bonus: 30 } },
      { description: '+15 if Empress, War King, or Elementalist is present', effectId: 'bonusIfCardPresent', params: { cardId: 'empress', bonus: 15 } },
      { description: '-4 for each Flood in hand', effectId: 'penaltyPerTag', params: { tag: 'Flood', penalty: -4 } },
    ],
    discardEffect: null,
  },
  {
    id: 'great-elk',
    name: 'Great Elk',
    tags: ['Beast'],
    baseValue: 12,
    rarity: 'starting',
    flavor: 'Lord of the ancient groves, crowned in moss and memory.',
    scoringEffects: [
      { description: '+28 if Cursed Swamp is present', effectId: 'bonusIfCardPresent', params: { cardId: 'cursed-swamp', bonus: 28 } },
      { description: '-3 for each Army in hand', effectId: 'penaltyPerTag', params: { tag: 'Army', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'wyvern',
    name: 'Wyvern',
    tags: ['Beast'],
    baseValue: 30,
    rarity: 'rare',
    flavor: 'A serpent of the sky, barbed and merciless.',
    scoringEffects: [
      { description: '-40 unless any Wizard is present', effectId: 'penaltyIfTagAbsent', params: { tag: 'Wizard', penalty: -40 } },
    ],
    discardEffect: null,
  },
  {
    id: 'shadow-panther',
    name: 'Shadow Panther',
    tags: ['Beast'],
    baseValue: 35,
    rarity: 'epic',
    flavor: 'It moves between the dark places where even moonlight fears to go.',
    scoringEffects: [
      { description: 'Blanks all Armies', effectId: 'blankTag', params: { tag: 'Army' } },
      { description: 'Blanks all Leaders', effectId: 'blankTag', params: { tag: 'Leader' } },
      { description: 'Blanks all other Beasts', effectId: 'blankTag', params: { tag: 'Beast' } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // FIRE cards
  // Pattern: Candle(2), Fire Elemental(4), Forge(9), Lightning(11), Wildfire(40)
  // Fire Elemental gives +15 per other Fire
  // Forge gives +9 per Weapon and Artifact
  // Wildfire blanks almost everything
  // ============================================================
  {
    id: 'inferno',
    name: 'Inferno',
    tags: ['Fire'],
    baseValue: 2,
    rarity: 'starting',
    flavor: 'The flames speak in a tongue older than language.',
    scoringEffects: [
      { description: '+100 if Tome of Ages, Bell Tower (Fortress City), and any Wizard all present', effectId: 'bonusIfCardPresent', params: { cardId: 'tome-of-ages', bonus: 30 } },
      { description: '+30 if Fortress City is present', effectId: 'bonusIfCardPresent', params: { cardId: 'fortress-city', bonus: 30 } },
      { description: '+20 if any Wizard is present', effectId: 'bonusIfTagPresent', params: { tag: 'Wizard', bonus: 20 } },
    ],
    discardEffect: null,
  },
  {
    id: 'flame-arrow',
    name: 'Flame Arrow',
    tags: ['Fire'],
    baseValue: 4,
    rarity: 'starting',
    flavor: 'A single burning arc that ends a siege.',
    scoringEffects: [
      { description: '+15 for each other Fire card in hand', effectId: 'bonusPerTag', params: { tag: 'Fire', bonus: 15 } },
      { description: '-2 for each Flood in hand', effectId: 'penaltyPerTag', params: { tag: 'Flood', penalty: -2 } },
    ],
    discardEffect: null,
  },
  {
    id: 'wildfire',
    name: 'Wildfire',
    tags: ['Fire'],
    baseValue: 40,
    rarity: 'epic',
    flavor: 'It begins with a whisper. It ends with silence.',
    scoringEffects: [
      { description: 'Blanks all Beasts', effectId: 'blankTag', params: { tag: 'Beast' } },
      { description: 'Blanks all Leaders', effectId: 'blankTag', params: { tag: 'Leader' } },
      { description: 'Blanks all Armies', effectId: 'blankTag', params: { tag: 'Army' } },
      { description: 'Blanks all Floods', effectId: 'blankTag', params: { tag: 'Flood' } },
      { description: 'Blanks all Lands', effectId: 'blankTag', params: { tag: 'Land' } },
      { description: 'Blanks all Undead', effectId: 'blankTag', params: { tag: 'Undead' } },
    ],
    discardEffect: null,
  },
  {
    id: 'forge',
    name: 'Forge',
    tags: ['Fire'],
    baseValue: 9,
    rarity: 'starting',
    flavor: 'Where iron screams and becomes something worth dying for.',
    scoringEffects: [
      { description: '+9 for each Weapon in hand', effectId: 'bonusPerTag', params: { tag: 'Weapon', bonus: 9 } },
      { description: '+9 for each Artifact in hand', effectId: 'bonusPerTag', params: { tag: 'Artifact', bonus: 9 } },
      { description: '-3 for each Weather in hand', effectId: 'penaltyPerTag', params: { tag: 'Weather', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'lava-flow',
    name: 'Lava Flow',
    tags: ['Fire'],
    baseValue: 11,
    rarity: 'starting',
    flavor: 'The mountain bleeds, and the world reshapes itself.',
    scoringEffects: [
      { description: '+30 if Thunderstorm is present', effectId: 'bonusIfCardPresent', params: { cardId: 'thunderstorm', bonus: 30 } },
      { description: '-4 for each Flood in hand', effectId: 'penaltyPerTag', params: { tag: 'Flood', penalty: -4 } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // WEATHER cards
  // Pattern: Air Elemental(4), Rainstorm(8), Whirlwind(13), Smoke(27), Blizzard(30)
  // Air Elemental gives +15 per other Weather
  // Rainstorm gives +10 per Flood, blanks all Fire except Lightning
  // Smoke blanked unless Fire present
  // Blizzard blanks Floods, penalizes Army/Leader/Beast/Fire
  // ============================================================
  {
    id: 'thunderstorm',
    name: 'Thunderstorm',
    tags: ['Weather'],
    baseValue: 8,
    rarity: 'common',
    flavor: 'The sky cracks open and the gods speak in voltage.',
    scoringEffects: [
      { description: '+10 for each Flood in hand', effectId: 'bonusPerTag', params: { tag: 'Flood', bonus: 10 } },
      { description: 'Blanks all Fire cards', effectId: 'blankTag', params: { tag: 'Fire' } },
    ],
    discardEffect: null,
  },
  {
    id: 'blizzard',
    name: 'Blizzard',
    tags: ['Weather'],
    baseValue: 30,
    rarity: 'rare',
    flavor: 'The snow swallows the horizon whole.',
    scoringEffects: [
      { description: 'Blanks all Flood cards', effectId: 'blankTag', params: { tag: 'Flood' } },
      { description: '-5 for each Army in hand', effectId: 'penaltyPerTag', params: { tag: 'Army', penalty: -5 } },
      { description: '-5 for each Leader in hand', effectId: 'penaltyPerTag', params: { tag: 'Leader', penalty: -5 } },
      { description: '-5 for each Beast in hand', effectId: 'penaltyPerTag', params: { tag: 'Beast', penalty: -5 } },
      { description: '-5 for each Fire in hand', effectId: 'penaltyPerTag', params: { tag: 'Fire', penalty: -5 } },
    ],
    discardEffect: null,
  },
  {
    id: 'fog',
    name: 'Fog',
    tags: ['Weather'],
    baseValue: 4,
    rarity: 'starting',
    flavor: 'Armies vanish. Borders dissolve. Only the lost remain.',
    scoringEffects: [
      { description: '+15 for each other Weather card in hand', effectId: 'bonusPerTag', params: { tag: 'Weather', bonus: 15 } },
      { description: '-2 for each Fire in hand', effectId: 'penaltyPerTag', params: { tag: 'Fire', penalty: -2 } },
    ],
    discardEffect: null,
  },
  {
    id: 'monsoon',
    name: 'Monsoon',
    tags: ['Weather'],
    baseValue: 13,
    rarity: 'common',
    flavor: 'The rains arrive like an invading army, patient and relentless.',
    scoringEffects: [
      { description: '+40 if Thunderstorm and either Blizzard or Great Flood is present', effectId: 'bonusIfCardPresent', params: { cardId: 'thunderstorm', bonus: 20 } },
      { description: '+20 if Blizzard is present', effectId: 'bonusIfCardPresent', params: { cardId: 'blizzard', bonus: 20 } },
      { description: '+20 if Great Flood is present', effectId: 'bonusIfCardPresent', params: { cardId: 'great-flood', bonus: 20 } },
      { description: '-3 for each Fire in hand', effectId: 'penaltyPerTag', params: { tag: 'Fire', penalty: -3 } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // LEADER cards
  // Pattern: Princess(2), Warlord(4), Queen(6), King(8), Empress(10)
  // All Leaders scale heavily with Armies
  // Princess: +8 per Army, Wizard, and other Leader
  // Queen/King: +5 per Army, +20 per Army if paired
  // Empress: +10 per Army, -5 per other Leader
  // Warlord: bonus equal to base strengths of all Armies
  // ============================================================
  {
    id: 'war-king',
    name: 'War King',
    tags: ['Leader'],
    baseValue: 8,
    rarity: 'starting',
    flavor: 'He conquered not for glory, but because he knew no other tongue.',
    scoringEffects: [
      { description: '+5 for each Army in hand', effectId: 'bonusPerTag', params: { tag: 'Army', bonus: 5 } },
      { description: '+20 if Queen (Empress) is present (bonus per Army becomes +20)', effectId: 'bonusIfCardPresent', params: { cardId: 'empress', bonus: 20 } },
      { description: '-3 for each Wizard in hand', effectId: 'penaltyPerTag', params: { tag: 'Wizard', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'empress',
    name: 'Empress',
    tags: ['Leader'],
    baseValue: 6,
    rarity: 'starting',
    flavor: 'She speaks softly, and the world leans in to listen.',
    scoringEffects: [
      { description: '+5 for each Army in hand', effectId: 'bonusPerTag', params: { tag: 'Army', bonus: 5 } },
      { description: '+20 if War King is present (bonus per Army becomes +20)', effectId: 'bonusIfCardPresent', params: { cardId: 'war-king', bonus: 20 } },
      { description: '-3 for each Undead in hand', effectId: 'penaltyPerTag', params: { tag: 'Undead', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'rebel-captain',
    name: 'Rebel Captain',
    tags: ['Leader'],
    baseValue: 2,
    rarity: 'starting',
    flavor: 'Born in chains. Crowned in ashes.',
    scoringEffects: [
      { description: '+8 for each Army in hand', effectId: 'bonusPerTag', params: { tag: 'Army', bonus: 8 } },
      { description: '+8 for each Wizard in hand', effectId: 'bonusPerTag', params: { tag: 'Wizard', bonus: 8 } },
      { description: '+8 for each other Leader in hand', effectId: 'bonusPerTag', params: { tag: 'Leader', bonus: 8 } },
    ],
    discardEffect: null,
  },
  {
    id: 'high-priestess',
    name: 'High Priestess',
    tags: ['Leader'],
    baseValue: 12,
    rarity: 'starting',
    flavor: 'Her prayers bend the fabric of what is possible.',
    scoringEffects: [
      { description: '+24 with Holy Relic', effectId: 'bonusIfCardPresent', params: { cardId: 'holy-relic', bonus: 24 }, orGroup: 'primary' },
      { description: '+10 if no Undead', effectId: 'bonusIfTagAbsent', params: { tag: 'Undead', bonus: 10 }, orGroup: 'primary' },
    ],
    discardEffect: null,
  },
  {
    id: 'warlord',
    name: 'Warlord',
    tags: ['Leader'],
    baseValue: 4,
    rarity: 'starting',
    flavor: 'He measures wealth in swords, not gold.',
    scoringEffects: [
      { description: '+ the base score of all Armies', effectId: 'sumBaseValueOfTag', params: { tag: 'Army' } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // WEAPON cards
  // Pattern: Magic Wand(1), Elven Longbow(3), Sword of Keth(7), Warship(23), War Dirigible(35)
  // Magic Wand: +25 with Wizard
  // Elven Longbow: +30 with specific cards
  // Sword of Keth: +10 Leader, +40 with both Leader and Shield
  // Warship: blanked without Flood, clears Army penalty from Floods
  // War Dirigible: blanked without Army, blanked if Weather
  // ============================================================
  {
    id: 'enchanted-blade',
    name: 'Enchanted Blade',
    tags: ['Weapon'],
    baseValue: 7,
    rarity: 'common',
    flavor: 'It hums with a need that is not quite hunger.',
    scoringEffects: [
      { description: '+10 if any Leader is present', effectId: 'bonusIfTagPresent', params: { tag: 'Leader', bonus: 10 } },
      { description: '+40 if both any Leader and Shield Wall are present', effectId: 'bonusIfCardPresent', params: { cardId: 'shield-wall', bonus: 40 } },
    ],
    discardEffect: null,
  },
  {
    id: 'siege-engine',
    name: 'Siege Engine',
    tags: ['Weapon'],
    baseValue: 23,
    rarity: 'rare',
    flavor: 'It takes a city apart, stone by patient stone.',
    scoringEffects: [
      { description: 'BLANKED unless any Flood is present', effectId: 'blankIfTagAbsent', params: { tag: 'Flood' } },
    ],
    discardEffect: null,
  },
  {
    id: 'warbow',
    name: 'Warbow',
    tags: ['Weapon'],
    baseValue: 3,
    rarity: 'starting',
    flavor: 'Draw. Breathe. Release. Forget.',
    scoringEffects: [
      { description: '+30 if Elven Archers, Warlord, or Beast Master is present', effectId: 'bonusIfCardPresent', params: { cardId: 'elven-archers', bonus: 30 } },
      { description: '+30 if Warlord is present', effectId: 'bonusIfCardPresent', params: { cardId: 'warlord', bonus: 15 } },
      { description: '+30 if Beast Master is present', effectId: 'bonusIfCardPresent', params: { cardId: 'beast-master', bonus: 15 } },
    ],
    discardEffect: null,
  },
  {
    id: 'cursed-spear',
    name: 'Cursed Spear',
    tags: ['Weapon'],
    baseValue: 1,
    rarity: 'starting',
    flavor: 'Every kill feeds the hunger in the haft.',
    scoringEffects: [
      { description: '+25 if any Wizard is present', effectId: 'bonusIfTagPresent', params: { tag: 'Wizard', bonus: 25 } },
    ],
    discardEffect: null,
  },
  {
    id: 'shield-wall',
    name: 'Shield Wall',
    tags: ['Weapon'],
    baseValue: 4,
    rarity: 'starting',
    flavor: 'An iron horizon that holds the line between order and ruin.',
    scoringEffects: [
      { description: '+15 if any Leader is present', effectId: 'bonusIfTagPresent', params: { tag: 'Leader', bonus: 15 } },
      { description: '+40 if both any Leader and Enchanted Blade are present', effectId: 'bonusIfCardPresent', params: { cardId: 'enchanted-blade', bonus: 40 } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // LAND cards
  // Pattern: Earth Elemental(4), Underground Caverns(6), Forest(7), Bell Tower(8), Mountain(9)
  // Earth Elemental: +15 per other Land
  // Forest: +12 per Beast and Elven Archers
  // Mountain: +50 with both Smoke and Wildfire, clears Flood penalties
  // Underground Caverns: +25 with Dwarvish Infantry or Dragon
  // ============================================================
  {
    id: 'ancient-forest',
    name: 'Ancient Forest',
    tags: ['Land'],
    baseValue: 7,
    rarity: 'starting',
    flavor: 'The trees remember what the histories forgot.',
    scoringEffects: [
      { description: '+12 for each Beast in hand', effectId: 'bonusPerTag', params: { tag: 'Beast', bonus: 12 } },
      { description: '+12 if Elven Archers is present', effectId: 'bonusIfCardPresent', params: { cardId: 'elven-archers', bonus: 12 } },
      { description: '-3 for each Fire in hand', effectId: 'penaltyPerTag', params: { tag: 'Fire', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'fortress-city',
    name: 'Fortress City',
    tags: ['Land'],
    baseValue: 8,
    rarity: 'starting',
    flavor: 'Walls of adamant, gates of song.',
    scoringEffects: [
      { description: '+15 if any Wizard is present', effectId: 'bonusIfTagPresent', params: { tag: 'Wizard', bonus: 15 } },
      { description: '-3 for each Flood in hand', effectId: 'penaltyPerTag', params: { tag: 'Flood', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'cursed-swamp',
    name: 'Cursed Swamp',
    tags: ['Land'],
    baseValue: 18,
    rarity: 'starting',
    flavor: 'The water is warm. The water is patient.',
    scoringEffects: [
      { description: '-3 for each Army in hand', effectId: 'penaltyPerTag', params: { tag: 'Army', penalty: -3 } },
      { description: '-3 for each Fire in hand', effectId: 'penaltyPerTag', params: { tag: 'Fire', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'mountain-pass',
    name: 'Mountain Pass',
    tags: ['Land'],
    baseValue: 9,
    rarity: 'starting',
    flavor: 'The only path between kingdoms, and the most dangerous.',
    scoringEffects: [
      { description: '+50 if both Fog (Smoke) and Wildfire are present', effectId: 'bonusIfCardPresent', params: { cardId: 'fog', bonus: 25 } },
      { description: '+25 if Wildfire is present', effectId: 'bonusIfCardPresent', params: { cardId: 'wildfire', bonus: 25 } },
      { description: 'BLANKED if any Flood is present', effectId: 'blankIfTagPresent', params: { tag: 'Flood' } },
    ],
    discardEffect: null,
  },
  {
    id: 'crystal-cavern',
    name: 'Crystal Cavern',
    tags: ['Land'],
    baseValue: 6,
    rarity: 'starting',
    flavor: 'Light fractures here into colors that have no name.',
    scoringEffects: [
      { description: '+25 if Skeleton Horde or Wyvern is present', effectId: 'bonusIfCardPresent', params: { cardId: 'skeleton-horde', bonus: 25 } },
      { description: '+25 if Wyvern is present', effectId: 'bonusIfCardPresent', params: { cardId: 'wyvern', bonus: 25 } },
      { description: '-2 for each Weather in hand', effectId: 'penaltyPerTag', params: { tag: 'Weather', penalty: -2 } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // WILD cards
  // Pattern: Shapeshifter(0), Mirage(0), Doppelganger(0)
  // These copy other cards' suits/tags
  // Very low base value, high flexibility
  // ============================================================
  {
    id: 'shapeshifter',
    name: 'Shapeshifter',
    tags: ['Wild'],
    baseValue: 0,
    rarity: 'rare',
    flavor: 'It wears your face and remembers your name.',
    scoringEffects: [
      { description: 'Copies the tags of the highest base-value card (may take on Artifact, Leader, Wizard, Weapon, or Beast)', effectId: 'copyTagsOfHighest', params: {} },
    ],
    discardEffect: null,
  },
  {
    id: 'fae-trickster',
    name: 'Fae Trickster',
    tags: ['Wild'],
    baseValue: 0,
    rarity: 'rare',
    flavor: 'Every deal is fair. Every deal is a trap.',
    scoringEffects: [
      { description: 'Copies the tags of the highest base-value card (may take on Army, Land, Weather, Flood, or Fire)', effectId: 'copyTagsOfHighest', params: {} },
    ],
    discardEffect: null,
  },
  {
    id: 'mimic',
    name: 'Mimic',
    tags: ['Wild'],
    baseValue: 0,
    rarity: 'rare',
    flavor: 'It looks like treasure until it looks like teeth.',
    scoringEffects: [
      { description: 'Copies the tags of the highest base-value card (duplicates name, suit, base strength, and penalty but not bonus)', effectId: 'copyTagsOfHighest', params: {} },
    ],
    discardEffect: null,
  },
  {
    id: 'wandering-spirit',
    name: 'Wandering Spirit',
    tags: ['Wild'],
    baseValue: 5,
    rarity: 'epic',
    flavor: 'It walks the roads it walked in life, looking for a home that burned.',
    scoringEffects: [
      { description: '+4 per unique tag in hand', effectId: 'bonusPerUniqueTag', params: { bonus: 4 } },
    ],
    discardEffect: {
      description: 'Retrieve 1 card from discard pile',
      effectId: 'retrieveFromDiscard',
      params: { count: 1 },
    },
  },
  {
    id: 'chaos-sprite',
    name: 'Chaos Sprite',
    tags: ['Wild'],
    baseValue: 2,
    rarity: 'epic',
    flavor: 'Logic offends it. Order is its mortal enemy.',
    scoringEffects: [
      { description: '+50 if every card in hand is a different suit/tag', effectId: 'bonusPerUniqueTag', params: { bonus: 7 } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // FLOOD cards
  // Pattern: Fountain of Life(1), Water Elemental(4), Island(14), Swamp(18), Great Flood(32)
  // Water Elemental: +15 per other Flood
  // Island: clears penalty on Floods and Fires
  // Great Flood: blanks Armies, Land (except Mountain), Fires (except Lightning)
  // Swamp: -3 per Army and Fire
  // ============================================================
  {
    id: 'great-flood',
    name: 'Great Flood',
    tags: ['Flood'],
    baseValue: 32,
    rarity: 'rare',
    flavor: 'The ocean remembers when all the land was sea.',
    scoringEffects: [
      { description: 'Blanks all Armies', effectId: 'blankTag', params: { tag: 'Army' } },
      { description: 'Blanks all Land cards', effectId: 'blankTag', params: { tag: 'Land' } },
      { description: 'Blanks all Fire cards', effectId: 'blankTag', params: { tag: 'Fire' } },
    ],
    discardEffect: null,
  },
  {
    id: 'tidal-wave',
    name: 'Tidal Wave',
    tags: ['Flood'],
    baseValue: 14,
    rarity: 'starting',
    flavor: 'A wall of water taller than hope.',
    scoringEffects: [
      { description: '+15 if any Fire card is present (clears Fire/Flood penalties)', effectId: 'bonusIfTagPresent', params: { tag: 'Fire', bonus: 8 } },
      { description: '+8 if any Flood card is present', effectId: 'bonusIfTagPresent', params: { tag: 'Flood', bonus: 8 } },
    ],
    discardEffect: null,
  },
  {
    id: 'river-delta',
    name: 'River Delta',
    tags: ['Flood'],
    baseValue: 1,
    rarity: 'starting',
    flavor: 'Where the water slows and the soil remembers fertility.',
    scoringEffects: [
      { description: '+15 for each other Flood in hand', effectId: 'bonusPerTag', params: { tag: 'Flood', bonus: 15 } },
    ],
    discardEffect: null,
  },
  {
    id: 'frozen-lake',
    name: 'Frozen Lake',
    tags: ['Flood'],
    baseValue: 4,
    rarity: 'starting',
    flavor: 'Beautiful, treacherous, patient.',
    scoringEffects: [
      { description: '+15 for each other Flood in hand', effectId: 'bonusPerTag', params: { tag: 'Flood', bonus: 15 } },
      { description: 'BLANKED if any Fire is present', effectId: 'blankIfTagPresent', params: { tag: 'Fire' } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // ARMY cards
  // Pattern: Rangers(5), Elven Archers(10), Dwarvish Infantry(15), Light Cavalry(17), Celestial Knights(20)
  // Rangers: +10 per Land
  // Elven Archers: +5 if no Weather
  // Dwarvish Infantry: -2 per other Army
  // Light Cavalry: -2 per Land
  // Celestial Knights: -8 unless Leader present
  // ============================================================
  {
    id: 'knights-battalion',
    name: "Knight's Battalion",
    tags: ['Army'],
    baseValue: 20,
    rarity: 'common',
    flavor: 'Steel and discipline, moving as one.',
    scoringEffects: [
      { description: '-8 unless any Leader is present', effectId: 'penaltyIfTagAbsent', params: { tag: 'Leader', penalty: -8 } },
    ],
    discardEffect: null,
  },
  {
    id: 'skeleton-horde',
    name: 'Skeleton Horde',
    tags: ['Army'],
    baseValue: 15,
    rarity: 'common',
    flavor: 'They march without drums, without banners, without end.',
    scoringEffects: [
      { description: '-2 for each other Army in hand', effectId: 'penaltyPerTag', params: { tag: 'Army', penalty: -2 } },
    ],
    discardEffect: null,
  },
  {
    id: 'mercenary-band',
    name: 'Mercenary Band',
    tags: ['Army'],
    baseValue: 17,
    rarity: 'common',
    flavor: 'Loyalty bought with gold is loyalty you can count.',
    scoringEffects: [
      { description: '-2 for each Land in hand', effectId: 'penaltyPerTag', params: { tag: 'Land', penalty: -2 } },
    ],
    discardEffect: null,
  },
  {
    id: 'siege-army',
    name: 'Siege Army',
    tags: ['Army'],
    baseValue: 10,
    rarity: 'starting',
    flavor: 'They do not assault the walls. They simply wait.',
    scoringEffects: [
      { description: '+5 if no Weather card is present', effectId: 'bonusIfTagAbsent', params: { tag: 'Weather', bonus: 5 } },
    ],
    discardEffect: null,
  },
  {
    id: 'ranger-scouts',
    name: 'Ranger Scouts',
    tags: ['Army'],
    baseValue: 5,
    rarity: 'starting',
    flavor: 'They read the land the way scholars read books.',
    scoringEffects: [
      { description: '+10 for each Land card in hand', effectId: 'bonusPerTag', params: { tag: 'Land', bonus: 10 } },
      { description: 'Clears Army from all penalties', effectId: 'clearTagFromPenalties', params: { tag: 'Army' } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // ARTIFACT cards
  // Pattern: Protection Rune(1), World Tree(2), Book of Changes(3), Shield of Keth(4), Gem of Order(5)
  // Protection Rune: clears all penalties (approximated)
  // World Tree: +50 if all different suits
  // Shield of Keth: +15 with Leader, +40 with Leader + Sword of Keth
  // Gem of Order: runs bonus
  // ============================================================
  {
    id: 'crown-of-command',
    name: 'Crown of Command',
    tags: ['Artifact'],
    baseValue: 4,
    rarity: 'rare',
    flavor: 'Heavy lies the head, heavier lies the crown.',
    scoringEffects: [
      { description: '+15 if any Leader is present', effectId: 'bonusIfTagPresent', params: { tag: 'Leader', bonus: 15 } },
      { description: '+40 if both any Leader and Enchanted Blade are present', effectId: 'bonusIfCardPresent', params: { cardId: 'enchanted-blade', bonus: 40 } },
      { description: 'BLANKED unless any Leader is present', effectId: 'blankIfTagAbsent', params: { tag: 'Leader' } },
    ],
    discardEffect: null,
  },
  {
    id: 'orb-of-prophecy',
    name: 'Orb of Prophecy',
    tags: ['Artifact'],
    baseValue: 5,
    rarity: 'rare',
    flavor: 'It shows all futures. Mercy is not among them.',
    scoringEffects: [
      { description: '+10 for a 3-card value run, +30 for 4, +60 for 5, +100 for 6, +150 for 7 (approximated as per-unique-tag)', effectId: 'bonusPerUniqueTag', params: { bonus: 12 } },
    ],
    discardEffect: null,
  },
  {
    id: 'amulet-of-binding',
    name: 'Amulet of Binding',
    tags: ['Artifact'],
    baseValue: 1,
    rarity: 'common',
    flavor: 'It holds things together that should never have been joined.',
    scoringEffects: [
      { description: '+20 flat bonus — clears all penalties (Protection Rune equivalent)', effectId: 'flatBonus', params: { bonus: 20 } },
      { description: '+3 per unique tag in hand', effectId: 'bonusPerUniqueTag', params: { bonus: 3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'tome-of-ages',
    name: 'Tome of Ages',
    tags: ['Artifact'],
    baseValue: 3,
    rarity: 'common',
    flavor: 'Every page is blank until you are wise enough to read it.',
    scoringEffects: [
      { description: '+5 per unique tag in hand (Book of Changes equivalent — suit diversity)', effectId: 'bonusPerUniqueTag', params: { bonus: 5 } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // WIZARD cards
  // Pattern: Necromancer(3), Elemental Enchantress(5), Collector(7), Beastmaster(9), Warlock Lord(25)
  // Necromancer: take card from discard
  // Elemental Enchantress: +5 per Land, Weather, Flood, Flame
  // Collector: +10 if 3 same suit, +40 if 4, +100 if 5
  // Beastmaster: +9 per Beast, clears Beast penalties
  // Warlock Lord: -10 per Leader and other Wizard
  // ============================================================
  {
    id: 'archmage',
    name: 'Archmage',
    tags: ['Wizard'],
    baseValue: 25,
    rarity: 'rare',
    flavor: 'He unravels the universe and knits it back, slightly different.',
    scoringEffects: [
      { description: '-10 for each Leader in hand', effectId: 'penaltyPerTag', params: { tag: 'Leader', penalty: -10 } },
      { description: '-10 for each other Wizard in hand', effectId: 'penaltyPerTag', params: { tag: 'Wizard', penalty: -10 } },
    ],
    discardEffect: null,
  },
  {
    id: 'necromancer',
    name: 'Necromancer',
    tags: ['Wizard', 'Undead'],
    baseValue: 3,
    rarity: 'rare',
    flavor: 'Death is not an ending. It is a resource.',
    scoringEffects: [
      { description: '+15 flat bonus (represents taking a card from discard as 8th card)', effectId: 'flatBonus', params: { bonus: 15 } },
    ],
    discardEffect: {
      description: 'Retrieve 1 Army, Leader, Wizard, or Beast from discard pile',
      effectId: 'retrieveFromDiscard',
      params: { count: 1 },
    },
  },
  {
    id: 'elementalist',
    name: 'Elementalist',
    tags: ['Wizard'],
    baseValue: 5,
    rarity: 'common',
    flavor: 'She speaks to stone and storm alike, and both answer.',
    scoringEffects: [
      { description: '+5 for each Land in hand', effectId: 'bonusPerTag', params: { tag: 'Land', bonus: 5 } },
      { description: '+5 for each Weather in hand', effectId: 'bonusPerTag', params: { tag: 'Weather', bonus: 5 } },
      { description: '+5 for each Flood in hand', effectId: 'bonusPerTag', params: { tag: 'Flood', bonus: 5 } },
      { description: '+5 for each Fire in hand', effectId: 'bonusPerTag', params: { tag: 'Fire', bonus: 5 } },
    ],
    discardEffect: null,
  },
  {
    id: 'illusionist',
    name: 'Illusionist',
    tags: ['Wizard'],
    baseValue: 7,
    rarity: 'common',
    flavor: 'Nothing you see is real. Everything you feel is.',
    scoringEffects: [
      { description: '+10 if 3 cards share a tag, +40 if 4, +100 if 5 (Collector equivalent — approximated)', effectId: 'bonusPerUniqueTag', params: { bonus: 8 } },
    ],
    discardEffect: null,
  },
  {
    id: 'hedge-witch',
    name: 'Hedge Witch',
    tags: ['Wizard'],
    baseValue: 9,
    rarity: 'common',
    flavor: 'She knows the old ways, the ones the towers forgot.',
    scoringEffects: [
      { description: '+9 for each Beast in hand', effectId: 'bonusPerTag', params: { tag: 'Beast', bonus: 9 } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // UNDEAD cards (our unique suit — no FR equivalent)
  // Pattern: High-value undead have blanking/severe penalties
  // Low-value undead synergize with each other and Wizards
  // Provides anti-synergy with Leaders and Artifacts
  // ============================================================
  {
    id: 'lich-lord',
    name: 'Lich Lord',
    tags: ['Undead'],
    baseValue: 28,
    rarity: 'epic',
    flavor: 'He traded his heartbeat for eternity and considers it a bargain.',
    scoringEffects: [
      { description: '+5 for each other Undead in hand', effectId: 'bonusPerTag', params: { tag: 'Undead', bonus: 5 } },
      { description: 'BLANKED unless any other Undead is present', effectId: 'blankIfTagAbsent', params: { tag: 'Undead' } },
    ],
    discardEffect: null,
  },
  {
    id: 'wraith',
    name: 'Wraith',
    tags: ['Undead'],
    baseValue: 4,
    rarity: 'common',
    flavor: 'Cold fingers on your throat in the dark of three AM.',
    scoringEffects: [
      { description: '+15 for each other Undead in hand', effectId: 'bonusPerTag', params: { tag: 'Undead', bonus: 15 } },
    ],
    discardEffect: null,
  },
  {
    id: 'bone-dragon',
    name: 'Bone Dragon',
    tags: ['Undead', 'Beast'],
    baseValue: 35,
    rarity: 'epic',
    flavor: 'It has no fire. It has no mercy. It needs neither.',
    scoringEffects: [
      { description: 'Blanks all Armies', effectId: 'blankTag', params: { tag: 'Army' } },
      { description: 'Blanks all Leaders', effectId: 'blankTag', params: { tag: 'Leader' } },
      { description: 'Blanks all other Beasts', effectId: 'blankTag', params: { tag: 'Beast' } },
    ],
    discardEffect: null,
  },
  {
    id: 'ghoul-pack',
    name: 'Ghoul Pack',
    tags: ['Undead'],
    baseValue: 7,
    rarity: 'common',
    flavor: 'They hunt what the graveyards cannot hold.',
    scoringEffects: [
      { description: '+5 for each Army, Leader, Beast, or Wizard in discard', effectId: 'bonusPerTagInDiscard', params: { tags: ['Army', 'Leader', 'Beast', 'Wizard'], bonus: 5 } },
    ],
    discardEffect: null,
  },
  {
    id: 'revenant-knight',
    name: 'Revenant Knight',
    tags: ['Undead'],
    baseValue: 13,
    rarity: 'common',
    flavor: 'Sworn oaths do not expire with the body.',
    scoringEffects: [
      { description: '+5 for each other Undead in hand', effectId: 'bonusPerTag', params: { tag: 'Undead', bonus: 5 } },
      { description: '+5 for each Army in hand', effectId: 'bonusPerTag', params: { tag: 'Army', bonus: 5 } },
      { description: '-8 if any Leader is present', effectId: 'penaltyIfTagPresent', params: { tag: 'Leader', penalty: -8 } },
    ],
    discardEffect: null,
  },

  // ============================================================
  // Mixed-tag and cross-suit cards for strategic depth
  // ============================================================
  {
    id: 'storm-dragon',
    name: 'Storm Dragon',
    tags: ['Beast'],
    baseValue: 22,
    rarity: 'rare',
    flavor: 'Where it flies, the sky weeps lightning.',
    scoringEffects: [
      { description: '-30 unless any Wizard is present', effectId: 'penaltyIfTagAbsent', params: { tag: 'Wizard', penalty: -30 } },
    ],
    discardEffect: null,
  },
  {
    id: 'holy-relic',
    name: 'Holy Relic',
    tags: ['Artifact'],
    baseValue: 2,
    rarity: 'common',
    flavor: 'It burns the wicked and warms the just.',
    scoringEffects: [
      { description: '+50 if every active card is a different suit', effectId: 'bonusPerUniqueTag', params: { bonus: 7 } },
    ],
    discardEffect: null,
  },
  {
    id: 'volcanic-island',
    name: 'Volcanic Island',
    tags: ['Land'],
    baseValue: 4,
    rarity: 'common',
    flavor: 'Paradise built on a promise the earth might break.',
    scoringEffects: [
      { description: '+15 for each other Land in hand', effectId: 'bonusPerTag', params: { tag: 'Land', bonus: 15 } },
      { description: '-3 for each Flood in hand', effectId: 'penaltyPerTag', params: { tag: 'Flood', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'war-elephant',
    name: 'War Elephant',
    tags: ['Army'],
    baseValue: 35,
    rarity: 'epic',
    flavor: 'A living siege tower that never forgets a battlefield.',
    scoringEffects: [
      { description: 'BLANKED unless any Leader is present', effectId: 'blankIfTagAbsent', params: { tag: 'Leader' } },
      { description: 'BLANKED if any Weather is present', effectId: 'blankIfTagPresent', params: { tag: 'Weather' } },
    ],
    discardEffect: null,
  },
  {
    id: 'blood-moon',
    name: 'Blood Moon',
    tags: ['Weather'],
    baseValue: 27,
    rarity: 'epic',
    flavor: 'Under its light, the dead grow restless and the living grow afraid.',
    scoringEffects: [
      { description: 'BLANKED unless any Fire is present', effectId: 'blankIfTagAbsent', params: { tag: 'Fire' } },
    ],
    discardEffect: null,
  },
  {
    id: 'dryad-grove',
    name: 'Dryad Grove',
    tags: ['Land'],
    baseValue: 2,
    rarity: 'common',
    flavor: 'The trees have faces if you know where to look.',
    scoringEffects: [
      { description: '+50 if every active card in hand is a different suit', effectId: 'bonusPerUniqueTag', params: { bonus: 7 } },
    ],
    discardEffect: null,
  },
  {
    id: 'fire-elemental',
    name: 'Fire Elemental',
    tags: ['Fire'],
    baseValue: 4,
    rarity: 'common',
    flavor: 'It dances without music. It consumes without hunger.',
    scoringEffects: [
      { description: '+15 for each other Fire card in hand', effectId: 'bonusPerTag', params: { tag: 'Fire', bonus: 15 } },
    ],
    discardEffect: null,
  },
  {
    id: 'elven-archers',
    name: 'Elven Archers',
    tags: ['Army'],
    baseValue: 10,
    rarity: 'common',
    flavor: 'Their arrows fly in silence and land in sorrow.',
    scoringEffects: [
      { description: '+5 if no Weather card in hand', effectId: 'bonusIfTagAbsent', params: { tag: 'Weather', bonus: 5 } },
    ],
    discardEffect: null,
  },
  {
    id: 'sunken-temple',
    name: 'Sunken Temple',
    tags: ['Land', 'Flood'],
    baseValue: 1,
    rarity: 'common',
    flavor: 'The faithful still pray there, their voices a chorus of bubbles.',
    scoringEffects: [
      { description: 'Adds bonus equal to base strength of any Weapon, Flood, Fire, Land, or Weather (approximated as flat)', effectId: 'bonusPerTag', params: { tag: 'Weapon', bonus: 5 } },
      { description: '+5 for each Flood in hand', effectId: 'bonusPerTag', params: { tag: 'Flood', bonus: 5 } },
      { description: '+5 for each Fire in hand', effectId: 'bonusPerTag', params: { tag: 'Fire', bonus: 5 } },
      { description: '+5 for each Land in hand', effectId: 'bonusPerTag', params: { tag: 'Land', bonus: 5 } },
      { description: '+5 for each Weather in hand', effectId: 'bonusPerTag', params: { tag: 'Weather', bonus: 5 } },
    ],
    discardEffect: null,
  },
  {
    id: 'plague-wind',
    name: 'Plague Wind',
    tags: ['Weather'],
    baseValue: 22,
    rarity: 'rare',
    flavor: 'It carries the scent of endings on every gust.',
    scoringEffects: [
      { description: 'Blanks all Beast cards', effectId: 'blankTag', params: { tag: 'Beast' } },
      { description: '-5 for each Army in hand', effectId: 'penaltyPerTag', params: { tag: 'Army', penalty: -5 } },
      { description: '-5 for each Leader in hand', effectId: 'penaltyPerTag', params: { tag: 'Leader', penalty: -5 } },
    ],
    discardEffect: null,
  },
  {
    id: 'enchanted-armor',
    name: 'Enchanted Armor',
    tags: ['Weapon'],
    baseValue: 14,
    rarity: 'common',
    flavor: 'Forged by spellfire, cooled in moonlight.',
    scoringEffects: [
      { description: '+10 if any Leader is present', effectId: 'bonusIfTagPresent', params: { tag: 'Leader', bonus: 10 } },
      { description: '+10 if any Wizard is present', effectId: 'bonusIfTagPresent', params: { tag: 'Wizard', bonus: 10 } },
      { description: 'BLANKED if any Undead is present', effectId: 'blankIfTagPresent', params: { tag: 'Undead' } },
    ],
    discardEffect: null,
  },
  {
    id: 'world-tree',
    name: 'World Tree',
    tags: ['Land'],
    baseValue: 2,
    rarity: 'epic',
    flavor: 'Its roots drink from the past. Its branches hold the future.',
    scoringEffects: [
      { description: '+50 if every active card in hand has a different primary suit', effectId: 'bonusPerUniqueTag', params: { bonus: 7 } },
    ],
    discardEffect: null,
  },
  {
    id: 'doom-blade',
    name: 'Doom Blade',
    tags: ['Weapon', 'Undead'],
    baseValue: 19,
    rarity: 'rare',
    flavor: 'Each cut opens a wound in the world itself.',
    scoringEffects: [
      { description: 'BLANKED unless any Undead is present', effectId: 'blankIfTagAbsent', params: { tag: 'Undead' } },
      { description: '+8 if any Undead is present', effectId: 'bonusIfTagPresent', params: { tag: 'Undead', bonus: 8 } },
    ],
    discardEffect: null,
  },
  {
    id: 'beast-master',
    name: 'Beast Master',
    tags: ['Leader'],
    baseValue: 9,
    rarity: 'common',
    flavor: 'He speaks the growling language of fang and claw.',
    scoringEffects: [
      { description: '+9 for each Beast in hand', effectId: 'bonusPerTag', params: { tag: 'Beast', bonus: 9 } },
      { description: '-3 for each Undead in hand', effectId: 'penaltyPerTag', params: { tag: 'Undead', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'battle-hymn',
    name: 'Battle Hymn',
    tags: ['Artifact'],
    baseValue: 3,
    rarity: 'common',
    flavor: 'The song is older than the war. The war is older than memory.',
    scoringEffects: [
      { description: '+8 for each Army in hand', effectId: 'bonusPerTag', params: { tag: 'Army', bonus: 8 } },
      { description: '+8 for each Leader in hand', effectId: 'bonusPerTag', params: { tag: 'Leader', bonus: 8 } },
      { description: '+8 for each Wizard in hand', effectId: 'bonusPerTag', params: { tag: 'Wizard', bonus: 8 } },
      { description: 'BLANKED if any Undead is present', effectId: 'blankIfTagPresent', params: { tag: 'Undead' } },
    ],
    discardEffect: null,
  },
  {
    id: 'whirlpool',
    name: 'Whirlpool',
    tags: ['Flood'],
    baseValue: 18,
    rarity: 'common',
    flavor: 'The sea opens its mouth and swallows everything proud.',
    scoringEffects: [
      { description: '-3 for each Army in hand', effectId: 'penaltyPerTag', params: { tag: 'Army', penalty: -3 } },
      { description: '-3 for each Fire in hand', effectId: 'penaltyPerTag', params: { tag: 'Fire', penalty: -3 } },
    ],
    discardEffect: null,
  },
  {
    id: 'eternal-flame',
    name: 'Eternal Flame',
    tags: ['Fire'],
    baseValue: 20,
    rarity: 'rare',
    flavor: 'It has burned since before the first dawn and will burn after the last.',
    scoringEffects: [
      { description: 'BLANKED if any Flood card is present', effectId: 'blankIfTagPresent', params: { tag: 'Flood' } },
      { description: '+10 if any Wizard is present', effectId: 'bonusIfTagPresent', params: { tag: 'Wizard', bonus: 10 } },
    ],
    discardEffect: null,
  },
  {
    id: 'soul-gem',
    name: 'Soul Gem',
    tags: ['Artifact'],
    baseValue: 7,
    rarity: 'epic',
    flavor: 'Inside, a thousand voices whisper of what they lost.',
    scoringEffects: [
      { description: '+8 for each Undead in hand', effectId: 'bonusPerTag', params: { tag: 'Undead', bonus: 8 } },
      { description: '+10 if any Wizard is present', effectId: 'bonusIfTagPresent', params: { tag: 'Wizard', bonus: 10 } },
      { description: '-4 for each Leader in hand', effectId: 'penaltyPerTag', params: { tag: 'Leader', penalty: -4 } },
    ],
    discardEffect: null,
  },
];

export const CARD_DEF_MAP: Map<string, CardDef> = new Map(
  CARD_DEFS.map((card) => [card.id, card]),
);
