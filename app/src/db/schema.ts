/**
 * SQLite DDL for local POS truth + license lease + sync queue.
 * Keep column names snake_case to match Supabase / sync payloads.
 * See docs/DATA_MODEL.md.
 */

export const SQLITE_SCHEMA_VERSION = 2;

/** Full schema applied on first open (and bump version when migrating). */
export const SQLITE_SCHEMA_SQL = `
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY NOT NULL
);

CREATE TABLE IF NOT EXISTS local_meta (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  active_org_id TEXT,
  active_store_id TEXT,
  last_pull_at TEXT
);

INSERT OR IGNORE INTO local_meta (id, active_org_id, active_store_id, last_pull_at)
VALUES (1, NULL, NULL, NULL);

-- Cached subscription snapshot for offline POS gating (7-day lease).
CREATE TABLE IF NOT EXISTS license_lease (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  org_id TEXT NOT NULL,
  status TEXT NOT NULL,
  plan_code TEXT NOT NULL,
  entitlements_json TEXT NOT NULL,
  current_period_end TEXT,
  lease_expires_at TEXT NOT NULL,
  server_time_at_issue TEXT NOT NULL,
  device_time_at_issue TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  owner_user_id TEXT NOT NULL,
  closed_at TEXT,
  source_event_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY NOT NULL,
  org_id TEXT NOT NULL,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  gstin TEXT,
  logo_url TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS stores_org_id_idx ON stores (org_id);

CREATE TABLE IF NOT EXISTS categories (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL,
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS categories_store_id_idx ON categories (store_id);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL,
  category_id TEXT,
  name TEXT NOT NULL,
  sku TEXT,
  barcode TEXT,
  unit TEXT NOT NULL DEFAULT 'Nos',
  cost_price REAL NOT NULL DEFAULT 0,
  selling_price REAL NOT NULL DEFAULT 0,
  discount_percent REAL NOT NULL DEFAULT 0,
  gst_percent REAL NOT NULL DEFAULT 0,
  stock_qty REAL NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS products_store_id_idx ON products (store_id);
CREATE INDEX IF NOT EXISTS products_category_id_idx ON products (category_id);
CREATE UNIQUE INDEX IF NOT EXISTS products_store_barcode_uidx
  ON products (store_id, barcode)
  WHERE barcode IS NOT NULL AND barcode <> '';

CREATE TABLE IF NOT EXISTS bills (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL,
  bill_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  customer_name TEXT,
  subtotal REAL NOT NULL DEFAULT 0,
  discount REAL NOT NULL DEFAULT 0,
  taxable REAL NOT NULL DEFAULT 0,
  gst REAL NOT NULL DEFAULT 0,
  total REAL NOT NULL DEFAULT 0,
  billed_at TEXT NOT NULL,
  created_by TEXT,
  client_id TEXT NOT NULL,
  seller_name TEXT,
  seller_gstin TEXT,
  seller_address TEXT,
  received_at TEXT,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (store_id, bill_number),
  UNIQUE (store_id, client_id)
);

CREATE INDEX IF NOT EXISTS bills_store_id_idx ON bills (store_id);
CREATE INDEX IF NOT EXISTS bills_billed_at_idx ON bills (store_id, billed_at);

CREATE TABLE IF NOT EXISTS bill_items (
  id TEXT PRIMARY KEY NOT NULL,
  bill_id TEXT NOT NULL,
  product_id TEXT,
  product_name TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_percent REAL NOT NULL DEFAULT 0,
  gst_percent REAL NOT NULL DEFAULT 0,
  line_subtotal REAL NOT NULL DEFAULT 0,
  line_gst REAL NOT NULL DEFAULT 0,
  line_total REAL NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bill_items_bill_id_idx ON bill_items (bill_id);

CREATE TABLE IF NOT EXISTS bill_payments (
  id TEXT PRIMARY KEY NOT NULL,
  bill_id TEXT NOT NULL,
  mode TEXT NOT NULL,
  amount REAL NOT NULL,
  paid_at TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS bill_payments_bill_id_idx ON bill_payments (bill_id);

CREATE TABLE IF NOT EXISTS stock_movements (
  id TEXT PRIMARY KEY NOT NULL,
  store_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  delta REAL NOT NULL,
  reason TEXT NOT NULL,
  ref_type TEXT,
  ref_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS stock_movements_store_id_idx ON stock_movements (store_id);
CREATE INDEX IF NOT EXISTS stock_movements_product_id_idx ON stock_movements (product_id);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY NOT NULL,
  table_name TEXT NOT NULL,
  row_id TEXT NOT NULL,
  op TEXT NOT NULL CHECK (op IN ('upsert', 'delete')),
  payload_json TEXT,
  created_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE INDEX IF NOT EXISTS sync_queue_created_at_idx ON sync_queue (created_at);

CREATE TABLE IF NOT EXISTS store_sync (
  store_id TEXT PRIMARY KEY NOT NULL,
  last_pull_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS stock_write_guard (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  open INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO stock_write_guard (id, open) VALUES (1, 0);

CREATE TRIGGER IF NOT EXISTS stock_movements_apply
AFTER INSERT ON stock_movements
BEGIN
  UPDATE stock_write_guard SET open = 1 WHERE id = 1;
  UPDATE products SET stock_qty = stock_qty + NEW.delta WHERE id = NEW.product_id;
  UPDATE stock_write_guard SET open = 0 WHERE id = 1;
  SELECT RAISE(ABORT, 'negative stock')
   WHERE (SELECT stock_qty FROM products WHERE id = NEW.product_id) < 0;
END;

CREATE TRIGGER IF NOT EXISTS products_reject_direct_stock
BEFORE UPDATE OF stock_qty ON products
FOR EACH ROW
WHEN NEW.stock_qty IS NOT OLD.stock_qty
 AND (SELECT open FROM stock_write_guard WHERE id = 1) = 0
BEGIN
  SELECT RAISE(ABORT, 'stock_qty changes only through stock_movements');
END;
`;

/** Alters for devices that already opened schema version 1. */
export const SQLITE_MIGRATION_V2 = `
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS closed_at TEXT;
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS source_event_id TEXT;
ALTER TABLE stores ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS seller_name TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS seller_gstin TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS seller_address TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS received_at TEXT;
ALTER TABLE bills ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bill_items ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
`;

/** Default offline lease grace: 7 days in ms. */
export const LICENSE_LEASE_GRACE_MS = 7 * 24 * 60 * 60 * 1000;

/** Allowed clock rollback before forcing online revalidation. */
export const LICENSE_CLOCK_SKEW_MS = 60 * 60 * 1000;
