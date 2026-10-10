import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'thuli.billingPreferences.v1';

export type PaymentModeOption = 'Cash' | 'UPI';

export type BillingPreferences = {
  billPrefix: string;
  defaultPaymentMode: PaymentModeOption;
  defaultGstPercent: number;
  askCustomerName: boolean;
  printAfterSave: boolean;
};

export const DEFAULT_BILLING_PREFERENCES: BillingPreferences = {
  billPrefix: 'BILL',
  defaultPaymentMode: 'Cash',
  defaultGstPercent: 18,
  askCustomerName: true,
  printAfterSave: false,
};

function clampGstPercent(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function normalizePaymentMode(value: unknown): PaymentModeOption {
  return value === 'UPI' ? 'UPI' : 'Cash';
}

function normalizePrefs(raw: Partial<BillingPreferences> | null | undefined): BillingPreferences {
  return {
    billPrefix:
      typeof raw?.billPrefix === 'string' && raw.billPrefix.trim()
        ? raw.billPrefix.trim()
        : DEFAULT_BILLING_PREFERENCES.billPrefix,
    defaultPaymentMode: normalizePaymentMode(raw?.defaultPaymentMode),
    defaultGstPercent: clampGstPercent(
      typeof raw?.defaultGstPercent === 'number'
        ? raw.defaultGstPercent
        : Number(raw?.defaultGstPercent) || DEFAULT_BILLING_PREFERENCES.defaultGstPercent,
    ),
    askCustomerName:
      typeof raw?.askCustomerName === 'boolean'
        ? raw.askCustomerName
        : DEFAULT_BILLING_PREFERENCES.askCustomerName,
    printAfterSave:
      typeof raw?.printAfterSave === 'boolean'
        ? raw.printAfterSave
        : DEFAULT_BILLING_PREFERENCES.printAfterSave,
  };
}

export async function loadBillingPreferences(): Promise<BillingPreferences> {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (!stored) return { ...DEFAULT_BILLING_PREFERENCES };
    return normalizePrefs(JSON.parse(stored) as Partial<BillingPreferences>);
  } catch {
    return { ...DEFAULT_BILLING_PREFERENCES };
  }
}

export async function saveBillingPreferences(
  prefs: BillingPreferences,
): Promise<BillingPreferences> {
  const next = normalizePrefs(prefs);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
