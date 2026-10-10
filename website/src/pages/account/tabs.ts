export const ACCOUNT_TABS = ['overview', 'plan', 'stores', 'billing'] as const;

export type AccountTab = (typeof ACCOUNT_TABS)[number];

export function isAccountTab(value: string | null): value is AccountTab {
  return value === 'overview' || value === 'plan' || value === 'stores' || value === 'billing';
}
