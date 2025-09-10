import React from 'react';
const { useState, useEffect, useCallback, useContext, createContext } = React;
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGamification } from '@/contexts/GamificationContext';

export interface Goal {
  id: string;
  title: string;
  category: string;
  current: number;
  target: number;
  createdAt: string;
  updatedAt: string;
  archived?: boolean;
  completedAt?: string; // set when goal first reaches target
}

interface GoalsContextType {
  goals: Goal[];
  loading: boolean;
  addGoal: (goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateGoalProgress: (id: string, newCurrent: number) => Promise<void>;
  updateGoalDetails: (id: string, updates: Partial<Pick<Goal, 'title' | 'target' | 'category'>>) => Promise<void>;
  removeGoal: (id: string) => Promise<void>;
  archiveGoal: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

export function useGoals() {
  const ctx = useContext(GoalsContext);
  if (!ctx) throw new Error('useGoals must be used within GoalsProvider');
  return ctx;
}

const STORAGE_KEY = 'user.goals.v1';

const defaultGoals: Goal[] = [
  { id: 'g1', title: 'Emergency Fund', category: 'savings', current: 15000, target: 50000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'g2', title: 'Vacation', category: 'lifestyle', current: 8500, target: 15000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
  { id: 'g3', title: 'New Car', category: 'asset', current: 75000, target: 250000, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() },
];

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  // Gamification context (safe inside provider tree per _layout.tsx ordering)
  let gamification: any = null;
  try { gamification = useGamification(); } catch { /* if provider not mounted yet (unlikely) */ }

  const load = useCallback(async () => {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Goal[] = JSON.parse(raw);
        setGoals(parsed);
      } else {
        setGoals(defaultGoals);
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultGoals));
      }
    } catch (e) {
      console.warn('Failed to load goals', e);
      setGoals(defaultGoals);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const persist = async (next: Goal[]) => {
    setGoals(next);
    try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  };

  const addGoal = async (goalInput: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
    const now = new Date().toISOString();
    const g: Goal = { ...goalInput, id: 'g_' + Date.now().toString(36), createdAt: now, updatedAt: now };
    // Immediately mark completed if already at/over target (edge case)
    if (g.current >= g.target) {
      g.completedAt = now;
    }
    await persist([...goals, g]);
    if (g.completedAt && gamification) {
      // Award points based on goal size (simple heuristic: base 50 + scaled)
      const pts = 50 + Math.min(150, Math.round(g.target / 500));
      gamification.addPoints?.(pts, `Completed goal: ${g.title}`);
      gamification.recordActivity?.('savings_goal_met', 1);
    }
  };

  const updateGoalProgress = async (id: string, newCurrent: number) => {
    const now = new Date().toISOString();
    let awardedGoal: Goal | undefined;
    const next = goals.map(g => {
      if (g.id !== id) return g;
      const updatedCurrent = Math.min(newCurrent, g.target);
      let completedAt = g.completedAt;
      if (!completedAt && updatedCurrent >= g.target) {
        completedAt = now;
        awardedGoal = { ...g, current: updatedCurrent, completedAt };
      }
      return { ...g, current: updatedCurrent, updatedAt: now, completedAt };
    });
    await persist(next);
    if (awardedGoal && gamification) {
      const pts = 50 + Math.min(150, Math.round(awardedGoal.target / 500));
      gamification.addPoints?.(pts, `Completed goal: ${awardedGoal.title}`);
      gamification.recordActivity?.('savings_goal_met', 1);
      gamification.checkAchievements?.();
    }
  };

  const updateGoalDetails = async (id: string, updates: Partial<Pick<Goal, 'title' | 'target' | 'category'>>) => {
    const now = new Date().toISOString();
    const next = goals.map(g => {
      if (g.id !== id) return g;
      let current = g.current;
      // If target reduced below current, clamp current to new target
      if (updates.target && updates.target < current) current = updates.target;
      let completedAt = g.completedAt;
      if (!completedAt && current >= (updates.target ?? g.target)) {
        completedAt = now;
      }
      return { ...g, ...updates, current, updatedAt: now, completedAt };
    });
    await persist(next);
  };

  const removeGoal = async (id: string) => {
    await persist(goals.filter(g => g.id !== id));
  };

  const archiveGoal = async (id: string) => {
    await persist(goals.map(g => g.id === id ? { ...g, archived: true, updatedAt: new Date().toISOString() } : g));
  };

  const value: GoalsContextType = {
    goals: goals.filter(g => !g.archived),
    loading,
    addGoal,
    updateGoalProgress,
  updateGoalDetails,
    removeGoal,
    archiveGoal,
    refresh: load,
  };

  return <GoalsContext.Provider value={value}>{children}</GoalsContext.Provider>;
}

// Testing helper (non-production usage) to exercise goal logic without React tree
export function __TESTING__createGoalsManager(initial: Goal[] = defaultGoals, gamification?: any) {
  let goals = [...initial];
  const persist = async (next: Goal[]) => { goals = next; };
  return {
    getGoals: () => goals.filter(g=>!g.archived),
    addGoal: async (goalInput: Omit<Goal, 'id' | 'createdAt' | 'updatedAt'>) => {
      const now = new Date().toISOString();
      const g: Goal = { ...goalInput, id: 'g_' + Date.now().toString(36), createdAt: now, updatedAt: now };
      if (g.current >= g.target) g.completedAt = now;
      await persist([...goals, g]);
      if (g.completedAt && gamification) {
        const pts = 50 + Math.min(150, Math.round(g.target / 500));
        gamification.addPoints?.(pts, `Completed goal: ${g.title}`);
        gamification.recordActivity?.('savings_goal_met', 1);
      }
    },
    updateGoalProgress: async (id: string, newCurrent: number) => {
      const now = new Date().toISOString();
      let awarded: Goal | undefined;
      const next = goals.map(g => {
        if (g.id !== id) return g;
        const updatedCurrent = Math.min(newCurrent, g.target);
        let completedAt = g.completedAt;
        if (!completedAt && updatedCurrent >= g.target) {
          completedAt = now; awarded = { ...g, current: updatedCurrent, completedAt };
        }
        return { ...g, current: updatedCurrent, updatedAt: now, completedAt };
      });
      await persist(next);
      if (awarded && gamification) {
        const pts = 50 + Math.min(150, Math.round(awarded.target / 500));
        gamification.addPoints?.(pts, `Completed goal: ${awarded.title}`);
        gamification.recordActivity?.('savings_goal_met', 1);
        gamification.checkAchievements?.();
      }
    },
    updateGoalDetails: async (id: string, updates: Partial<Pick<Goal, 'title' | 'target' | 'category'>>) => {
      const now = new Date().toISOString();
      goals = goals.map(g => {
        if (g.id !== id) return g;
        let current = g.current;
        if (updates.target && updates.target < current) current = updates.target;
        let completedAt = g.completedAt;
        if (!completedAt && current >= (updates.target ?? g.target)) completedAt = now;
        return { ...g, ...updates, current, updatedAt: now, completedAt };
      });
    },
    removeGoal: async (id: string) => { goals = goals.filter(g=>g.id!==id); },
    archiveGoal: async (id: string) => { goals = goals.map(g=>g.id===id?{...g, archived:true, updatedAt:new Date().toISOString()}:g); },
  };
}
