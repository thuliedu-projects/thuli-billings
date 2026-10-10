import * as SQLite from 'expo-sqlite';

import { SQLITE_MIGRATION_V2, SQLITE_SCHEMA_SQL, SQLITE_SCHEMA_VERSION } from './schema';

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function openDb() {
  const db = await SQLite.openDatabaseAsync('thuli.db');
  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync(SQLITE_SCHEMA_SQL);
  const row = await db.getFirstAsync<{ v: number | null }>(
    'SELECT MAX(version) AS v FROM schema_migrations',
  );
  if ((row?.v ?? 0) < SQLITE_SCHEMA_VERSION) {
    await db.execAsync(SQLITE_MIGRATION_V2);
    await db.runAsync('INSERT INTO schema_migrations (version) VALUES (?)', SQLITE_SCHEMA_VERSION);
  }
  return db;
}

/** Local POS database. Schema is applied on first open. */
export function getDb() {
  if (!dbPromise) {
    dbPromise = openDb();
  }
  return dbPromise;
}
