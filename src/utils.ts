import { v4 as uuidv4 } from 'uuid';
import type { Guest, Plan } from './types';
import { TAG_OPTIONS } from './types';

export function generateId(): string {
  return uuidv4();
}

export function createEmptyPlan(name = '未命名方案'): Plan {
  return {
    id: generateId(),
    name,
    tables: [],
    guests: [],
    rules: [],
    updatedAt: Date.now(),
  };
}

export function clonePlan(plan: Plan): Plan {
  return JSON.parse(JSON.stringify(plan));
}

export function getConflictMap(plan: Plan): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const { tables, rules } = plan;

  for (const rule of rules) {
    if (rule.type === 'apart') {
      for (const table of tables) {
        const hasA = table.seatOrder.includes(rule.a);
        const hasB = table.seatOrder.includes(rule.b);
        if (hasA && hasB) {
          if (!map.has(rule.a)) map.set(rule.a, []);
          if (!map.has(rule.b)) map.set(rule.b, []);
          if (!map.get(rule.a)!.includes(rule.b)) map.get(rule.a)!.push(rule.b);
          if (!map.get(rule.b)!.includes(rule.a)) map.get(rule.b)!.push(rule.a);
        }
      }
    } else if (rule.type === 'separate') {
      for (const table of tables) {
        const hasA = table.seatOrder.includes(rule.a);
        const hasB = table.seatOrder.includes(rule.b);
        if (hasA && hasB) {
          if (!map.has(rule.a)) map.set(rule.a, []);
          if (!map.has(rule.b)) map.set(rule.b, []);
          if (!map.get(rule.a)!.includes(rule.b)) map.get(rule.a)!.push(rule.b);
          if (!map.get(rule.b)!.includes(rule.a)) map.get(rule.b)!.push(rule.a);
        }
      }
    } else if (rule.type === 'together') {
      let same = false;
      for (const table of tables) {
        const hasA = table.seatOrder.includes(rule.a);
        const hasB = table.seatOrder.includes(rule.b);
        if (hasA && hasB) same = true;
      }
      if (!same) {
        const ta = tables.find((t) => t.seatOrder.includes(rule.a));
        const tb = tables.find((t) => t.seatOrder.includes(rule.b));
        if (ta && tb && ta.id !== tb.id) {
          if (!map.has(rule.a)) map.set(rule.a, []);
          if (!map.has(rule.b)) map.set(rule.b, []);
          if (!map.get(rule.a)!.includes(rule.b)) map.get(rule.a)!.push(rule.b);
          if (!map.get(rule.b)!.includes(rule.a)) map.get(rule.b)!.push(rule.a);
        }
      }
    }
  }
  return map;
}

export function getTableStats(plan: Plan) {
  let seated = 0;
  let capacity = 0;
  let emptySeats = 0;
  const unassigned = plan.guests.filter((g) => {
    const atTable = plan.tables.some((t) => t.seatOrder.includes(g.id));
    return !atTable;
  });
  for (const t of plan.tables) {
    seated += t.seatOrder.length;
    capacity += t.capacity;
    emptySeats += Math.max(0, t.capacity - t.seatOrder.length);
  }
  return { seated, capacity, emptySeats, totalGuests: plan.guests.length, unassignedCount: unassigned.length };
}

/* ---------- 统计条：按标签统计 / 缺口提醒 / 扎堆提醒 / 点击筛选 ---------- */

/** 统计条上每一项对应的列表筛选条件 */
export type StatsFilter =
  | { kind: 'all' }
  | { kind: 'seated' }
  | { kind: 'unassigned' }
  | { kind: 'tag'; tag: string }
  | { kind: 'childSeat' }
  | { kind: 'vegetarian' }
  | { kind: 'cluster'; tableId: string; tag: string };

export function sameStatsFilter(a: StatsFilter | null, b: StatsFilter | null): boolean {
  if (!a || !b) return a === b;
  if (a.kind !== b.kind) return false;
  if (a.kind === 'tag' && b.kind === 'tag') return a.tag === b.tag;
  if (a.kind === 'cluster' && b.kind === 'cluster') return a.tableId === b.tableId && a.tag === b.tag;
  return true;
}

export function getSeatedIds(plan: Plan): Set<string> {
  const ids = new Set<string>();
  for (const t of plan.tables) for (const gid of t.seatOrder) ids.add(gid);
  return ids;
}

export type TagStat = { tag: string; total: number; seated: number; unassigned: number };

/** 每个标签：总人数 / 已入座 / 未安排。只返回有宾客在用的标签。 */
export function getTagStats(plan: Plan, seatedIds: Set<string>): TagStat[] {
  const allTags = [...TAG_OPTIONS];
  for (const g of plan.guests) {
    for (const t of g.tags) if (!allTags.includes(t)) allTags.push(t);
  }
  const stats: TagStat[] = [];
  for (const tag of allTags) {
    const withTag = plan.guests.filter((g) => g.tags.includes(tag));
    if (withTag.length === 0) continue;
    const seated = withTag.filter((g) => seatedIds.has(g.id)).length;
    stats.push({ tag, total: withTag.length, seated, unassigned: withTag.length - seated });
  }
  return stats;
}

/** 儿童椅：总需求、缺口（需要椅子但还没座位的人）、已分布到几桌 */
export function getChildSeatStats(plan: Plan, seatedIds: Set<string>) {
  const need = plan.guests.filter((g) => g.childSeat);
  const unseated = need.filter((g) => !seatedIds.has(g.id)).length;
  let tables = 0;
  for (const t of plan.tables) {
    if (t.seatOrder.some((gid) => need.some((g) => g.id === gid))) tables++;
  }
  return { needed: need.length, unseated, tables };
}

/** 素食：总人数、已入座人数分布到几桌、超出「每桌一份」的差额、未安排人数 */
export function getVegetarianStats(plan: Plan, seatedIds: Set<string>) {
  const veg = plan.guests.filter((g) => g.tags.includes('素食'));
  const seatedVeg = veg.filter((g) => seatedIds.has(g.id));
  let tables = 0;
  for (const t of plan.tables) {
    if (t.seatOrder.some((gid) => seatedVeg.some((g) => g.id === gid))) tables++;
  }
  return {
    total: veg.length,
    seated: seatedVeg.length,
    unseated: veg.length - seatedVeg.length,
    tables,
    extra: seatedVeg.length - tables,
  };
}

export type ClusterWarning = { tableId: string; tableLabel: string; tag: string; count: number; seated: number };

/** 某一桌上同一标签 ≥4 人且占比 ≥70% 视为明显扎堆 */
export function getClusterWarnings(plan: Plan): ClusterWarning[] {
  const warnings: ClusterWarning[] = [];
  const byId = new Map(plan.guests.map((g) => [g.id, g]));
  for (const table of plan.tables) {
    const seated = table.seatOrder.length;
    if (seated < 4) continue;
    const tagCount = new Map<string, number>();
    for (const gid of table.seatOrder) {
      const g = byId.get(gid);
      if (!g) continue;
      for (const tag of g.tags) tagCount.set(tag, (tagCount.get(tag) || 0) + 1);
    }
    for (const [tag, count] of tagCount) {
      if (count >= 4 && count / seated >= 0.7) {
        warnings.push({ tableId: table.id, tableLabel: table.label, tag, count, seated });
      }
    }
  }
  return warnings;
}

export function matchStatsFilter(guest: Guest, filter: StatsFilter, plan: Plan, seatedIds: Set<string>): boolean {
  switch (filter.kind) {
    case 'all':
      return true;
    case 'seated':
      return seatedIds.has(guest.id);
    case 'unassigned':
      return !seatedIds.has(guest.id);
    case 'tag':
      return guest.tags.includes(filter.tag);
    case 'childSeat':
      return !!guest.childSeat;
    case 'vegetarian':
      return guest.tags.includes('素食');
    case 'cluster': {
      const table = plan.tables.find((t) => t.id === filter.tableId);
      return !!table && table.seatOrder.includes(guest.id) && guest.tags.includes(filter.tag);
    }
  }
}

export function describeStatsFilter(filter: StatsFilter, plan: Plan): string {
  switch (filter.kind) {
    case 'all':
      return '全部宾客';
    case 'seated':
      return '已入座';
    case 'unassigned':
      return '未分配';
    case 'tag':
      return `标签「${filter.tag}」`;
    case 'childSeat':
      return '需要儿童椅';
    case 'vegetarian':
      return '素食宾客';
    case 'cluster': {
      const t = plan.tables.find((tt) => tt.id === filter.tableId);
      return `「${t?.label || '已删除的桌'}」的「${filter.tag}」`;
    }
  }
}

export function parseGuestsText(text: string): { name: string; tags: string[] }[] {
  const lines = text.split(/\n|，|,|;/).map((s) => s.trim()).filter(Boolean);
  const result: { name: string; tags: string[] }[] = [];
  for (const line of lines) {
    const parts = line.split(/\s+/);
    const name = parts[0];
    const tags = parts.slice(1);
    if (name) result.push({ name, tags });
  }
  return result;
}

export function exportPlanToJSON(plan: Plan): string {
  return JSON.stringify(plan, null, 2);
}

export function importPlanFromJSON(json: string): Plan | null {
  try {
    const p = JSON.parse(json);
    if (p.id && p.name && Array.isArray(p.tables) && Array.isArray(p.guests) && Array.isArray(p.rules)) {
      return p as Plan;
    }
  } catch {}
  return null;
}
