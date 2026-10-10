import Constants from 'expo-constants';

import {
  SettingsCard,
  SettingsInfoRow,
  SettingsScreen,
} from '@/features/settings';

export default function AboutSettingsScreen() {
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <SettingsScreen>
      <SettingsCard title="App">
        <SettingsInfoRow icon="phone-portrait-outline" label="THULI Billings" value={`Version ${version}`} />
        <SettingsInfoRow icon="sparkles-outline" label="Build" value="Demo UI scaffold" />
      </SettingsCard>
      <SettingsCard title="Legal">
        <SettingsInfoRow
          icon="document-text-outline"
          label="Terms of use"
          value="Available on the website"
        />
        <SettingsInfoRow
          icon="shield-checkmark-outline"
          label="Privacy policy"
          value="Available on the website"
        />
      </SettingsCard>
    </SettingsScreen>
  );
}
