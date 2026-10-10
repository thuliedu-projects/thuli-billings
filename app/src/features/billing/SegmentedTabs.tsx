import { useEffect, useState } from 'react';
import { LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { haptic } from '@/components/motion';
import { springs } from '@/lib/motion';
import { theme } from '@/lib/theme';

type Option<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedTabs<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const count = Math.max(options.length, 1);
  const tabWidth = width > 0 ? (width - 6) / count : 0;
  const x = useSharedValue(0);

  useEffect(() => {
    if (tabWidth <= 0) return;
    x.value = withSpring(index * tabWidth, springs.settle);
  }, [index, tabWidth, x]);

  const pillStyle = useAnimatedStyle(() => ({
    width: tabWidth,
    transform: [{ translateX: x.value }],
  }));

  function onLayout(e: LayoutChangeEvent) {
    setWidth(e.nativeEvent.layout.width);
  }

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {tabWidth > 0 ? <Animated.View style={[styles.pill, pillStyle]} /> : null}
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            onPress={() => {
              if (option.value !== value) haptic('selection');
              onChange(option.value);
            }}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
          >
            <Text style={[styles.label, active && styles.labelActive]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 3,
    borderRadius: 999,
    backgroundColor: theme.purpleSoft,
    position: 'relative',
  },
  pill: {
    position: 'absolute',
    left: 3,
    top: 3,
    bottom: 3,
    borderRadius: 999,
    backgroundColor: theme.purple,
  },
  tab: {
    flex: 1,
    minHeight: 30,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    zIndex: 1,
  },
  label: {
    color: theme.purpleMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  labelActive: {
    color: theme.white,
  },
});
