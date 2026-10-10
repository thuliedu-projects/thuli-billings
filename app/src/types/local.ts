/**
 * Local-only SQLite shapes (license lease, sync queue, local meta).
 * Domain tables mirror app/src/types/models.ts.
 */

import type { PlanCode, SubscriptionStatus } from './enums';
import type { PlanEntitlements } from './models';

export type LocalMeta = {
  /** Singleton row id = 1 */
  id: 1;
  activeOrgId: string | null;
  activeStoreId: string | null;
  lastPullAt: string | null;
};

/**
 * Cached subscription snapshot for offline POS gating.
 * See docs/DATA_MODEL.md — Offline license lease.
 */
export type LicenseLease = {
  /** Singleton row id = 1 */
  id: 1;
  orgId: string;
  status: SubscriptionStatus;
  planCode: PlanCode | string;
  entitlementsJson: string;
  currentPeriodEnd: string | null;
  leaseExpiresAt: string;
  serverTimeAtIssue: string;
  deviceTimeAtIssue: string;
};

export type ParsedLicenseLease = Omit<LicenseLease, 'entitlementsJson'> & {
  entitlements: Pick<
    PlanEntitlements,
    | 'maxStores'
    | 'maxStaff'
    | 'maxProducts'
    | 'analytics'
    | 'invoices'
    | 'prioritySupport'
  >;
};

export type SyncQueueOp = 'upsert' | 'delete';

export type SyncQueueItem = {
  id: string;
  tableName: string;
  rowId: string;
  op: SyncQueueOp;
  payloadJson: string | null;
  createdAt: string;
  attempts: number;
  lastError: string | null;
};
