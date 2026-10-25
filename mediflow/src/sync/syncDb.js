import Dexie from 'dexie';

/**
 * Local durable queue + id mapping for offline-first sync (Phase B+).
 * @see SyncContext.jsx
 */
export class MediFlowSyncDb extends Dexie {
  constructor() {
    super('mediflow_sync');
    this.version(1).stores({
      outbox:
        '&id, entityType, entityId, status, priority, sequence, createdAt, [status+priority]',
      idMap: '&clientEntityKey, serverId, entityType',
      meta: 'key',
    });
  }
}

export const syncDb = new MediFlowSyncDb();
