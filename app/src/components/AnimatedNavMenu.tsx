import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '@/lib/theme';

type Option<T extends string> = {
  value: T;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
};

type AnimatedNavMenuProps<T extends string> = {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
  title?: string;
  align?: 'left' | 'right';
};

/** Animated hamburger that opens a springy option panel. */
export function AnimatedNavMenu<T extends string>({
  options,
  value,
  onChange,
  title = 'Switch view',
  align = 'right',
}: AnimatedNavMenuProps<T>) {
  const insets = useSafeAreaInsets();
  const [visible, setVisible] = useState(false);
  const open = useSharedValue(0);
  const press = useSharedValue(0);

  const active = options.find((o) => o.value === value);

  function openMenu() {
    setVisible(true);
    open.value = withSpring(1, { damping: 15, stiffness: 240 });
  }

  function closeMenu() {
    open.value = withTiming(0, { duration: 150, easing: Easing.out(Easing.cubic) });
    setTimeout(() => setVisible(false), 150);
  }

  function toggle() {
    if (visible) closeMenu();
    else openMenu();
  }

  function select(next: T) {
    onChange(next);
    closeMenu();
  }

  const btnStyle = useAnimatedStyle(() => ({
    transform: [{ scale: interpolate(press.value, [0, 1], [1, 0.9]) }],
    backgroundColor: interpolateColor(open.value, [0, 1], [theme.purpleSoft, theme.purple]),
  }));

  const topBar = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(open.value, [0, 1], [theme.purple, theme.white]),
    transform: [
      { translateY: interpolate(open.value, [0, 1], [0, 7]) },
      { rotate: `${interpolate(open.value, [0, 1], [0, 45])}deg` },
    ],
  }));

  const midBar = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(open.value, [0, 1], [theme.purple, theme.white]),
    opacity: interpolate(open.value, [0, 1], [1, 0]),
    transform: [{ scaleX: interpolate(open.value, [0, 1], [1, 0.15]) }],
  }));

  const bottomBar = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(open.value, [0, 1], [theme.purple, theme.white]),
    transform: [
      { translateY: interpolate(open.value, [0, 1], [0, -7]) },
      { rotate: `${interpolate(open.value, [0, 1], [0, -45])}deg` },
    ],
  }));

  const panelStyle = useAnimatedStyle(() => ({
    opacity: open.value,
    transform: [
      { translateY: interpolate(open.value, [0, 1], [-10, 0]) },
      { scale: interpolate(open.value, [0, 1], [0.92, 1]) },
    ],
  }));

  return (
    <View style={styles.wrap}>
      <Pressable
        onPressIn={() => {
          press.value = withTiming(1, { duration: 80 });
        }}
        onPressOut={() => {
          press.value = withTiming(0, { duration: 110 });
        }}
        onPress={toggle}
        accessibilityRole="button"
        accessibilityLabel={visible ? 'Close menu' : `Menu, ${active?.label ?? 'options'}`}
        hitSlop={8}
      >
        <Animated.View style={[styles.trigger, btnStyle]}>
          <View style={styles.burger}>
            <Animated.View style={[styles.bar, topBar]} />
            <Animated.View style={[styles.bar, styles.barMid, midBar]} />
            <Animated.View style={[styles.bar, bottomBar]} />
          </View>
        </Animated.View>
      </Pressable>

      <Modal visible={visible} transparent animationType="none" onRequestClose={closeMenu}>
        <View style={styles.modalRoot}>
          <Pressable style={styles.backdrop} onPress={closeMenu} />
          <Animated.View
            style={[
              styles.panel,
              align === 'left' ? styles.panelLeft : styles.panelRight,
              { top: insets.top + 52 },
              panelStyle,
            ]}
          >
            <Text style={styles.panelTitle}>{title}</Text>
            {options.map((option) => {
              const isActive = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  onPress={() => select(option.value)}
                  style={({ pressed }) => [
                    styles.row,
                    isActive && styles.rowActive,
                    pressed && styles.rowPressed,
                  ]}
                >
                  {option.icon ? (
                    <Ionicons
                      name={option.icon}
                      size={16}
                      color={isActive ? theme.white : theme.purple}
                    />
                  ) : null}
                  <Text style={[styles.rowLabel, isActive && styles.rowLabelActive]}>
                    {option.label}
                  </Text>
                  {isActive ? (
                    <Ionicons name="checkmark" size={16} color={theme.white} />
                  ) : (
                    <View style={styles.checkSpacer} />
                  )}
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trigger: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: theme.purpleSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burger: {
    width: 16,
    height: 14,
    justifyContent: 'space-between',
  },
  bar: {
    height: 2,
    borderRadius: 1,
    backgroundColor: theme.purple,
    width: '100%',
  },
  barMid: {
    width: '72%',
    alignSelf: 'flex-start',
  },
  modalRoot: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(30,22,48,0.2)',
  },
  panel: {
    position: 'absolute',
    minWidth: 200,
    backgroundColor: theme.white,
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: theme.border,
    shadowColor: theme.shadow,
    shadowOpacity: 0.2,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  panelLeft: {
    left: 14,
  },
  panelRight: {
    right: 14,
  },
  panelTitle: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 12,
    borderRadius: 10,
  },
  rowActive: {
    backgroundColor: theme.purple,
  },
  rowPressed: {
    opacity: 0.9,
  },
  rowLabel: {
    flex: 1,
    color: theme.purpleDark,
    fontSize: 14,
    fontWeight: '700',
  },
  rowLabelActive: {
    color: theme.white,
  },
  checkSpacer: {
    width: 16,
  },
});
