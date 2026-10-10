import { Ionicons } from '@expo/vector-icons';
import { useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
  type KeyboardTypeOptions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale, useToast } from '@/components/motion';
import { PrimaryButton } from '@/features/auth';
import { theme } from '@/lib/theme';

export function SettingsScreen({
  children,
  footer,
}: {
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
      {footer}
    </ScrollView>
  );
}

export function SettingsCard({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.card}>{children}</View>
    </View>
  );
}

export function SettingsField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  editable = true,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  keyboardType?: KeyboardTypeOptions;
  editable?: boolean;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.textPlaceholder}
        keyboardType={keyboardType}
        editable={editable}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={[styles.input, focused && styles.inputFocused, !editable && styles.inputDisabled]}
      />
    </View>
  );
}

export function SettingsToggle({
  label,
  subtitle,
  value,
  onValueChange,
}: {
  label: string;
  subtitle?: string;
  value: boolean;
  onValueChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.border, true: theme.purpleBorder }}
        thumbColor={value ? theme.purple : theme.white}
      />
    </View>
  );
}

export function SettingsInfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoIcon}>
        <Ionicons name={icon} size={16} color={theme.purple} />
      </View>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        <Text style={styles.toggleSubtitle}>{value}</Text>
      </View>
    </View>
  );
}

export function SettingsSaveButton({
  label = 'Save changes',
  onPress,
}: {
  label?: string;
  onPress?: () => void;
}) {
  const { showToast } = useToast();
  return (
    <PrimaryButton
      label={label}
      onPress={() => {
        onPress?.();
        showToast({ message: 'Settings saved', tone: 'success' });
      }}
      style={styles.saveBtn}
    />
  );
}

export function SettingsLinkRow({
  label,
  subtitle,
  onPress,
}: {
  label: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <PressableScale style={styles.linkRow} onPress={onPress} scaleTo={0.985}>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleLabel}>{label}</Text>
        {subtitle ? <Text style={styles.toggleSubtitle}>{subtitle}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.backgroundMuted,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 18,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 8,
    marginLeft: 4,
  },
  card: {
    backgroundColor: theme.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 14,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  fieldLabel: {
    color: theme.text,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1.5,
    borderColor: theme.border,
    borderRadius: 10,
    minHeight: 46,
    paddingHorizontal: 12,
    color: theme.text,
    fontSize: 14,
    backgroundColor: theme.white,
  },
  inputFocused: {
    borderColor: theme.borderFocus,
    backgroundColor: theme.purpleSoft,
  },
  inputDisabled: {
    backgroundColor: theme.backgroundMuted,
    color: theme.textSecondary,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleCopy: {
    flex: 1,
    minWidth: 0,
  },
  toggleLabel: {
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '600',
  },
  toggleSubtitle: {
    marginTop: 2,
    color: theme.textSecondary,
    fontSize: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  infoIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtn: {
    marginTop: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
});
