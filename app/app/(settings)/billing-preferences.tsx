import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/motion';
import {
  DEFAULT_BILLING_PREFERENCES,
  loadBillingPreferences,
  saveBillingPreferences,
  SettingsCard,
  SettingsField,
  SettingsSaveButton,
  SettingsScreen,
  SettingsToggle,
  type BillingPreferences,
  type PaymentModeOption,
} from '@/features/settings';
import { theme } from '@/lib/theme';

const PAYMENT_MODES: PaymentModeOption[] = ['Cash', 'UPI'];

export default function BillingPreferencesScreen() {
  const [prefs, setPrefs] = useState<BillingPreferences>(DEFAULT_BILLING_PREFERENCES);
  const [gstText, setGstText] = useState(String(DEFAULT_BILLING_PREFERENCES.defaultGstPercent));
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const stored = await loadBillingPreferences();
      if (cancelled) return;
      setPrefs(stored);
      setGstText(String(stored.defaultGstPercent));
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <SettingsScreen
      footer={
        <SettingsSaveButton
          onPress={() => {
            void (async () => {
              const next = await saveBillingPreferences({
                ...prefs,
                defaultGstPercent: Number(gstText) || 0,
              });
              setPrefs(next);
              setGstText(String(next.defaultGstPercent));
            })();
          }}
        />
      }
    >
      <SettingsCard title="Defaults">
        <SettingsField
          label="Bill number prefix"
          value={prefs.billPrefix}
          onChangeText={(billPrefix) => setPrefs((prev) => ({ ...prev, billPrefix }))}
          placeholder="BILL"
          editable={loaded}
        />
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Default payment mode</Text>
          <View style={styles.segment}>
            {PAYMENT_MODES.map((mode) => {
              const active = prefs.defaultPaymentMode === mode;
              return (
                <PressableScale
                  key={mode}
                  style={[styles.segmentChip, active && styles.segmentChipActive]}
                  onPress={() => setPrefs((prev) => ({ ...prev, defaultPaymentMode: mode }))}
                  scaleTo={0.97}
                  hapticOnPress="selection"
                >
                  <Text style={[styles.segmentLabel, active && styles.segmentLabelActive]}>
                    {mode}
                  </Text>
                </PressableScale>
              );
            })}
          </View>
        </View>
        <SettingsField
          label="Default GST (%)"
          value={gstText}
          onChangeText={(text) => setGstText(text.replace(/[^0-9.]/g, ''))}
          placeholder="18"
          keyboardType="decimal-pad"
          editable={loaded}
        />
        <SettingsToggle
          label="Ask for customer name"
          subtitle="Show customer field on new bills"
          value={prefs.askCustomerName}
          onValueChange={(askCustomerName) => setPrefs((prev) => ({ ...prev, askCustomerName }))}
        />
        <SettingsToggle
          label="Print after save"
          subtitle="Prefer print when paying a bill"
          value={prefs.printAfterSave}
          onValueChange={(printAfterSave) => setPrefs((prev) => ({ ...prev, printAfterSave }))}
        />
      </SettingsCard>
    </SettingsScreen>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  segment: {
    flexDirection: 'row',
    gap: 8,
  },
  segmentChip: {
    flex: 1,
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.white,
  },
  segmentChipActive: {
    borderColor: theme.purple,
    backgroundColor: theme.purpleSoft,
  },
  segmentLabel: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  segmentLabelActive: {
    color: theme.purple,
    fontWeight: '700',
  },
});
