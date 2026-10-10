/** Domain enums shared by Supabase and the app. */

export type OrgRole = 'owner' | 'admin' | 'manager' | 'cashier';

export type PlanInterval = 'month' | 'year';

export type SubscriptionStatus =
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'expired';

export type BillStatus = 'draft' | 'paid' | 'pending' | 'void';

export type PaymentMode = 'cash' | 'upi' | 'card' | 'other';

export type StockMovementReason = 'sale' | 'adjust' | 'receive';

export type PlanCode = 'starter' | 'growth' | 'pro';
