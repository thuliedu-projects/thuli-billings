import { getDb } from './client';

/** Placeholder org for local/demo rows until sync is wired. */
export const LOCAL_ORG_ID = '00000000-0000-4000-8000-000000000001';

export type PersistableStore = {
  id: string;
  name: string;
  location: string;
  phone: string;
  address: string;
  gstin: string;
  logoUri: string;
};

type StoreRow = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  logo_url: string | null;
};

function nowIso() {
  return new Date().toISOString();
}

function rowToStore(row: StoreRow): PersistableStore {
  const address = row.address ?? '';
  return {
    id: row.id,
    name: row.name,
    location: address,
    phone: row.phone ?? '',
    address,
    gstin: row.gstin ?? '',
    logoUri: row.logo_url ?? '',
  };
}

export async function ensureLocalOrg() {
  const db = await getDb();
  const now = nowIso();
  await db.runAsync(
    `INSERT OR IGNORE INTO organizations (id, name, owner_user_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)`,
    [LOCAL_ORG_ID, 'Local business', 'local-owner', now, now],
  );
  await db.runAsync(
    'UPDATE local_meta SET active_org_id = COALESCE(active_org_id, ?) WHERE id = 1',
    LOCAL_ORG_ID,
  );
}

export async function listLocalStores(): Promise<PersistableStore[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<StoreRow>(
    'SELECT id, name, phone, address, gstin, logo_url FROM stores ORDER BY created_at ASC',
  );
  return rows.map(rowToStore);
}

export async function getActiveStoreId(): Promise<string | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ active_store_id: string | null }>(
    'SELECT active_store_id FROM local_meta WHERE id = 1',
  );
  return row?.active_store_id ?? null;
}

export async function setActiveStoreId(storeId: string | null) {
  const db = await getDb();
  await db.runAsync('UPDATE local_meta SET active_store_id = ? WHERE id = 1', storeId);
}

export async function persistLocalStore(store: PersistableStore, orgId = LOCAL_ORG_ID) {
  const db = await getDb();
  await ensureLocalOrg();
  const now = nowIso();
  await db.runAsync(
    `INSERT INTO stores (
       id, org_id, name, phone, address, gstin, logo_url, is_active, timezone, created_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, 1, 'Asia/Kolkata', ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name,
       phone = excluded.phone,
       address = excluded.address,
       gstin = excluded.gstin,
       logo_url = excluded.logo_url,
       updated_at = excluded.updated_at,
       revision = stores.revision + 1`,
    [
      store.id,
      orgId,
      store.name,
      store.phone || null,
      store.address || store.location || null,
      store.gstin || null,
      store.logoUri || null,
      now,
      now,
    ],
  );
}

export async function deleteLocalStore(storeId: string) {
  const db = await getDb();
  const now = nowIso();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `DELETE FROM bill_payments WHERE bill_id IN (SELECT id FROM bills WHERE store_id = ?)`,
      storeId,
    );
    await db.runAsync(
      `DELETE FROM bill_items WHERE bill_id IN (SELECT id FROM bills WHERE store_id = ?)`,
      storeId,
    );
    await db.runAsync('DELETE FROM bills WHERE store_id = ?', storeId);
    await db.runAsync('DELETE FROM stock_movements WHERE store_id = ?', storeId);
    await db.runAsync('DELETE FROM products WHERE store_id = ?', storeId);
    await db.runAsync('DELETE FROM categories WHERE store_id = ?', storeId);
    await db.runAsync('DELETE FROM stores WHERE id = ?', storeId);
    await db.runAsync(
      `INSERT INTO sync_queue (id, table_name, row_id, op, payload_json, created_at, attempts, last_error)
       VALUES (?, 'stores', ?, 'delete', NULL, ?, 0, NULL)`,
      [globalThis.crypto.randomUUID(), storeId, now],
    );
    const meta = await db.getFirstAsync<{ active_store_id: string | null }>(
      'SELECT active_store_id FROM local_meta WHERE id = 1',
    );
    if (meta?.active_store_id === storeId) {
      const next = await db.getFirstAsync<{ id: string }>(
        'SELECT id FROM stores ORDER BY created_at ASC LIMIT 1',
      );
      await db.runAsync('UPDATE local_meta SET active_store_id = ? WHERE id = 1', next?.id ?? null);
    }
  });
}

export async function wipeLocalAccount() {
  const db = await getDb();
  await db.execAsync(`
    DELETE FROM bill_payments;
    DELETE FROM bill_items;
    DELETE FROM bills;
    DELETE FROM stock_movements;
    DELETE FROM products;
    DELETE FROM categories;
    DELETE FROM stores;
    DELETE FROM organizations;
    DELETE FROM license_lease;
    DELETE FROM sync_queue;
    UPDATE local_meta SET active_org_id = NULL, active_store_id = NULL, last_pull_at = NULL WHERE id = 1;
  `);
}
