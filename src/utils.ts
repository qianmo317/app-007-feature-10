import { v4 as uuidv4 } from 'uuid';
import type { Plan } from './types';
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

export function getSeatedIds(plan: Plan): Set<string> {
  const ids = new Set<string>();
  for (const t of plan.tables) for (const id of t.seatOrder) ids.add(id);
  return ids;
}

export type TagStat = { tag: string; total: number; seated: number; unassigned: number };

export function getTagStats(plan: Plan): TagStat[] {
  const seatedIds = getSeatedIds(plan);
  return TAG_OPTIONS.map((tag) => {
    const withTag = plan.guests.filter((g) => g.tags.includes(tag));
    const seated = withTag.filter((g) => seatedIds.has(g.id)).length;
    return { tag, total: withTag.length, seated, unassigned: withTag.length - seated };
  }).filter((s) => s.total > 0);
}

export type ClusterWarning = { tableLabel: string; tag: string; count: number; seated: number };

// 某一桌上同一标签的人明显扎堆（≥4 人且占该桌已坐人数 3/4 以上）时给出提醒
export function getTableClusterWarnings(plan: Plan): ClusterWarning[] {
  const guestById = new Map(plan.guests.map((g) => [g.id, g]));
  const warnings: ClusterWarning[] = [];
  for (const t of plan.tables) {
    const seatedGuests = t.seatOrder
      .map((id) => guestById.get(id))
      .filter((g): g is NonNullable<typeof g> => !!g);
    if (seatedGuests.length < 4) continue;
    const counts = new Map<string, number>();
    for (const g of seatedGuests) {
      for (const tag of g.tags) counts.set(tag, (counts.get(tag) || 0) + 1);
    }
    for (const [tag, count] of counts) {
      if (count >= 4 && count >= Math.ceil((seatedGuests.length * 3) / 4)) {
        warnings.push({ tableLabel: t.label, tag, count, seated: seatedGuests.length });
      }
    }
  }
  return warnings;
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
