import type { Lesson } from '@/lib/curriculum/lessons';
import { MODULES } from '@/lib/curriculum/modules';
import { zoneOf, type Zone } from './zones';

/**
 * What a lesson's card shows: its certificate (claimed), a claim prompt (passed in this browser
 * and registered on-chain, not claimed yet), a locked card, or a coming-soon card for a lesson
 * that is not available yet.
 */
export type CardState = 'claimed' | 'ready' | 'locked' | 'soon';

export interface CollectionCard {
  lesson: Lesson;
  state: CardState;
}

export interface CollectionGroup {
  zone: Zone;
  /** Every lesson of the module, in curriculum order, claimed or not. */
  cards: CollectionCard[];
  claimed: number;
  /** Available lessons of the module: the certificates that can be collected today. */
  available: number;
}

export interface Collection {
  groups: CollectionGroup[];
  claimed: number;
  available: number;
}

/**
 * The certificate collection, one group per module that has lessons, each in curriculum order
 * with locked cards where they fall (not claimed ones first).
 */
export function certificateCollection(claimed: ReadonlySet<number>, ready: ReadonlySet<number>): Collection {
  const groups = MODULES.filter((module) => module.lessons.length > 0).map((module): CollectionGroup => {
    const cards = module.lessons.map((lesson): CollectionCard => {
      if (!lesson.available) return { lesson, state: 'soon' };
      if (claimed.has(lesson.id)) return { lesson, state: 'claimed' };
      return { lesson, state: ready.has(lesson.id) ? 'ready' : 'locked' };
    });
    return {
      zone: zoneOf(module.id),
      cards,
      claimed: cards.filter((card) => card.state === 'claimed').length,
      available: module.lessons.filter((lesson) => lesson.available).length,
    };
  });
  return {
    groups,
    claimed: groups.reduce((sum, group) => sum + group.claimed, 0),
    available: groups.reduce((sum, group) => sum + group.available, 0),
  };
}
