import { useState } from 'react';

import {
  SettingsCard,
  SettingsSaveButton,
  SettingsScreen,
  SettingsToggle,
} from '@/features/settings';

export default function NotificationsSettingsScreen() {
  const [lowStock, setLowStock] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [paymentAlerts, setPaymentAlerts] = useState(false);
  const [productUpdates, setProductUpdates] = useState(true);

  return (
    <SettingsScreen footer={<SettingsSaveButton />}>
      <SettingsCard title="Alerts">
        <SettingsToggle
          label="Low stock alerts"
          subtitle="When inventory falls below threshold"
          value={lowStock}
          onValueChange={setLowStock}
        />
        <SettingsToggle
          label="Daily sales summary"
          subtitle="End-of-day sales snapshot"
          value={dailySummary}
          onValueChange={setDailySummary}
        />
        <SettingsToggle
          label="Payment reminders"
          subtitle="Pending bill follow-ups"
          value={paymentAlerts}
          onValueChange={setPaymentAlerts}
        />
        <SettingsToggle
          label="Product updates"
          subtitle="Import and sync notices"
          value={productUpdates}
          onValueChange={setProductUpdates}
        />
      </SettingsCard>
    </SettingsScreen>
  );
}
