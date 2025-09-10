import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_TOTAL_BALANCE } from '@/config/app';
import { useAWS } from '@/contexts/AWSContext';

type BalanceContextType = {
  currentBalance: number;
  setBalance: (value: number) => Promise<void>;
};

const BalanceContext = React.createContext<BalanceContextType | undefined>(undefined);

export const BalanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { userData } = useAWS() || {};
  const [currentBalance, setCurrentBalance] = React.useState<number>(DEFAULT_TOTAL_BALANCE);

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // Prefer stored value; else AWS userData; else default
        const stored = await AsyncStorage.getItem('user.balance');
        const initial = stored != null ? Number(stored) : (typeof (userData as any)?.balance === 'number' ? (userData as any).balance : DEFAULT_TOTAL_BALANCE);
        if (mounted) setCurrentBalance(isFinite(initial) ? initial : DEFAULT_TOTAL_BALANCE);
      } catch {
        if (mounted) setCurrentBalance(DEFAULT_TOTAL_BALANCE);
      }
    })();
    return () => { mounted = false; };
  }, [userData]);

  const setBalance = React.useCallback(async (value: number) => {
    const v = Number(value);
    const safe = isFinite(v) ? v : 0;
    setCurrentBalance(safe);
    try { await AsyncStorage.setItem('user.balance', String(safe)); } catch {}
  }, []);

  const ctx = React.useMemo(() => ({ currentBalance, setBalance }), [currentBalance, setBalance]);

  return <BalanceContext.Provider value={ctx}>{children}</BalanceContext.Provider>;
};

export const useBalance = () => {
  const ctx = React.useContext(BalanceContext);
  if (!ctx) throw new Error('useBalance must be used within BalanceProvider');
  return ctx;
};
