/** Global game constants */

export const COLORS = {
  parchment50: 0xfaf6ee,
  parchment100: 0xf3e8cc,
  parchment200: 0xe8d9b0,
  parchment300: 0xd4c49a,
  parchment400: 0xb8a678,
  parchment500: 0x9c8a5c,
  parchment600: 0x7a6b42,
  parchment700: 0x5c4f30,
  parchment800: 0x3e351f,
  ink: 0x2c1810,
  inkMuted: 0x6b5c4e,
  white: 0xffffff,
  black: 0x000000,
  tag: {
    Beast: 0x4a7c59,
    Fire: 0xc4433a,
    Weather: 0x6b8cae,
    Leader: 0xc9a227,
    Weapon: 0x8b8b8b,
    Land: 0x8b6d3f,
    Wild: 0x7b4fa0,
    Flood: 0x2d6a8f,
    Army: 0x8b2500,
    Artifact: 0xc49a27,
    Wizard: 0x5b3fa0,
    Undead: 0x6b3a6b,
  } as Record<string, number>,
  bonus: 0x22c55e,
  penalty: 0xc4433a,
} as const;

export const CARD = {
  WIDTH: 120,
  HEIGHT: 168,
  BORDER_RADIUS: 8,
  BORDER_WIDTH: 2,
} as const;

export const FONTS = {
  display: 'MedievalSharp',
  body: 'Crimson Text',
  card: 'Nunito, Segoe UI, Arial, sans-serif',
} as const;

export const LAYOUT = {
  MAX_WIDTH: 1200,
} as const;

export const DURATION = {
  cardDraw: 400,
  cardDiscard: 300,
  cardFlip: 250,
  springIn: 350,
  fadeOut: 200,
  hoverEnlarge: 150,
  sceneTransition: 300,
} as const;
