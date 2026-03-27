import type { Tag } from '../../types/card.ts';

/** Hex colors for each tag, used in Phaser rendering. */
export const TAG_COLORS: Record<Tag, number> = {
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
};

/** Fallback art texture key for each tag. */
export const TAG_ART_FALLBACK: Record<Tag, string> = {
  Beast: 'art-phoenix',
  Fire: 'art-phoenix',
  Weather: 'art-great-flood',
  Leader: 'art-archmage',
  Weapon: 'art-enchanted-blade',
  Land: 'art-great-flood',
  Wild: 'art-archmage',
  Flood: 'art-great-flood',
  Army: 'art-lich-lord',
  Artifact: 'art-enchanted-blade',
  Wizard: 'art-archmage',
  Undead: 'art-lich-lord',
};
