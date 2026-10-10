import { useState } from 'react';

import {
  SettingsCard,
  SettingsField,
  SettingsSaveButton,
  SettingsScreen,
} from '@/features/settings';
import { useDemo } from '@/features/demo';

export default function AccountSettingsScreen() {
  const { storePhone } = useDemo();
  const [ownerName, setOwnerName] = useState('Store Owner');
  const [phone, setPhone] = useState(storePhone.replace('+91 ', '').replace(/\s/g, ''));
  const [email, setEmail] = useState('owner@store.com');

  return (
    <SettingsScreen footer={<SettingsSaveButton />}>
      <SettingsCard title="Profile">
        <SettingsField
          label="Full name"
          value={ownerName}
          onChangeText={setOwnerName}
          placeholder="Your name"
        />
        <SettingsField
          label="Mobile number"
          value={phone}
          onChangeText={(text) => setPhone(text.replace(/\D/g, '').slice(0, 10))}
          placeholder="10-digit mobile"
          keyboardType="phone-pad"
        />
        <SettingsField
          label="Email"
          value={email}
          onChangeText={setEmail}
          placeholder="you@business.com"
          keyboardType="email-address"
        />
      </SettingsCard>

      <SettingsCard title="Security">
        <SettingsField
          label="Login method"
          value="OTP via mobile"
          onChangeText={() => undefined}
          editable={false}
        />
      </SettingsCard>
    </SettingsScreen>
  );
}
