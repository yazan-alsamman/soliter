/**
 * Dependency-aware ordering for outbox operations (Kahn topological sort).
 * Tie-break: priority (HIGH first), then sequence, then id.
 */

/** @typedef {'HIGH' | 'NORMAL' | 'LOW'} Priority */

const PRIORITY_RANK = { HIGH: 0, NORMAL: 1, LOW: 2 };

/**
 * @template {{ id: string; dependsOn?: string[]; priority?: Priority; sequence?: number }} T
 * @param {T[]} ops
 * @returns {T[]}
 */
export function topologicalSortOutbox(ops) {
  const byId = new Map(ops.map((o) => [o.id, o]));
  const incoming = new Map(ops.map((o) => [o.id, 0]));

  for (const op of ops) {
    for (const dep of op.dependsOn ?? []) {
      if (!byId.has(dep)) continue;
      incoming.set(op.id, (incoming.get(op.id) ?? 0) + 1);
    }
  }

  /** @type {T[]} */
  const ready = ops.filter((o) => (incoming.get(o.id) ?? 0) === 0);
  ready.sort(compareOps);

  /** @type {T[]} */
  const out = [];

  while (ready.length) {
    const op = ready.shift();
    if (!op) break;
    out.push(op);
    for (const other of ops) {
      if (other.id === op.id) continue;
      if (!(other.dependsOn ?? []).includes(op.id)) continue;
      const next = (incoming.get(other.id) ?? 0) - 1;
      incoming.set(other.id, next);
      if (next === 0) {
        ready.push(other);
        ready.sort(compareOps);
      }
    }
  }

  if (out.length !== ops.length) {
    throw new Error(
      'Outbox dependency cycle or missing dependency — resolve dependsOn graph before sync.',
    );
  }
  return out;
}

function compareOps(a, b) {
  const pa = PRIORITY_RANK[a.priority ?? 'NORMAL'];
  const pb = PRIORITY_RANK[b.priority ?? 'NORMAL'];
  if (pa !== pb) return pa - pb;
  const sa = a.sequence ?? 0;
  const sb = b.sequence ?? 0;
  if (sa !== sb) return sa - sb;
  return a.id.localeCompare(b.id);
}
