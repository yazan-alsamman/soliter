/**
 * @typedef {'HIGH' | 'NORMAL' | 'LOW'} SyncPriority
 */

/**
 * @typedef {Object} OutboxRecord
 * @property {string} id
 * @property {string} entityType
 * @property {string} entityId
 * @property {string} operation
 * @property {number} sequence
 * @property {string[]} [dependsOn]
 * @property {SyncPriority} [priority]
 * @property {Record<string, unknown>} payload
 * @property {string} idempotencyKey
 * @property {'pending'|'in_flight'|'synced'|'failed'} status
 * @property {number} createdAt
 * @property {number} retryCount
 * @property {string} [lastError]
 */

export {};
