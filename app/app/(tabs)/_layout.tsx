import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';

import { haptic } from '@/components/motion';
import { springs } from '@/lib/motion';
import { theme } from '@/lib/theme';

type TabIcon = keyof typeof Ionicons.glyphMap;

function TabIconLabel({
  name,
  activeName,
  label,
  focused,
}: {
  name: TabIcon;
  activeName: TabIcon;
  label: string;
  focused: boolean;
}) {
  const progress = useSharedValue(focused ? 1 : 0);

  useEffect(() => {
    progress.value = withSpring(focused ? 1 : 0, springs.snappy);
  }, [focused, progress]);

  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 0.92 + progress.value * 0.08 }],
    opacity: 0.7 + progress.value * 0.3,
  }));

  const labelStyle = useAnimatedStyle(() => ({
    opacity: 0.65 + progress.value * 0.35,
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.35 + progress.value * 0.65 }],
  }));

  return (
    <Animated.View style={styles.tabItem}>
      <Animated.View style={iconStyle}>
        <Ionicons
          name={focused ? activeName : name}
          size={22}
          color={focused ? theme.purple : theme.textSecondary}
        />
      </Animated.View>
      <Animated.Text
        style={[styles.tabLabel, focused ? styles.tabLabelActive : null, labelStyle]}
      >
        {label}
      </Animated.Text>
      <Animated.View style={[styles.dot, dotStyle]} />
    </Animated.View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarShowLabel: false,
        tabBarActiveTintColor: theme.purple,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarHideOnKeyboard: true,
      }}
      screenListeners={{
        tabPress: () => {
          haptic('selection');
        },
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ focused }) => (
            <TabIconLabel
              name="apps-outline"
              activeName="apps"
              label="Dashboard"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bills"
        options={{
          title: 'Bills',
          tabBarIcon: ({ focused }) => (
            <TabIconLabel
              name="document-text-outline"
              activeName="document-text"
              label="Bills"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="products"
        options={{
          title: 'Products',
          tabBarIcon: ({ focused }) => (
            <TabIconLabel
              name="bag-handle-outline"
              activeName="bag-handle"
              label="Products"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="stock"
        options={{
          title: 'Stock',
          tabBarIcon: ({ focused }) => (
            <TabIconLabel
              name="cube-outline"
              activeName="cube"
              label="Stock"
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: 'More',
          tabBarIcon: ({ focused }) => (
            <TabIconLabel
              name="ellipsis-horizontal-outline"
              activeName="ellipsis-horizontal"
              label="More"
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    paddingTop: 8,
    borderTopColor: theme.border,
    backgroundColor: theme.white,
    height: 64,
  },
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  tabLabel: {
    marginTop: 3,
    fontSize: 11,
    fontWeight: '600',
    color: theme.textSecondary,
  },
  tabLabelActive: {
    color: theme.purple,
  },
  dot: {
    marginTop: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.purple,
  },
});
