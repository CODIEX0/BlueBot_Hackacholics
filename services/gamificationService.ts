/**
 * Gamification Service for BlueBot
 * Handles user achievements, XP, levels, and reward system
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserAchievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  xpReward: number;
  category: 'financial' | 'educational' | 'engagement' | 'milestone';
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlockedAt?: string;
  progress?: number;
  target?: number;
}

export interface UserLevel {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  benefits: string[];
  badge: string;
}

export interface UserStats {
  totalXP: number;
  currentLevel: number;
  currentLevelProgress: number; // 0-100
  nextLevelXP: number;
  achievements: UserAchievement[];
  streakDays: number;
  lastActiveDate: string;
  badges: string[];
  totalExpenses: number;
  totalSavings: number;
  coursesCompleted: number;
  lessonsCompleted: number;
}

// Streak tracking interface
export interface UserStreak {
  type: 'daily_expense' | 'weekly_goal' | 'learning' | 'budget_check';
  currentCount: number;
  bestCount: number;
  lastActivity: string;
  multiplier: number;
}

// Seasonal events interface
export interface SeasonalEvent {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  bonusMultiplier: number;
  specialAchievements: string[];
  isActive: boolean;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  xpReward: number;
  type: 'expense_tracking' | 'savings' | 'learning' | 'budgeting';
  target: number;
  progress: number;
  completed: boolean;
  expiresAt: string;
}

class GamificationService {
  private readonly STORAGE_KEY = 'gamification_data_';
  
  private levels: UserLevel[] = [
    {
      level: 1,
      title: 'Financial Newcomer',
      minXP: 0,
      maxXP: 99,
      benefits: ['Basic expense tracking', 'Daily financial tips'],
      badge: '🌱'
    },
    {
      level: 2,
      title: 'Budget Beginner',
      minXP: 100,
      maxXP: 249,
      benefits: ['Advanced expense categories', 'Weekly insights'],
      badge: '📈'
    },
    {
      level: 3,
      title: 'Savings Starter',
      minXP: 250,
      maxXP: 499,
      benefits: ['Goal tracking', 'Savings challenges'],
      badge: '💰'
    },
    {
      level: 4,
      title: 'Budget Master',
      minXP: 500,
      maxXP: 999,
      benefits: ['Investment tracking', 'Advanced analytics'],
      badge: '🎯'
    },
    {
      level: 5,
      title: 'Financial Guru',
      minXP: 1000,
      maxXP: 1999,
      benefits: ['Crypto features', 'Expert insights'],
      badge: '🧠'
    },
    {
      level: 6,
      title: 'Money Wizard',
      minXP: 2000,
      maxXP: 4999,
      benefits: ['Premium analytics', 'Custom categories'],
      badge: '🔮'
    },
    {
      level: 7,
      title: 'Wealth Builder',
      minXP: 5000,
      maxXP: 9999,
      benefits: ['Investment advice', 'Tax optimization'],
      badge: '🏗️'
    },
    {
      level: 8,
      title: 'Financial Legend',
      minXP: 10000,
      maxXP: 99999,
      benefits: ['All features unlocked', 'Mentor status'],
      badge: '👑'
    }
  ];

  private achievements: UserAchievement[] = [
    // Financial Achievements
    {
      id: 'first_expense',
      title: 'First Step',
      description: 'Track your first expense',
      icon: '👣',
      xpReward: 25,
      category: 'financial',
      rarity: 'common'
    },
    {
      id: 'expense_streak_7',
      title: 'Consistent Tracker',
      description: 'Track expenses for 7 consecutive days',
      icon: '🔥',
      xpReward: 100,
      category: 'financial',
      rarity: 'rare',
      target: 7
    },
    {
      id: 'first_goal',
      title: 'Goal Setter',
      description: 'Create your first savings goal',
      icon: '🎯',
      xpReward: 50,
      category: 'financial',
      rarity: 'common'
    },
    {
      id: 'goal_achieved',
      title: 'Goal Crusher',
      description: 'Achieve your first savings goal',
      icon: '🏆',
      xpReward: 200,
      category: 'financial',
      rarity: 'epic'
    },
    {
      id: 'budget_master',
      title: 'Budget Master',
      description: 'Stay within budget for 3 consecutive months',
      icon: '📊',
      xpReward: 300,
      category: 'financial',
      rarity: 'epic',
      target: 3
    },
    {
      id: 'savings_hero',
      title: 'Savings Hero',
      description: 'Save R10,000 in total',
      icon: '💎',
      xpReward: 500,
      category: 'financial',
      rarity: 'legendary',
      target: 10000
    },

    // Educational Achievements
    {
      id: 'first_lesson',
      title: 'Eager Learner',
      description: 'Complete your first lesson',
      icon: '📚',
      xpReward: 50,
      category: 'educational',
      rarity: 'common'
    },
    {
      id: 'course_completed',
      title: 'Course Graduate',
      description: 'Complete your first course',
      icon: '🎓',
      xpReward: 150,
      category: 'educational',
      rarity: 'rare'
    },
    {
      id: 'quiz_perfect',
      title: 'Perfect Score',
      description: 'Get 100% on a quiz',
      icon: '⭐',
      xpReward: 100,
      category: 'educational',
      rarity: 'rare'
    },
    {
      id: 'knowledge_seeker',
      title: 'Knowledge Seeker',
      description: 'Complete 5 courses',
      icon: '🔍',
      xpReward: 400,
      category: 'educational',
      rarity: 'epic',
      target: 5
    },

    // Engagement Achievements
    {
      id: 'early_bird',
      title: 'Early Bird',
      description: 'Use the app before 8 AM',
      icon: '🌅',
      xpReward: 25,
      category: 'engagement',
      rarity: 'common'
    },
    {
      id: 'night_owl',
      title: 'Night Owl',
      description: 'Use the app after 10 PM',
      icon: '🦉',
      xpReward: 25,
      category: 'engagement',
      rarity: 'common'
    },
    {
      id: 'daily_user',
      title: 'Daily Devotee',
      description: 'Use the app for 30 consecutive days',
      icon: '📅',
      xpReward: 250,
      category: 'engagement',
      rarity: 'epic',
      target: 30
    },
    {
      id: 'ai_chat_master',
      title: 'AI Chat Master',
      description: 'Have 50 conversations with BlueBot',
      icon: '🤖',
      xpReward: 200,
      category: 'engagement',
      rarity: 'rare',
      target: 50
    },

    // Milestone Achievements
    {
      id: 'week_warrior',
      title: 'Week Warrior',
      description: 'Use BlueBot for one week',
      icon: '🗓️',
      xpReward: 75,
      category: 'milestone',
      rarity: 'common'
    },
    {
      id: 'month_champion',
      title: 'Month Champion',
      description: 'Use BlueBot for one month',
      icon: '📆',
      xpReward: 200,
      category: 'milestone',
      rarity: 'rare'
    },
    {
      id: 'bluebot_veteran',
      title: 'BlueBot Veteran',
      description: 'Use BlueBot for six months',
      icon: '🏅',
      xpReward: 500,
      category: 'milestone',
      rarity: 'legendary'
    }
  ];

  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const data = await AsyncStorage.getItem(this.STORAGE_KEY + userId);
      
      if (!data) {
        // Initialize new user stats
        const initialStats: UserStats = {
          totalXP: 0,
          currentLevel: 1,
          currentLevelProgress: 0,
          nextLevelXP: 100,
          achievements: [],
          streakDays: 0,
          lastActiveDate: new Date().toISOString().split('T')[0],
          badges: ['🌱'], // Starting badge
          totalExpenses: 0,
          totalSavings: 0,
          coursesCompleted: 0,
          lessonsCompleted: 0
        };
        
        await this.saveUserStats(userId, initialStats);
        return initialStats;
      }

      return JSON.parse(data);
    } catch (error) {
      console.error('Error getting user stats:', error);
      throw error;
    }
  }

  async saveUserStats(userId: string, stats: UserStats): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY + userId, JSON.stringify(stats));
    } catch (error) {
      console.error('Error saving user stats:', error);
      throw error;
    }
  }

  async addXP(userId: string, xp: number, reason: string): Promise<{
    newLevel: number;
    leveledUp: boolean;
    newAchievements: UserAchievement[];
  }> {
    const stats = await this.getUserStats(userId);
    const oldLevel = stats.currentLevel;
    
    stats.totalXP += xp;
    
    // Check for level up
    const newLevel = this.calculateLevel(stats.totalXP);
    const leveledUp = newLevel > oldLevel;
    
    if (leveledUp) {
      stats.currentLevel = newLevel;
      stats.badges.push(this.levels[newLevel - 1].badge);
    }

    // Update level progress
    const currentLevelInfo = this.levels[stats.currentLevel - 1];
    const nextLevelInfo = this.levels[stats.currentLevel] || this.levels[this.levels.length - 1];
    
    stats.currentLevelProgress = Math.round(
      ((stats.totalXP - currentLevelInfo.minXP) / (nextLevelInfo.minXP - currentLevelInfo.minXP)) * 100
    );
    stats.nextLevelXP = nextLevelInfo.minXP - stats.totalXP;

    // Check for new achievements
    const newAchievements = await this.checkAchievements(userId, stats);
    
    await this.saveUserStats(userId, stats);
    
    return {
      newLevel: stats.currentLevel,
      leveledUp,
      newAchievements
    };
  }

  private calculateLevel(totalXP: number): number {
    for (let i = this.levels.length - 1; i >= 0; i--) {
      if (totalXP >= this.levels[i].minXP) {
        return this.levels[i].level;
      }
    }
    return 1;
  }

  async unlockAchievement(userId: string, achievementId: string): Promise<UserAchievement | null> {
    const stats = await this.getUserStats(userId);
    const achievement = this.achievements.find(a => a.id === achievementId);
    
    if (!achievement) return null;
    
    // Check if already unlocked
    if (stats.achievements.find(a => a.id === achievementId)) {
      return null;
    }

    // Unlock achievement
    const unlockedAchievement: UserAchievement = {
      ...achievement,
      unlockedAt: new Date().toISOString()
    };
    
    stats.achievements.push(unlockedAchievement);
    
    // Add XP reward
    await this.addXP(userId, achievement.xpReward, `Achievement: ${achievement.title}`);
    
    return unlockedAchievement;
  }

  private async checkAchievements(userId: string, stats: UserStats): Promise<UserAchievement[]> {
    const newAchievements: UserAchievement[] = [];
    
    for (const achievement of this.achievements) {
      // Skip if already unlocked
      if (stats.achievements.find(a => a.id === achievement.id)) {
        continue;
      }

      let shouldUnlock = false;

      // Check achievement conditions
      switch (achievement.id) {
        case 'first_expense':
          shouldUnlock = stats.totalExpenses > 0;
          break;
        case 'first_goal':
          // Would check if user has created a goal
          break;
        case 'first_lesson':
          shouldUnlock = stats.lessonsCompleted > 0;
          break;
        case 'course_completed':
          shouldUnlock = stats.coursesCompleted > 0;
          break;
        case 'expense_streak_7':
          shouldUnlock = stats.streakDays >= 7;
          break;
        case 'savings_hero':
          shouldUnlock = stats.totalSavings >= 10000;
          break;
        // Add more achievement checks as needed
      }

      if (shouldUnlock) {
        const unlockedAchievement = await this.unlockAchievement(userId, achievement.id);
        if (unlockedAchievement) {
          newAchievements.push(unlockedAchievement);
        }
      }
    }

    return newAchievements;
  }

  async updateStreak(userId: string): Promise<number> {
    const stats = await this.getUserStats(userId);
    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (stats.lastActiveDate === today) {
      // Already counted today
      return stats.streakDays;
    } else if (stats.lastActiveDate === yesterday) {
      // Consecutive day
      stats.streakDays += 1;
    } else {
      // Streak broken
      stats.streakDays = 1;
    }

    stats.lastActiveDate = today;
    await this.saveUserStats(userId, stats);
    
    return stats.streakDays;
  }

  async getDailyChallenges(userId: string): Promise<DailyChallenge[]> {
    // Generate daily challenges based on user progress and date
    const today = new Date().toISOString().split('T')[0];
    
    const challenges: DailyChallenge[] = [
      {
        id: 'track_expense',
        title: 'Track an Expense',
        description: 'Record at least one expense today',
        xpReward: 25,
        type: 'expense_tracking',
        target: 1,
        progress: 0,
        completed: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'chat_with_ai',
        title: 'Ask BlueBot',
        description: 'Have a conversation with your AI assistant',
        xpReward: 20,
        type: 'learning',
        target: 1,
        progress: 0,
        completed: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      },
      {
        id: 'check_balance',
        title: 'Balance Check',
        description: 'Review your wallet balance',
        xpReward: 15,
        type: 'budgeting',
        target: 1,
        progress: 0,
        completed: false,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      }
    ];

    return challenges;
  }

  getLevels(): UserLevel[] {
    return this.levels;
  }

  getAchievements(): UserAchievement[] {
    return this.achievements;
  }

  getLevelInfo(level: number): UserLevel | null {
    return this.levels.find(l => l.level === level) || null;
  }

  async getLeaderboard(): Promise<Array<{
    userId: string;
    username: string;
    level: number;
    totalXP: number;
    badge: string;
  }>> {
    // In a real app, this would fetch from a server
    // For now, return mock data
    return [
      { userId: '1', username: 'FinanceGuru', level: 7, totalXP: 6500, badge: '🏗️' },
      { userId: '2', username: 'BudgetMaster', level: 6, totalXP: 4200, badge: '🔮' },
      { userId: '3', username: 'SaverPro', level: 5, totalXP: 1800, badge: '🧠' },
    ];
  }

  async recordExpense(userId: string, amount: number): Promise<void> {
    const stats = await this.getUserStats(userId);
    stats.totalExpenses += amount;
    
    // Check for first expense achievement
    if (stats.totalExpenses === amount) {
      await this.unlockAchievement(userId, 'first_expense');
    }
    
    await this.saveUserStats(userId, stats);
  }

  async recordSavings(userId: string, amount: number): Promise<void> {
    const stats = await this.getUserStats(userId);
    stats.totalSavings += amount;
    await this.saveUserStats(userId, stats);
  }

  async recordLessonCompleted(userId: string): Promise<void> {
    const stats = await this.getUserStats(userId);
    stats.lessonsCompleted += 1;
    
    // Check for first lesson achievement
    if (stats.lessonsCompleted === 1) {
      await this.unlockAchievement(userId, 'first_lesson');
    }
    
    await this.saveUserStats(userId, stats);
  }

  async recordCourseCompleted(userId: string): Promise<void> {
    const stats = await this.getUserStats(userId);
    stats.coursesCompleted += 1;
    
    // Check for course completion achievement
    if (stats.coursesCompleted === 1) {
      await this.unlockAchievement(userId, 'course_completed');
    }
    
    await this.saveUserStats(userId, stats);
  }
}

export default new GamificationService();
