import React from 'react';
import { BudgetPlanResult } from '@/services/BudgetRecommendationService';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface BudgetPlanContextValue {
  plan: BudgetPlanResult | null;
  setPlan: (plan: BudgetPlanResult | null) => void;
  clearPlan: () => void;
}

const BudgetPlanContext = React.createContext<BudgetPlanContextValue | undefined>(undefined);

export const BudgetPlanProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [plan, setPlanState] = React.useState<BudgetPlanResult | null>(null);
  const setPlan = (p: BudgetPlanResult | null) => setPlanState(p);
  const clearPlan = () => setPlanState(null);
  const STORAGE_KEY = 'budget.plan.v1';
  const isTest = process.env.NODE_ENV === 'test';

  // Load persisted plan on mount (skip in test env for determinism)
  React.useEffect(() => {
    if (isTest) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (parsed && parsed.version === 1 && parsed.plan) {
          setPlanState(parsed.plan as BudgetPlanResult);
        }
      } catch {
        // silent
      }
    })();
  }, []);

  // Persist plan when it changes (skip test env)
  React.useEffect(() => {
    if (isTest) return;
    (async () => {
      try {
        if (plan) {
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, plan }));
        } else {
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } catch {
        // silent
      }
    })();
  }, [plan]);
  return (
    <BudgetPlanContext.Provider value={{ plan, setPlan, clearPlan }}>
      {children}
    </BudgetPlanContext.Provider>
  );
};

export const useBudgetPlan = () => {
  const ctx = React.useContext(BudgetPlanContext);
  if (!ctx) throw new Error('useBudgetPlan must be used within BudgetPlanProvider');
  return ctx;
};

export default BudgetPlanContext;
