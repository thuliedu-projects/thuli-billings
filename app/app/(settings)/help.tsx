import { Alert, Linking } from 'react-native';

import {
  SettingsCard,
  SettingsLinkRow,
  SettingsScreen,
} from '@/features/settings';

export default function HelpSettingsScreen() {
  return (
    <SettingsScreen>
      <SettingsCard title="Get help">
        <SettingsLinkRow
          label="Frequently asked questions"
          subtitle="Billing, stock, and sync"
          onPress={() => Alert.alert('FAQ', 'Help center will open here soon.')}
        />
        <SettingsLinkRow
          label="Contact support"
          subtitle="Chat or email our team"
          onPress={() => Alert.alert('Support', 'Support chat will be available soon.')}
        />
        <SettingsLinkRow
          label="WhatsApp help"
          subtitle="Quick answers on WhatsApp"
          onPress={() => Linking.openURL('https://wa.me/918122897170')}
        />
      </SettingsCard>
    </SettingsScreen>
  );
}
