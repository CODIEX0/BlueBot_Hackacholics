import React from 'react';
import { setThemeMode } from '@/config/theme';
import * as SystemUI from 'expo-system-ui';

type Mode = 'dark' | 'light';

interface ThemeContextValue {
  mode: Mode;
  toggle: () => void;
  setMode: (m: Mode) => void;
}

const ThemeContext = React.createContext<ThemeContextValue>({ mode: 'dark', toggle: () => {}, setMode: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Lock the app to dark mode
  const [mode] = React.useState<Mode>('dark');

  React.useEffect(() => {
    setThemeMode('dark');
    SystemUI.setBackgroundColorAsync('#0A1220').catch(() => {});
  }, []);

  // No-op functions to satisfy consumers
  const setMode = React.useCallback((_m: Mode) => {
    setThemeMode('dark');
  }, []);
  const toggle = React.useCallback(() => {
    setThemeMode('dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ mode: 'dark', toggle, setMode }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeMode() {
  return React.useContext(ThemeContext);
}
