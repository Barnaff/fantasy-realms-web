export interface EventChoice {
  label: string;
  description: string;
  effectId: string;
  params: Record<string, unknown>;
}

export interface EventDef {
  id: string;
  name: string;
  narrative: string;
  choices: EventChoice[];
}

export const EVENT_DEFS: EventDef[] = [
  {
    id: 'wandering-merchant',
    name: 'The Wandering Merchant',
    narrative:
      'A hooded figure emerges from the mist, pulling a cart laden with curious wares. He speaks in a language you almost recognize, gesturing at his goods with long, ringed fingers. His prices are steep, but his merchandise is unlike anything found in the common markets.',
    choices: [
      {
        label: 'Browse the Wares',
        description: 'Spend gold to acquire a rare relic.',
        effectId: 'gainRelic',
        params: { relicId: 'lucky-coin' },
      },
      {
        label: 'Barter a Card',
        description: 'Sacrifice two cards from your pool in exchange for a rare card.',
        effectId: 'removeAndGainRare',
        params: { removeCount: 2 },
      },
      {
        label: 'Decline and Move On',
        description: 'The merchant shrugs and vanishes back into the fog.',
        effectId: 'nothing',
        params: {},
      },
    ],
  },
  {
    id: 'dragon-hoard',
    name: "The Dragon's Hoard",
    narrative:
      'You stumble upon a cavern glittering with gold and jewels, the air thick with the stench of sulphur. A great wyrm slumbers atop the pile, one eye half-open. You could try to pocket some treasure, or perhaps there is something more valuable buried beneath the coins.',
    choices: [
      {
        label: 'Grab the Gold',
        description: 'Pocket a fistful of coins and flee before the beast wakes.',
        effectId: 'gainGold',
        params: { amount: 15 },
      },
      {
        label: 'Search for an Artifact',
        description: 'Risk the dragon\'s wrath to dig deeper into the hoard for something truly powerful.',
        effectId: 'gainRelic',
        params: { relicId: 'artifact-codex' },
      },
      {
        label: 'Leave Quietly',
        description: 'Discretion is the better part of valor. You back away in silence.',
        effectId: 'nothing',
        params: {},
      },
    ],
  },
  {
    id: 'enchanted-spring',
    name: 'The Enchanted Spring',
    narrative:
      'Deep in an ancient grove, you discover a spring of crystalline water that glows faintly silver in the moonlight. The trees around it bear fruit out of season, and birdsong fills the air despite the late hour. The water promises renewal, but such gifts always carry a hidden cost.',
    choices: [
      {
        label: 'Drink Deep',
        description: 'Restore all cards that have been removed from your pool.',
        effectId: 'fullHeal',
        params: {},
      },
      {
        label: 'Bottle the Water',
        description: 'Take some water for later. Gain gold from selling the bottled miracle.',
        effectId: 'gainGold',
        params: { amount: 10 },
      },
    ],
  },
  {
    id: 'forge-of-the-damned',
    name: 'The Forge of the Damned',
    narrative:
      'An abandoned smithy stands at the crossroads, its furnace still burning with infernal flame. Tortured faces shift in the coals. The anvil hums with residual power. Whatever was forged here was made to destroy, but the tools remain, waiting for a new hand.',
    choices: [
      {
        label: 'Reforge a Card',
        description: 'Transform one of your cards, changing its nature entirely.',
        effectId: 'transformCard',
        params: {},
      },
      {
        label: 'Enhance a Weapon',
        description: 'Use the forge to strengthen a card in your pool.',
        effectId: 'upgradeCardValue',
        params: { amount: 8 },
      },
      {
        label: 'Douse the Flames',
        description: 'Extinguish the cursed forge. The fire tag is purged from one of your cards.',
        effectId: 'removeTagFromCard',
        params: { tag: 'Fire' },
      },
    ],
  },
  {
    id: 'faerie-circle',
    name: 'The Faerie Circle',
    narrative:
      'A ring of pale mushrooms glows beneath a canopy of twisted oaks. Tiny lights dance at the edge of your vision, and laughter like silver bells echoes from nowhere. The fae are capricious, their gifts as dangerous as their curses.',
    choices: [
      {
        label: 'Step Inside the Ring',
        description: 'The fae bless one of your cards with the Wild tag, but their magic is unpredictable.',
        effectId: 'addTagToCard',
        params: { tag: 'Wild' },
      },
      {
        label: 'Offer a Card as Tribute',
        description: 'Sacrifice a card to earn the fae\'s favor. They duplicate another card in return.',
        effectId: 'duplicateCard',
        params: {},
      },
      {
        label: 'Walk Away',
        description: 'You know better than to deal with the fair folk.',
        effectId: 'nothing',
        params: {},
      },
    ],
  },
  {
    id: 'flooded-ruins',
    name: 'The Flooded Ruins',
    narrative:
      'The river has swallowed what was once a proud fortress. Murky water laps at crumbling walls, and strange shapes move beneath the surface. The flood brought destruction, but also unearthed treasures long buried.',
    choices: [
      {
        label: 'Dive Below',
        description: 'Search the submerged ruins. Mark one of your cards with the Flood tag.',
        effectId: 'addTagToCard',
        params: { tag: 'Flood' },
      },
      {
        label: 'Salvage the Walls',
        description: 'Strengthen a card using materials from the ruins.',
        effectId: 'upgradeCardValue',
        params: { amount: 5 },
      },
    ],
  },
  {
    id: 'the-hermit',
    name: 'The Hermit of Ashen Peak',
    narrative:
      'High on a windswept ridge, a wizened figure sits cross-legged before a dying fire. His eyes are milky with age, yet they seem to see through you. He offers knowledge in exchange for sacrifice, wisdom for those willing to pay its price.',
    choices: [
      {
        label: 'Listen to His Teachings',
        description: 'Gain the Wizard tag on one of your cards.',
        effectId: 'addTagToCard',
        params: { tag: 'Wizard' },
      },
      {
        label: 'Trade Gold for Secrets',
        description: 'Pay the hermit for rare knowledge that strengthens your pool.',
        effectId: 'loseGold',
        params: { amount: 10 },
      },
      {
        label: 'Rob the Old Man',
        description: 'Take what he has by force. Gain gold, but lose two cards to his dying curse.',
        effectId: 'removeCardsFromPool',
        params: { count: 2 },
      },
    ],
  },
  {
    id: 'war-camp',
    name: 'The Abandoned War Camp',
    narrative:
      'Rows of tattered tents stretch across the muddy field, banners hanging limp in the rain. The army that camped here left in haste. Weapons, provisions, and orders lie scattered among the wreckage. Something drove them away, and it may still be nearby.',
    choices: [
      {
        label: 'Scavenge Supplies',
        description: 'Collect what was left behind. Gain gold from the abandoned provisions.',
        effectId: 'gainGold',
        params: { amount: 8 },
      },
      {
        label: 'Rally Stragglers',
        description: 'Grant the Army tag to one of your cards by recruiting deserters.',
        effectId: 'addTagToCard',
        params: { tag: 'Army' },
      },
    ],
  },
  {
    id: 'cursed-battlefield',
    name: 'The Cursed Battlefield',
    narrative:
      'The ground is scarred and blackened, littered with rusted weapons and bleached bones. The dead do not rest easy here. At dusk, ghostly soldiers rise from the earth, re-enacting a battle that ended centuries ago. Their spectral weapons still carry lethal intent.',
    choices: [
      {
        label: 'Command the Dead',
        description: 'Grant the Undead tag to one of your cards, binding a spirit to your service.',
        effectId: 'addTagToCard',
        params: { tag: 'Undead' },
      },
      {
        label: 'Loot the Fallen',
        description: 'Strip the battlefield of valuables. Remove three cards but gain a powerful rare card.',
        effectId: 'removeAndGainRare',
        params: { removeCount: 3 },
      },
      {
        label: 'Lay the Dead to Rest',
        description: 'Perform a rite of peace. All removed cards are restored to your pool.',
        effectId: 'fullHeal',
        params: {},
      },
    ],
  },
  {
    id: 'lightning-spire',
    name: 'The Lightning Spire',
    narrative:
      'A tower of black iron rises from the plains, its peak crackling with ceaseless lightning. The air tastes of metal and ozone. Inside, mechanisms of unknown origin grind and whir, channeling the storm\'s fury into something the builders intended but never completed.',
    choices: [
      {
        label: 'Harness the Storm',
        description: 'Infuse a card with the Weather tag, binding the storm\'s power to it.',
        effectId: 'addTagToCard',
        params: { tag: 'Weather' },
      },
      {
        label: 'Overload the Spire',
        description: 'Channel all the energy into one card, massively increasing its value.',
        effectId: 'upgradeCardValue',
        params: { amount: 12 },
      },
    ],
  },
  {
    id: 'beast-den',
    name: 'The Great Beast\'s Den',
    narrative:
      'Claw marks as wide as your arm score the entrance to a cave that reeks of musk and blood. Inside, a massive creature tends to its young. It eyes you warily but does not attack. Perhaps an understanding can be reached, or perhaps the pelts would fetch a fine price.',
    choices: [
      {
        label: 'Tame the Beast',
        description: 'Mark one of your cards with the Beast tag, gaining a powerful ally.',
        effectId: 'addTagToCard',
        params: { tag: 'Beast' },
      },
      {
        label: 'Hunt the Beast',
        description: 'Slay the creature and sell its remains. Gain a substantial amount of gold.',
        effectId: 'gainGold',
        params: { amount: 12 },
      },
      {
        label: 'Steal a Cub',
        description: 'Take one of the young. Duplicate a Beast card in your pool.',
        effectId: 'duplicateCard',
        params: {},
      },
    ],
  },
  {
    id: 'mirror-lake',
    name: 'The Mirror Lake',
    narrative:
      'The lake is perfectly still, reflecting a sky that does not match the one above. In the water\'s surface you see your cards laid out before you, but subtly different, as if the reflection shows what they could become rather than what they are.',
    choices: [
      {
        label: 'Reach Into the Reflection',
        description: 'Duplicate one card in your pool, pulling its mirror-self into reality.',
        effectId: 'duplicateCard',
        params: {},
      },
      {
        label: 'Shatter the Surface',
        description: 'Break the illusion. Remove a tag from one of your cards to reveal its true nature.',
        effectId: 'removeTagFromCard',
        params: { tag: 'Wild' },
      },
    ],
  },
  {
    id: 'throne-room',
    name: 'The Crumbling Throne Room',
    narrative:
      'Dust motes dance in shafts of pale light that pierce the ruined ceiling. A throne of carved stone sits upon a dais, its velvet rotted away. A crown rests on the seat, tarnished but intact. The weight of leadership is not for everyone, but power answers to those who dare claim it.',
    choices: [
      {
        label: 'Claim the Crown',
        description: 'Grant the Leader tag to one of your cards, asserting dominion.',
        effectId: 'addTagToCard',
        params: { tag: 'Leader' },
      },
      {
        label: 'Melt the Crown for Gold',
        description: 'The crown is worth a fortune in raw metal.',
        effectId: 'gainGold',
        params: { amount: 10 },
      },
      {
        label: 'Search the Treasury',
        description: 'The throne room surely has a vault. Sacrifice one card to find a rare treasure.',
        effectId: 'removeAndGainRare',
        params: { removeCount: 1 },
      },
    ],
  },
  {
    id: 'volcanic-rift',
    name: 'The Volcanic Rift',
    narrative:
      'The earth has split open, revealing a river of molten rock that flows sluggishly through a canyon of obsidian. The heat is unbearable. Salamanders of living flame skitter across the lava\'s surface, and the air shimmers with raw elemental power.',
    choices: [
      {
        label: 'Forge in Lava',
        description: 'Temper a card in the volcanic fire, granting it the Fire tag.',
        effectId: 'addTagToCard',
        params: { tag: 'Fire' },
      },
      {
        label: 'Mine Obsidian',
        description: 'Harvest the volcanic glass to enhance a card\'s value.',
        effectId: 'upgradeCardValue',
        params: { amount: 6 },
      },
    ],
  },
  {
    id: 'ancient-library',
    name: 'The Sunken Library',
    narrative:
      'Beneath the roots of an enormous tree lies a library carved into living rock. Shelves of petrified wood hold scrolls that predate the current age. A spectral librarian drifts between the stacks, cataloguing texts that no living soul has read in millennia. Knowledge is power, but some books are better left closed.',
    choices: [
      {
        label: 'Study the Forbidden Texts',
        description: 'Transform one of your cards, altering its fundamental nature.',
        effectId: 'transformCard',
        params: {},
      },
      {
        label: 'Copy a Scroll',
        description: 'Duplicate one of your existing cards using ancient transcription magic.',
        effectId: 'duplicateCard',
        params: {},
      },
      {
        label: 'Sell the Knowledge',
        description: 'Take several scrolls to sell. The scholars will pay handsomely.',
        effectId: 'gainGold',
        params: { amount: 8 },
      },
    ],
  },
  {
    id: 'crossroads-deal',
    name: 'The Crossroads Deal',
    narrative:
      'At midnight, where three roads meet, a figure waits beneath a dead oak. It wears a face that shifts like smoke, and when it speaks, its voice comes from every direction at once. It offers power, but its bargains are never quite what they seem.',
    choices: [
      {
        label: 'Accept the Bargain',
        description: 'Sacrifice three cards from your pool. In return, gain tremendous power: a rare card and gold.',
        effectId: 'removeAndGainRare',
        params: { removeCount: 3 },
      },
      {
        label: 'Counter-Offer',
        description: 'Lose some gold, but gain the ability to upgrade a card significantly.',
        effectId: 'loseGold',
        params: { amount: 8 },
      },
      {
        label: 'Refuse and Walk Away',
        description: 'Some deals are not worth making. You leave the crossroads unscathed.',
        effectId: 'nothing',
        params: {},
      },
    ],
  },
];

export const EVENT_DEF_MAP: Map<string, EventDef> = new Map(
  EVENT_DEFS.map((e) => [e.id, e]),
);
