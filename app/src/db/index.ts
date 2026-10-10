/**
 * SQLite schema, migrations, and queries.
 * Schema DDL: ./schema.ts — models: ../types
 */

export { getDb } from './client';
export { deleteRemoteAccount, deleteRemoteStore } from './remote';
export {
  LOCAL_ORG_ID,
  deleteLocalStore,
  ensureLocalOrg,
  getActiveStoreId,
  listLocalStores,
  persistLocalStore,
  setActiveStoreId,
  wipeLocalAccount,
} from './stores';
export type { PersistableStore } from './stores';
export {
  LICENSE_CLOCK_SKEW_MS,
  LICENSE_LEASE_GRACE_MS,
  SQLITE_MIGRATION_V2,
  SQLITE_SCHEMA_SQL,
  SQLITE_SCHEMA_VERSION,
} from './schema';
