import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/config/theme';
import { useThemeMode } from '@/contexts/ThemeContext';
import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useMobileDatabase } from '@/contexts/MobileDatabaseContext';
// Removed AddExpenseModal (inline add form in Expenses page)

// Temporary icon wrapper to handle type issues
const TabIcon = ({ name, size, color }: { name: string; size: number; color: string }) => {
  const Icon = Ionicons as any;
  return <Icon name={name} size={size} color={color} />;
};

export default function TabLayout() {
  const [showAdd, setShowAdd] = React.useState(false);
  const router = useRouter();
  const { setOpenAddExpensePending } = useMobileDatabase();
  // subscribe to mode changes so theme tokens refresh
  const { mode } = useThemeMode();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.muted,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: theme.colors.glass,
          borderTopColor: 'transparent',
          paddingTop: 8,
          paddingBottom: 12,
          height: 74,
          marginHorizontal: 16,
          marginBottom: 10,
          borderRadius: 20,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
          marginTop: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="home" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{
          title: 'BlueBot',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="chatbubble" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="expenses"
        options={{
          title: 'Expenses',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="pie-chart" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: 'Learn',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="school" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <TabIcon name="person" size={size} color={color} />
          ),
        }}
      />

    </Tabs>
  );
}
