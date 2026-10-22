/** Odd feats. Not one per fabrication, and not the belt's basic goals. */

import { countItem } from './items.js';
import { mainStarUp } from './star.js';

export const MILESTONES = [
  { id: 'star-halo', title: 'Halo', text: 'You flew the light around a star.' },
  { id: 'alien-break', title: 'First wreck', text: 'An alien broke, and its part is still falling.' },
  { id: 'alien-part', title: 'Strange cargo', text: 'An alien part is sitting in the hold.' },
  { id: 'core-cannon', title: 'Heavy hand', text: 'The core cannon left the ship.' },
  { id: 'layer-far', title: 'Thin belt', text: 'This layer is a long way from the arrival.' },
  { id: 'full-ore', title: 'Whole belt', text: 'Pale, slate, amber, virid, and glint are all aboard.' },
  { id: 'low-repair', title: 'Held together', text: 'You patched the hull while it was almost gone.' },
  { id: 'fast', title: 'Past the line', text: 'The ship broke five hundred.' },
  { id: 'comet', title: 'Caught the tail', text: 'Comet dust is in the hold.' },
  { id: 'stronghold', title: 'Opened the ruin', text: 'Something in a stronghold is yours.' },
  { id: 'wall', title: 'First wall', text: 'A wall is standing where you put it.' },
  { id: 'star-rise', title: 'Dawn watch', text: 'You were flying when the sun came up.' },
  { id: 'quiet-debris', title: 'Soft through scrap', text: 'Quiet running carried you through the debris.' },
  { id: 'golem-lived', title: 'Stood the charge', text: 'The golem hit, and the hull held.' },
];

const ORES = ['pale', 'slate', 'amber', 'virid', 'glint'];
const PARTS = ['gland', 'fiber', 'shard', 'lamp', 'servo', 'spike', 'chart', 'core'];

export function grantMilestone(state, id) {
  if (!state || !id) return false;
  if (!state.milestones || typeof state.milestones !== 'object') state.milestones = {};
  if (state.milestones[id]) return false;
  const row = MILESTONES.find((item) => item.id === id);
  if (!row) return false;
  state.milestones[id] = true;
  if (!state.notices) state.notices = [];
  const noticeId = Number.isFinite(state.nextId) ? state.nextId++ : Date.now();
  state.notices.push({
    id: noticeId,
    text: row.title + '. ' + row.text,
    time: 4.4,
    kind: 'milestone',
  });
  if (state.notices.length > 3) state.notices.splice(0, state.notices.length - 3);
  return true;
}

/** Cheap checks that can be true just by flying. Event feats are granted where they happen. */
export function reviewMilestones(state) {
  if (!state || !state.ship || state.mode === 'title') return;
  const speed = Math.hypot(state.ship.vx || 0, state.ship.vy || 0);
  if (speed > 500) grantMilestone(state, 'fast');
  if (Math.abs(Number(state.layer) || 0) >= 3) grantMilestone(state, 'layer-far');
  if (ORES.every((id) => countItem(state, id) > 0)) grantMilestone(state, 'full-ore');
  if (PARTS.some((id) => countItem(state, id) > 0)) grantMilestone(state, 'alien-part');
  if (countItem(state, 'comet') > 0) grantMilestone(state, 'comet');
  if (state.mode !== 'fly') return;
  const up = mainStarUp(state.seed, state.clock);
  if (state.starWasUp === false && up) grantMilestone(state, 'star-rise');
  state.starWasUp = up;
}
