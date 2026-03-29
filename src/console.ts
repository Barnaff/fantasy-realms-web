import Phaser from 'phaser';
import { GameManager } from './phaser/systems/GameManager.ts';
import { CARD_DEF_MAP, CARD_DEFS } from './data/cards.ts';
import type { CardInstance } from './types/card.ts';
import type { GamePhase } from './types/game.ts';

function gm() {
  return GameManager.getInstance();
}

const PHASE_TO_SCENE: Partial<Record<GamePhase, string>> = {
  title: 'TitleScene',
  draft_pick: 'DraftScene',
  map: 'MapScene',
  player_turn: 'EncounterScene',
  boss_intro: 'BossIntroScene',
  scoring: 'ScoringScene',
  post_encounter: 'PostEncounterScene',
  merchant: 'MerchantScene',
  event: 'EventScene',
  rest: 'RestScene',
  game_over: 'GameOverScene',
};

function syncScene() {
  const phaserGame = (window as any).__PHASER_GAME__ as Phaser.Game | undefined;
  if (!phaserGame) return;
  const sceneName = PHASE_TO_SCENE[gm().state.phase];
  if (!sceneName) return;
  const active = phaserGame.scene.getScenes(true)[0];
  if (active && active.scene.key !== sceneName) {
    active.scene.start(sceneName);
  }
}

function cardName(c: CardInstance): string {
  const def = CARD_DEF_MAP.get(c.defId);
  return def ? `${def.name} [${def.tags.join(',')}] (${def.baseValue}pts, ${def.rarity})` : c.defId;
}

function cardShort(c: CardInstance): string {
  const def = CARD_DEF_MAP.get(c.defId);
  return def ? def.name : c.defId;
}

const api = {
  // ── State inspection ──

  state: () => gm().state,

  phase: () => gm().state.phase,

  hand: () => {
    const cards = gm().state.hand.cards;
    if (!cards.length) return 'Hand is empty';
    return cards.map((c, i) => `[${i}] ${cardName(c)}`).join('\n');
  },

  river: () => {
    const river = gm().state.river;
    if (!river) return 'No river';
    const lines = river.cards.map((c, i) => `[${i}] ${cardName(c)}`);
    lines.push(`--- Deck: ${river.deck.length} cards remaining`);
    return lines.join('\n');
  },

  pool: () => {
    const pool = gm().state.run?.pool;
    if (!pool) return 'No active run';
    return pool.map((c, i) => `[${i}] ${cardName(c)}`).join('\n');
  },

  gold: () => gm().state.run?.gold ?? 'No active run',

  score: () => {
    const result = gm().getLiveScore();
    if (!result) return 'No score available';
    const lines = [`Total: ${result.totalScore}`];
    for (const b of result.breakdown) {
      lines.push(`  ${b.cardName}: ${b.finalValue}${b.blanked ? ' (BLANKED)' : ''}`);
    }
    return lines.join('\n');
  },

  nodes: () => {
    const available = gm().getAvailableMapNodes();
    if (!available.length) return 'No available nodes';
    return available.map(n => `${n.id} (${n.type})`).join('\n');
  },

  map: () => {
    const map = gm().state.run?.map;
    if (!map) return 'No active run';
    const current = gm().state.run!.currentNodeId;
    const lines = [`Act ${map.act}/${map.totalActs} | Current: ${current}`];
    for (const layer of map.layers) {
      for (const node of layer.nodes) {
        const marker = node.id === current ? ' <<' : node.visited ? ' (visited)' : '';
        lines.push(`  ${node.id} (${node.type})${marker}`);
      }
    }
    return lines.join('\n');
  },

  merchant: () => {
    const stock = gm().merchantStock;
    if (!stock) return 'Not in merchant';
    const lines = ['Cards:'];
    for (const c of stock.cards) {
      const def = CARD_DEF_MAP.get(c.defId);
      lines.push(`  ${c.defId} "${def?.name}" - ${c.price}g`);
    }
    lines.push('Relics:');
    for (const r of stock.relics) {
      lines.push(`  ${r.defId} - ${r.price}g`);
    }
    lines.push(`Card removal: ${stock.removalCost}g`);
    return lines.join('\n');
  },

  relics: () => {
    const relics = gm().state.relics;
    if (!relics.length) return 'No relics';
    return relics.map(r => r.defId).join('\n');
  },

  encounter: () => {
    const enc = gm().state.encounter;
    if (!enc) return 'No encounter';
    const lines = [
      `${enc.name}${enc.isBoss ? ' (BOSS)' : ''}`,
      `Target: ${enc.scoreThreshold}`,
      `Discards: ${gm().state.riverDiscardCount}/10`,
      `Turn phase: ${gm().state.turnPhase}`,
    ];
    if (enc.modifiers?.length) {
      lines.push('Modifiers:');
      for (const m of enc.modifiers) lines.push(`  ${m.tag}: ${m.value > 0 ? '+' : ''}${m.value}`);
    }
    return lines.join('\n');
  },

  draft: (optionIndex: number) => {
    const options = gm().state.draftOptions;
    if (!options) return 'Not in draft phase';
    if (optionIndex < 0 || optionIndex >= options.length) return `Invalid option. Choose 0-${options.length - 1}`;
    const option = options[optionIndex];
    gm().selectDraftOption(option.id);
    syncScene();
    return `Drafted: ${option.cardIds.map(id => CARD_DEF_MAP.get(id)?.name ?? id).join(', ')}`;
  },

  drafts: () => {
    const options = gm().state.draftOptions;
    if (!options) return 'Not in draft phase';
    return options.map((o, i) => {
      const names = o.cardIds.map(id => CARD_DEF_MAP.get(id)?.name ?? id).join(', ');
      return `[${i}] ${names}`;
    }).join('\n');
  },

  // ── Run management ──

  newGame: (seed?: number) => { gm().newGame(seed); syncScene(); return `New game started (seed: ${gm().state.run?.seed})`; },
  forfeit: () => { gm().forfeitRun(); syncScene(); return 'Run forfeited'; },
  title: () => { gm().resetToTitle(); syncScene(); return 'Back to title'; },

  // ── Map navigation ──

  go: (nodeId: string) => {
    gm().selectMapNode(nodeId);
    syncScene();
    return `Moved to ${nodeId} → phase: ${gm().state.phase}`;
  },

  // ── Encounter actions ──

  draw: (riverIndex: number) => {
    const card = gm().state.river?.cards[riverIndex];
    gm().drawCard(riverIndex);
    return card ? `Drew: ${cardShort(card)}` : 'Invalid index';
  },

  drawDeck: () => {
    gm().drawFromDeckAction();
    const hand = gm().state.hand.cards;
    return `Drew from deck: ${cardShort(hand[hand.length - 1])}`;
  },

  discard: (handIndex: number) => {
    const card = gm().state.hand.cards[handIndex];
    const name = card ? cardShort(card) : '?';
    gm().discardCard(handIndex);
    syncScene();
    return `Discarded: ${name} → phase: ${gm().state.phase}, turnPhase: ${gm().state.turnPhase}`;
  },

  reorder: (from: number, to: number) => { gm().reorderHand(from, to); return 'Hand reordered'; },
  finalize: () => { gm().finalizeHand(); syncScene(); return 'Hand finalized → scoring'; },
  ack: () => { gm().acknowledgeScore(); syncScene(); return `Score acknowledged → phase: ${gm().state.phase}`; },

  // ── Post-encounter ──

  rewards: () => {
    const reward = gm().state.postEncounterReward;
    if (!reward) return 'No rewards available';
    const lines = [`Gold: +${reward.gold}`];
    for (let i = 0; i < reward.cardChoices.length; i++) {
      const opt = reward.cardChoices[i];
      const names = opt.cards.map(id => CARD_DEF_MAP.get(id)?.name ?? id).join(', ');
      lines.push(`[${i}] ${names}`);
    }
    if (reward.relicChoice) lines.push(`Relic: ${reward.relicChoice}`);
    return lines.join('\n');
  },

  reward: (optionIndex: number) => {
    gm().selectCardReward(optionIndex);
    syncScene();
    return `Reward selected → phase: ${gm().state.phase}`;
  },

  skip: () => { gm().skipCardReward(); syncScene(); return 'Reward skipped'; },

  // ── Merchant ──

  buy: (cardDefId: string, price: number) => { gm().merchantBuyCard(cardDefId, price); return `Bought ${cardDefId}`; },
  buyRelic: (relicId: string, price: number) => { gm().merchantBuyRelic(relicId, price); return `Bought relic ${relicId}`; },
  remove: (instanceId: string) => { gm().merchantRemoveCard(instanceId); return `Removed ${instanceId}`; },
  leave: () => {
    if (gm().state.phase === 'merchant') gm().leaveMerchant();
    else if (gm().state.phase === 'rest') gm().leaveRest();
    else return 'Not in merchant or rest';
    syncScene();
    return `Left → phase: ${gm().state.phase}`;
  },

  // ── Events ──

  event: (choiceIndex: number) => { gm().selectEventChoice(choiceIndex); syncScene(); return `Event choice ${choiceIndex} selected`; },

  // ── Cheats ──

  win: () => { gm().cheatWin(); syncScene(); return 'Cheat win activated'; },
  lose: () => { gm().cheatLose(); syncScene(); return 'Cheat lose activated'; },
  reroll: () => { gm().cheatRerollHand(); return 'Hand rerolled'; },

  setHand: (...defIds: string[]) => {
    if (!gm().state.river) return 'No active encounter';
    const cards = defIds.map((id, i) => {
      if (!CARD_DEF_MAP.has(id)) return null;
      return { instanceId: `cheat_hand_${i}_${Date.now()}`, defId: id, modifiers: [] } as CardInstance;
    }).filter(Boolean) as CardInstance[];
    if (cards.length === 0) return 'No valid card IDs. Use game.cards() to list.';
    gm().state.hand = { ...gm().state.hand, cards };
    gm().events.emit('stateChanged', gm().state);
    gm().events.emit('handChanged', gm().state);
    return `Hand set to: ${cards.map(c => cardShort(c)).join(', ')}`;
  },

  setRiver: (...defIds: string[]) => {
    if (!gm().state.river) return 'No active encounter';
    const cards = defIds.map((id, i) => {
      if (!CARD_DEF_MAP.has(id)) return null;
      return { instanceId: `cheat_river_${i}_${Date.now()}`, defId: id, modifiers: [] } as CardInstance;
    }).filter(Boolean) as CardInstance[];
    gm().state.river = { ...gm().state.river!, cards };
    gm().events.emit('stateChanged', gm().state);
    return `River set to: ${cards.map(c => cardShort(c)).join(', ')}`;
  },

  addToHand: (defId: string) => {
    if (!CARD_DEF_MAP.has(defId)) return `Unknown card "${defId}". Use game.cards() to list.`;
    if (!gm().state.river) return 'No active encounter';
    const card: CardInstance = { instanceId: `cheat_add_${Date.now()}`, defId, modifiers: [] };
    gm().state.hand = { ...gm().state.hand, cards: [...gm().state.hand.cards, card] };
    gm().events.emit('stateChanged', gm().state);
    gm().events.emit('handChanged', gm().state);
    return `Added ${CARD_DEF_MAP.get(defId)?.name} to hand`;
  },

  addToRiver: (defId: string) => {
    if (!CARD_DEF_MAP.has(defId)) return `Unknown card "${defId}". Use game.cards() to list.`;
    if (!gm().state.river) return 'No active encounter';
    const card: CardInstance = { instanceId: `cheat_river_${Date.now()}`, defId, modifiers: [] };
    gm().state.river = { ...gm().state.river!, cards: [...gm().state.river!.cards, card] };
    gm().events.emit('stateChanged', gm().state);
    return `Added ${CARD_DEF_MAP.get(defId)?.name} to river`;
  },

  addToDeck: (defId: string) => {
    if (!CARD_DEF_MAP.has(defId)) return `Unknown card "${defId}". Use game.cards() to list.`;
    if (!gm().state.river) return 'No active encounter';
    const card: CardInstance = { instanceId: `cheat_deck_${Date.now()}`, defId, modifiers: [] };
    gm().state.river = { ...gm().state.river!, deck: [card, ...gm().state.river!.deck] };
    gm().events.emit('stateChanged', gm().state);
    return `Added ${CARD_DEF_MAP.get(defId)?.name} to top of deck`;
  },

  cards: (filter?: string) => {
    let list = CARD_DEFS;
    if (filter) {
      const f = filter.toLowerCase();
      list = list.filter(c => c.id.includes(f) || c.name.toLowerCase().includes(f) || c.tags.some(t => t.toLowerCase().includes(f)));
    }
    return list.map(c => `${c.id} — ${c.name} [${c.tags.join(',')}] (${c.baseValue}pts, ${c.rarity})`).join('\n');
  },

  // ── Help ──

  help: () => {
    const lines = [
      '=== Fantasy Realms Console Commands ===',
      '',
      'INSPECT:',
      '  game.phase()           Current phase',
      '  game.hand()            Hand cards with indices',
      '  game.river()           River cards with indices',
      '  game.pool()            Card pool',
      '  game.gold()            Current gold',
      '  game.score()           Live score breakdown',
      '  game.encounter()       Current encounter info',
      '  game.nodes()           Available map nodes',
      '  game.map()             Full map overview',
      '  game.merchant()        Merchant stock',
      '  game.relics()          Owned relics',
      '  game.drafts()          Draft options',
      '  game.rewards()         Reward options',
      '  game.state()           Raw GameState object',
      '',
      'RUN:',
      '  game.newGame(seed?)    Start new run',
      '  game.draft(index)      Pick draft option',
      '  game.forfeit()         Forfeit run',
      '  game.title()           Back to title',
      '',
      'MAP:',
      '  game.go(nodeId)        Navigate to map node',
      '',
      'ENCOUNTER:',
      '  game.draw(riverIdx)    Draw from river',
      '  game.drawDeck()        Draw from deck',
      '  game.discard(handIdx)  Discard from hand',
      '  game.reorder(from,to)  Reorder hand',
      '  game.finalize()        End encounter early',
      '  game.ack()             Acknowledge score',
      '',
      'REWARDS:',
      '  game.reward(index)     Pick reward option',
      '  game.skip()            Skip reward',
      '',
      'MERCHANT:',
      '  game.buy(defId,price)  Buy card',
      '  game.buyRelic(id,price) Buy relic',
      '  game.remove(instId)    Remove card from pool',
      '  game.leave()           Leave merchant/rest',
      '',
      'EVENTS:',
      '  game.event(index)      Pick event choice',
      '',
      'CHEATS:',
      '  game.win()             Instant win encounter',
      '  game.lose()            Instant lose encounter',
      '  game.reroll()          Reroll hand/river',
      '  game.setHand(id,...)   Replace hand with cards',
      '  game.setRiver(id,...)  Replace river with cards',
      '  game.addToHand(id)     Add card to hand',
      '  game.addToRiver(id)    Add card to river',
      '  game.addToDeck(id)     Add card to top of deck',
      '  game.cards(filter?)    List all card IDs',
    ];
    return lines.join('\n');
  },
};

(window as any).game = api;
console.log('[Console] game commands loaded. Type game.help() for usage.');
