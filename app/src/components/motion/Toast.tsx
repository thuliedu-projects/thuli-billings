import { Ionicons } from '@expo/vector-icons';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/lib/theme';
import { useReducedMotion } from '@/lib/motion';

import { haptic } from './haptics';

export type ToastTone = 'success' | 'error' | 'info';

type ToastPayload = {
  message: string;
  tone?: ToastTone;
  durationMs?: number;
};

type ToastContextValue = {
  showToast: (payload: ToastPayload | string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const ICONS: Record<ToastTone, keyof typeof Ionicons.glyphMap> = {
  success: 'checkmark-circle',
  error: 'alert-circle',
  info: 'information-circle',
};

const COLORS: Record<ToastTone, { bg: string; fg: string }> = {
  success: { bg: theme.successSoft, fg: theme.success },
  error: { bg: theme.dangerSoft, fg: theme.danger },
  info: { bg: theme.purpleSoft, fg: theme.purple },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [toast, setToast] = useState<(ToastPayload & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const seq = useRef(0);

  const showToast = useCallback((payload: ToastPayload | string) => {
    const next: ToastPayload =
      typeof payload === 'string' ? { message: payload, tone: 'info' } : payload;
    const tone = next.tone ?? 'info';
    if (tone === 'success') haptic('success');
    else if (tone === 'error') haptic('error');
    else haptic('selection');

    if (timer.current) clearTimeout(timer.current);
    seq.current += 1;
    const id = seq.current;
    setToast({ ...next, tone, id });
    timer.current = setTimeout(() => {
      setToast((current) => (current?.id === id ? null : current));
    }, next.durationMs ?? 2400);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? (
        <View pointerEvents="none" style={[styles.host, { bottom: insets.bottom + 72 }]}>
          <Animated.View
            key={toast.id}
            entering={reduced ? undefined : FadeInUp.duration(220).springify().damping(16)}
            exiting={reduced ? undefined : FadeOutUp.duration(160)}
            style={[styles.toast, { backgroundColor: COLORS[toast.tone ?? 'info'].bg }]}
          >
            <Ionicons
              name={ICONS[toast.tone ?? 'info']}
              size={18}
              color={COLORS[toast.tone ?? 'info'].fg}
            />
            <Text style={[styles.message, { color: COLORS[toast.tone ?? 'info'].fg }]}>
              {toast.message}
            </Text>
          </Animated.View>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      showToast: (_payload: ToastPayload | string) => {},
    };
  }
  return ctx;
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: 16,
    right: 16,
    alignItems: 'center',
    zIndex: 1000,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 14,
    maxWidth: 420,
    shadowColor: theme.shadow,
    shadowOpacity: 0.12,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  message: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: '700',
  },
});
