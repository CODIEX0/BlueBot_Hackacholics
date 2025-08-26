import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { MobileAuthProvider } from '@/contexts/MobileAuthContext';
import { MobileDatabaseProvider } from '@/contexts/MobileDatabaseContext';
import { WalletProvider } from '@/contexts/WalletContext';
import { GamificationProvider } from '@/contexts/GamificationContext';
import { CryptoWalletProvider } from '@/contexts/SimpleCryptoWalletContext';
import { ThemeProvider } from '@/contexts/ThemeContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <MobileDatabaseProvider>
      <AuthProvider>
        <MobileAuthProvider>
          <WalletProvider>
            <CryptoWalletProvider>
              <GamificationProvider>
                <ThemeProvider>
                <Stack screenOptions={{ headerShown: false }}>
                  <Stack.Screen name="(auth)" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="privacy-policy" options={{ headerShown: false }} />
                  <Stack.Screen name="terms-conditions" options={{ headerShown: false }} />
                  <Stack.Screen name="financial-education" options={{ headerShown: false }} />
                  <Stack.Screen name="+not-found" />
                </Stack>
                <StatusBar style="light" />
                </ThemeProvider>
              
              </GamificationProvider>
            </CryptoWalletProvider>
          </WalletProvider>
        </MobileAuthProvider>
      </AuthProvider>
    </MobileDatabaseProvider>
  );
}

// Dark-only: no dynamic StatusBar switching required

