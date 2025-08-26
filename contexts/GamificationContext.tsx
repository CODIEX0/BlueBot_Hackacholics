import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Achievement {
  id: string;
  title: string;
  description: string;
  category: 'savings' | 'budgeting' | 'education' | 'engagement' | 'scanning';
  iconName: string;
  points: number;
  unlocked: boolean;
  unlockedAt?: string;
  progress?: {
    current: number;
    target: number;
  };
}

interface Challenge {
  id: string;
  title: string;
  description: string;
  type: 'daily' | 'weekly' | 'monthly';
  points: number;
  completed: boolean;
  completedAt?: string;
  expiresAt: string;
  progress: {
    current: number;
    target: number;
  };
}

interface UserStats {
  totalPoints: number;
  level: number;
  receiptsScanned: number;
  expensesTracked: number;
  savingsGoalsMet: number;
  lessonsCompleted: number;
  daysActive: number;
  currentStreak: number;
  longestStreak: number;
}

interface GamificationContextType {
  userStats: UserStats;
  achievements: Achievement[];
  challenges: Challenge[];
  loading: boolean;
  
  // Points and levels
  addPoints: (points: number, reason: string) => Promise<void>;
  getCurrentLevel: () => number;
  getPointsToNextLevel: () => number;
  
  // Achievements
  unlockAchievement: (achievementId: string) => Promise<void>;
  checkAchievements: () => Promise<void>;
  
  // Challenges
  updateChallengeProgress: (challengeId: string, progress: number) => Promise<void>;
  completeChallenge: (challengeId: string) => Promise<void>;
  generateDailyChallenges: () => Promise<void>;
  
  // Activities
  recordActivity: (activity: string, value?: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  
  // Utility
  formatPoints: (points: number) => string;
  getLevelName: (level: number) => string;
}

const GamificationContext = createContext<GamificationContextType | undefined>(undefined);

export function useGamification() {
  const context = useContext(GamificationContext);
  if (context === undefined) {
    throw new Error('useGamification must be used within a GamificationProvider');
  }
  return context;
}

interface GamificationProviderProps {
  children: React.ReactNode;
}

export function GamificationProvider({ children }: GamificationProviderProps) {
  const [userStats, setUserStats] = useState<UserStats>({
    totalPoints: 1250,
    level: 3,
    receiptsScanned: 15,
    expensesTracked: 42,
    savingsGoalsMet: 2,
    lessonsCompleted: 8,
    daysActive: 12,
    currentStreak: 5,
    longestStreak: 8,
  });

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadGamificationData();
  }, []);

  const loadGamificationData = async () => {
    try {
      const [storedStats, storedAchievements, storedChallenges] = await Promise.all([
        AsyncStorage.getItem('userStats'),
        AsyncStorage.getItem('achievements'),
        AsyncStorage.getItem('challenges'),
      ]);

      if (storedStats) {
        setUserStats(JSON.parse(storedStats));
      }

      if (storedAchievements) {
        setAchievements(JSON.parse(storedAchievements));
      } else {
        initializeAchievements();
      }

      if (storedChallenges) {
        setChallenges(JSON.parse(storedChallenges));
      } else {
        await generateDailyChallenges();
      }
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializeAchievements = () => {
    const defaultAchievements: Achievement[] = [
      {
        id: 'first_receipt',
        title: 'First Receipt Scan',
        description: 'Scanned your first receipt',
        category: 'scanning',
        iconName: 'camera',
        points: 50,
        unlocked: true,
        unlockedAt: '2025-01-15T10:00:00Z',
      },
      {
        id: 'savings_streak',
        title: 'Savings Streak',
        description: 'Saved money for 7 days straight',
        category: 'savings',
        iconName: 'flame',
        points: 100,
        unlocked: true,
        unlockedAt: '2025-01-18T15:30:00Z',
      },
      {
        id: 'budget_master',
        title: 'Budget Master',
        description: 'Stayed within budget for a full month',
        category: 'budgeting',
        iconName: 'star',
        points: 200,
        unlocked: false,
        progress: {
          current: 18,
          target: 30,
        },
      },
      {
        id: 'ai_helper',
        title: 'AI Helper',
        description: 'Asked BlueBot 50 questions',
        category: 'engagement',
        iconName: 'award',
        points: 150,
        unlocked: false,
        progress: {
          current: 32,
          target: 50,
        },
      },
      {
        id: 'receipt_scanner_pro',
        title: 'Receipt Scanner Pro',
        description: 'Scanned 100 receipts',
        category: 'scanning',
        iconName: 'trophy',
        points: 300,
        unlocked: false,
        progress: {
          current: 15,
          target: 100,
        },
      },
      {
        id: 'financial_student',
        title: 'Financial Student',
        description: 'Completed 10 financial education modules',
        category: 'education',
        iconName: 'book',
        points: 250,
        unlocked: false,
        progress: {
          current: 8,
          target: 10,
        },
      },
    ];

    setAchievements(defaultAchievements);
    AsyncStorage.setItem('achievements', JSON.stringify(defaultAchievements));
  };

  const saveGamificationData = async () => {
    try {
      await Promise.all([
        AsyncStorage.setItem('userStats', JSON.stringify(userStats)),
        AsyncStorage.setItem('achievements', JSON.stringify(achievements)),
        AsyncStorage.setItem('challenges', JSON.stringify(challenges)),
      ]);
    } catch (error) {
      console.error('Error saving gamification data:', error);
    }
  };

  const addPoints = async (points: number, reason: string) => {
    const newStats = {
      ...userStats,
      totalPoints: userStats.totalPoints + points,
    };

    // Check for level up
    const newLevel = getCurrentLevel(newStats.totalPoints);
    if (newLevel > userStats.level) {
      newStats.level = newLevel;
      // Could trigger level up celebration here
    }

    setUserStats(newStats);
    await saveGamificationData();
  };

  const getCurrentLevel = (points?: number) => {
    const totalPoints = points || userStats.totalPoints;
    return Math.floor(totalPoints / 500) + 1; // 500 points per level
  };

  const getPointsToNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const pointsForNextLevel = currentLevel * 500;
    return pointsForNextLevel - userStats.totalPoints;
  };

  const unlockAchievement = async (achievementId: string) => {
    const achievement = achievements.find(a => a.id === achievementId);
    if (!achievement || achievement.unlocked) return;

    const updatedAchievements = achievements.map(a =>
      a.id === achievementId
        ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
        : a
    );

    setAchievements(updatedAchievements);
    await addPoints(achievement.points, `Achievement: ${achievement.title}`);
    await saveGamificationData();
  };

  const checkAchievements = async () => {
    const updates: string[] = [];

    achievements.forEach(achievement => {
      if (achievement.unlocked || !achievement.progress) return;

      let shouldUnlock = false;

      switch (achievement.id) {
        case 'budget_master':
          // Check if user stayed within budget for 30 days
          if (achievement.progress.current >= 30) {
            shouldUnlock = true;
          }
          break;
        case 'ai_helper':
          // This would be updated when user asks questions
          break;
        case 'receipt_scanner_pro':
          if (userStats.receiptsScanned >= 100) {
            shouldUnlock = true;
          }
          break;
        case 'financial_student':
          if (userStats.lessonsCompleted >= 10) {
            shouldUnlock = true;
          }
          break;
      }

      if (shouldUnlock) {
        updates.push(achievement.id);
      }
    });

    for (const achievementId of updates) {
      await unlockAchievement(achievementId);
    }
  };

  const updateChallengeProgress = async (challengeId: string, progress: number) => {
    const updatedChallenges = challenges.map(challenge =>
      challenge.id === challengeId
        ? {
            ...challenge,
            progress: {
              ...challenge.progress,
              current: Math.min(progress, challenge.progress.target),
            },
          }
        : challenge
    );

    setChallenges(updatedChallenges);

    // Check if challenge is completed
    const challenge = updatedChallenges.find(c => c.id === challengeId);
    if (challenge && challenge.progress.current >= challenge.progress.target && !challenge.completed) {
      await completeChallenge(challengeId);
    }

    await saveGamificationData();
  };

  const completeChallenge = async (challengeId: string) => {
    const challenge = challenges.find(c => c.id === challengeId);
    if (!challenge || challenge.completed) return;

    const updatedChallenges = challenges.map(c =>
      c.id === challengeId
        ? { ...c, completed: true, completedAt: new Date().toISOString() }
        : c
    );

    setChallenges(updatedChallenges);
    await addPoints(challenge.points, `Challenge: ${challenge.title}`);
    await saveGamificationData();
  };

  const generateDailyChallenges = async () => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dailyChallenges: Challenge[] = [
      {
        id: 'daily_scan_' + today.getDate(),
        title: 'Scan a Receipt',
        description: 'Scan at least 1 receipt today',
        type: 'daily',
        points: 25,
        completed: false,
        expiresAt: tomorrow.toISOString(),
        progress: {
          current: 0,
          target: 1,
        },
      },
      {
        id: 'daily_expense_' + today.getDate(),
        title: 'Track Expenses',
        description: 'Add 3 expenses to your tracker',
        type: 'daily',
        points: 20,
        completed: false,
        expiresAt: tomorrow.toISOString(),
        progress: {
          current: 0,
          target: 3,
        },
      },
      {
        id: 'daily_ai_' + today.getDate(),
        title: 'Chat with BlueBot',
        description: 'Ask BlueBot 5 questions about your finances',
        type: 'daily',
        points: 30,
        completed: false,
        expiresAt: tomorrow.toISOString(),
        progress: {
          current: 0,
          target: 5,
        },
      },
    ];

    setChallenges(dailyChallenges);
    await saveGamificationData();
  };

  const recordActivity = async (activity: string, value = 1) => {
    const newStats = { ...userStats };

    switch (activity) {
      case 'receipt_scanned':
        newStats.receiptsScanned += value;
        await updateChallengeProgress('daily_scan_' + new Date().getDate(), value);
        break;
      case 'expense_tracked':
        newStats.expensesTracked += value;
        await updateChallengeProgress('daily_expense_' + new Date().getDate(), value);
        break;
      case 'lesson_completed':
        newStats.lessonsCompleted += value;
        break;
      case 'ai_question':
        await updateChallengeProgress('daily_ai_' + new Date().getDate(), value);
        break;
      case 'savings_goal_met':
        newStats.savingsGoalsMet += value;
        break;
    }

    setUserStats(newStats);
    await checkAchievements();
    await saveGamificationData();
  };

  const updateStreak = async () => {
    // This would be called daily to update streak
    const newStats = {
      ...userStats,
      currentStreak: userStats.currentStreak + 1,
      daysActive: userStats.daysActive + 1,
    };

    if (newStats.currentStreak > userStats.longestStreak) {
      newStats.longestStreak = newStats.currentStreak;
    }

    setUserStats(newStats);
    await saveGamificationData();
  };

  const formatPoints = (points: number) => {
    return points.toLocaleString();
  };

  const getLevelName = (level: number) => {
    const levelNames = [
      'Beginner', 'Bronze Saver', 'Silver Tracker', 'Gold Manager',
      'Platinum Investor', 'Diamond Expert', 'Master Financier'
    ];
    
    return levelNames[Math.min(level - 1, levelNames.length - 1)] || 'Financial Guru';
  };

  const value: GamificationContextType = {
    userStats,
    achievements,
    challenges,
    loading,
    addPoints,
    getCurrentLevel,
    getPointsToNextLevel,
    unlockAchievement,
    checkAchievements,
    updateChallengeProgress,
    completeChallenge,
    generateDailyChallenges,
    recordActivity,
    updateStreak,
    formatPoints,
    getLevelName,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

