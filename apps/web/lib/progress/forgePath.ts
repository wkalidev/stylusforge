import type { SkillNode } from './skillTree';

/** A segment of the path between two rows: heated, cold, or absent (before the first row, after the last). */
export type Heat = 'hot' | 'cold' | null;

/** Where the path enters a row (from the row above) and leaves it (to the row below). */
export interface RowHeat {
  in: Heat;
  out: Heat;
}

export interface PathNode extends RowHeat {
  node: SkillNode;
}

export interface PathZone {
  id: string;
  name: string;
  /** The forge zone the module is shown as. */
  zone: string;
  /** 1-based position of the module in the curriculum. */
  index: number;
  header: RowHeat;
  nodes: PathNode[];
  /** Lessons of the module passed in this browser. */
  passed: number;
  /** Lessons of the module, written or not. */
  total: number;
  /**
   * complete: every lesson passed; open: at least one lesson passed or available;
   * locked: nothing to start yet (or no lesson listed).
   */
  state: 'complete' | 'open' | 'locked';
}

interface ModuleInput {
  id: string;
  name: string;
  zone: string;
}

/**
 * Lays the skill tree out as one continuous path through the forge zones: each module's header,
 * then its lessons. A segment is heated when the lesson before it is passed and the lesson after
 * it is open, so heat runs from passed lessons into the lessons they unlock, across zone headers.
 */
export function forgePath(modules: readonly ModuleInput[], nodes: readonly SkillNode[]): PathZone[] {
  type Row = { node: SkillNode | null };
  const rows: Row[] = [];
  const zones = modules.map((module, index) => {
    const header: Row = { node: null };
    const lessonRows = nodes.filter((node) => node.lesson.module === module.id).map((node): Row => ({ node }));
    rows.push(header, ...lessonRows);
    return { module, index: index + 1, header, lessonRows };
  });

  // Heat of the segment between rows[i] and rows[i + 1].
  const link = (i: number): Heat => {
    if (i < 0 || i + 1 >= rows.length) return null;
    const before = rows.slice(0, i + 1).findLast((row) => row.node)?.node;
    const after = rows.slice(i + 1).find((row) => row.node)?.node;
    return before?.state === 'completed' && after && after.state !== 'locked' ? 'hot' : 'cold';
  };
  const heatOf = (row: Row): RowHeat => {
    const i = rows.indexOf(row);
    return { in: link(i - 1), out: link(i) };
  };

  return zones.map(({ module, index, header, lessonRows }) => {
    const moduleNodes = lessonRows.map((row) => row.node as SkillNode);
    const passed = moduleNodes.filter((node) => node.state === 'completed').length;
    const total = moduleNodes.length;
    const state =
      total > 0 && passed === total ? 'complete' : moduleNodes.some((node) => node.state !== 'locked') ? 'open' : 'locked';
    return {
      id: module.id,
      name: module.name,
      zone: module.zone,
      index,
      header: heatOf(header),
      nodes: moduleNodes.map((node, i) => ({ node, ...heatOf(lessonRows[i]) })),
      passed,
      total,
      state,
    };
  });
}
