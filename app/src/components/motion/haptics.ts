import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const supported = Platform.OS === 'ios' || Platform.OS === 'android';

export type HapticKind = 'light' | 'medium' | 'selection' | 'success' | 'warning' | 'error';

/** Fire-and-forget haptics — never block UI. */
export function haptic(kind: HapticKind = 'light') {
  if (!supported) return;
  try {
    switch (kind) {
      case 'selection':
        void Haptics.selectionAsync();
        break;
      case 'medium':
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        break;
      case 'success':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        break;
      case 'warning':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        break;
      case 'error':
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        break;
      default:
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  } catch {
    // Native module may be unavailable on web / Expo Go edge cases.
  }
}
