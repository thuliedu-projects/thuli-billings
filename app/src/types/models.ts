import type {
  BillStatus,
  OrgRole,
  PaymentMode,
  PlanCode,
  PlanInterval,
  StockMovementReason,
  SubscriptionStatus,
} from './enums';

/** auth.users mirror */
export type Profile = {
  id: string;
  fullName: string | null;
  phone: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Organization = {
  id: string;
  name: string;
  ownerUserId: string;
  /** Set when the owner closes the account. Bills stay; writes are rejected. */
  closedAt: string | null;
  /** razorpay_event_id that provisioned this org. */
  sourceEventId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMember = {
  id: string;
  orgId: string;
  userId: string;
  role: OrgRole;
  createdAt: string;
  updatedAt: string;
};

export type Store = {
  id: string;
  orgId: string;
  name: string;
  phone: string | null;
  address: string | null;
  gstin: string | null;
  logoUrl: string | null;
  isActive: boolean;
  timezone: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type Plan = {
  id: string;
  code: PlanCode | string;
  name: string;
  pricePaise: number;
  interval: PlanInterval;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** null maxProducts = unlimited */
export type PlanEntitlements = {
  id: string;
  planId: string;
  maxStores: number;
  maxStaff: number;
  maxProducts: number | null;
  analytics: boolean;
  invoices: boolean;
  prioritySupport: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Subscription = {
  id: string;
  orgId: string;
  planId: string;
  status: SubscriptionStatus;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  razorpaySubscriptionId: string | null;
  razorpayCustomerId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentEvent = {
  id: string;
  orgId: string | null;
  /** E.164 mobile from website checkout; becomes org owner. */
  ownerPhone: string | null;
  eventType: string;
  razorpayEventId: string;
  amountPaise: number | null;
  status: string | null;
  payload: Record<string, unknown> | null;
  createdAt: string;
};

export type Category = {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type Product = {
  id: string;
  storeId: string;
  categoryId: string | null;
  name: string;
  sku: string | null;
  barcode: string | null;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  discountPercent: number;
  gstPercent: number;
  stockQty: number;
  isActive: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type Bill = {
  id: string;
  storeId: string;
  billNumber: string;
  status: BillStatus;
  customerName: string | null;
  subtotal: number;
  discount: number;
  taxable: number;
  gst: number;
  total: number;
  billedAt: string;
  createdBy: string | null;
  /** Per-sale idempotency key minted by the device. Not the install id. */
  clientId: string;
  sellerName: string | null;
  sellerGstin: string | null;
  sellerAddress: string | null;
  receivedAt: string;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type BillItem = {
  id: string;
  billId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  gstPercent: number;
  lineSubtotal: number;
  lineGst: number;
  lineTotal: number;
  revision: number;
  createdAt: string;
  updatedAt: string;
};

export type BillPayment = {
  id: string;
  billId: string;
  mode: PaymentMode;
  amount: number;
  paidAt: string;
  createdAt: string;
  updatedAt: string;
};

export type StockMovement = {
  id: string;
  storeId: string;
  productId: string;
  delta: number;
  reason: StockMovementReason;
  refType: string | null;
  refId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SyncTombstone = {
  id: string;
  entityType: string;
  entityId: string;
  storeId: string;
  deletedAt: string;
};
