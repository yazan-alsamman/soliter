import { api } from '../services/apiClient.js';
import { syncDb } from './syncDb.js';
import { topologicalSortOutbox } from './topological.js';

/** Monotonic sequence — persisted in meta store. */
async function nextSequence() {
  const row = await syncDb.meta.get('sequence');
  const n = (row?.value ?? 0) + 1;
  await syncDb.meta.put({ key: 'sequence', value: n });
  return n;
}

/**
 * Enqueue a mutation for later sync.
 * @param {object} partial
 */
export async function enqueueOutbox(partial) {
  const id = partial.id ?? crypto.randomUUID();
  const idempotencyKey = partial.idempotencyKey ?? crypto.randomUUID();
  const seq = await nextSequence();
  const row = {
    id,
    entityType: partial.entityType,
    entityId: partial.entityId,
    operation: partial.operation,
    sequence: seq,
    dependsOn: partial.dependsOn ?? [],
    priority: partial.priority ?? 'NORMAL',
    payload: partial.payload,
    idempotencyKey,
    status: 'pending',
    createdAt: Date.now(),
    retryCount: 0,
    lastError: undefined,
  };
  await syncDb.outbox.put(row);
  return row;
}

/** Pull remote changes — advances stored cursor (application integration still TODO). */
export async function pullRemoteChanges() {
  let cursor = (await syncDb.meta.get('pullCursor'))?.value ?? undefined;
  let total = 0;
  for (;;) {
    const params = { limit: 200 };
    if (cursor) params.cursor = cursor;
    const page = await api.syncChanges(params);
    const items = page.items ?? [];
    total += items.length;
    const next = page.nextCursor ?? null;
    if (next) {
      await syncDb.meta.put({ key: 'pullCursor', value: next });
      cursor = next;
    }
    if (!page.hasMore || !next) break;
  }
  return { pulled: total };
}

/** Drain pending outbox rows to POST /sync/batch (dependency order). */
export async function flushOutbox() {
  const rows = await syncDb.outbox.where('status').equals('pending').toArray();
  if (!rows.length) return { sent: 0 };

  const ordered = topologicalSortOutbox(rows);
  const chunkSize = 50;
  let sent = 0;

  for (let offset = 0; offset < ordered.length; offset += chunkSize) {
    const chunkRows = ordered.slice(offset, offset + chunkSize);
    const ops = chunkRows.map((r) => ({
      idempotencyKey: r.idempotencyKey,
      operation: r.operation,
      payload:
        typeof structuredClone === 'function'
          ? structuredClone(r.payload)
          : JSON.parse(JSON.stringify(r.payload)),
    }));

    const batch = await api.syncBatch({ ops });
    const results = batch.results ?? [];

    for (const res of results) {
      const row = chunkRows[res.opIndex];
      if (!row) continue;
      if (res.ok) {
        await syncDb.outbox.delete(row.id);
        sent += 1;
      } else {
        await syncDb.outbox.update(row.id, {
          status: 'failed',
          retryCount: row.retryCount + 1,
          lastError: res.error?.message ?? 'sync_failed',
        });
      }
    }
  }
  return { sent };
}
