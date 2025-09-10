import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AWSProvider } from '@/contexts/AWSContext';
import { AccountIntegrationProvider } from '@/contexts/AccountIntegrationContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { BalanceProvider } from '@/contexts/BalanceContext';
import { BudgetPlanProvider } from '@/contexts/BudgetPlanContext';
import { GoalsProvider } from '@/contexts/GoalsContext';

export default function RootLayout() {
  return (
    <AWSProvider>
      <AccountIntegrationProvider>
      <GamificationProvider>
        <GoalsProvider>
        <ThemeProvider>
          <BalanceProvider>
            <BudgetPlanProvider>
          <Stack initialRouteName="(tabs)" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="financial-education" options={{ headerShown: false }} />
            <Stack.Screen name="add-expense" options={{ headerShown: false }} />
            <Stack.Screen name="scan-receipt" options={{ headerShown: false }} />
            <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
            <Stack.Screen name="profile" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="light" />
            </BudgetPlanProvider>
          </BalanceProvider>
        </ThemeProvider>
        </GoalsProvider>
      </GamificationProvider>
      </AccountIntegrationProvider>
    </AWSProvider>
  );
}

