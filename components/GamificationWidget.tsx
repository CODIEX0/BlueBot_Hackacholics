/**
 * Gamification Widget - Level, XP, and Achievement tracking
 * Integrated with the main dashboard
 */

import React from 'react';
const { useState, useEffect } = React;
import { useGamification } from '@/contexts/GamificationContext';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

interface Achievement {
  id: string;
  title: string;
  description: string;
  emoji: string;
  xpReward: number;
  unlocked: boolean;
  unlockedAt?: Date;
  progress?: {
    current: number;
    target: number;
  };
}

interface UserLevel {
  level: number;
  title: string;
  minXP: number;
  maxXP: number;
  benefits: string[];
  badge: string;
}

interface GamificationWidgetProps {
  currentXP?: number; // optional; if omitted will use GamificationContext
  onXPChange?: (newXP: number) => void;
}

export default function GamificationWidget({ currentXP, onXPChange }: GamificationWidgetProps) {
  // Try to pull from gamification context if available and no explicit XP provided
  let contextAvailable = false;
  let ctx: any = null;
  try {
    ctx = useGamification();
    contextAvailable = !!ctx;
  } catch {}
  const effectiveXP = currentXP !== undefined ? currentXP : (contextAvailable ? ctx.userStats.totalPoints : 0);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showLevelInfo, setShowLevelInfo] = useState(false);
  // Animated XP value (defensive: avoid undefined initialization)
  const initialXP = typeof effectiveXP === 'number' && !isNaN(effectiveXP) ? effectiveXP : 0;
  const [animatedXP] = useState(() => new Animated.Value(initialXP));

  const levels: UserLevel[] = [
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
  ];

  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Map context achievements if available; else use a small static fallback
  useEffect(() => {
    if (contextAvailable) {
      const mapped = ctx.achievements.map((a: any) => ({
        id: a.id,
        title: a.title,
        description: a.description,
        emoji: a.iconName === 'trophy' ? '🏆' : a.iconName === 'flame' ? '🔥' : a.iconName === 'camera' ? '📷' : a.iconName === 'book' ? '📚' : '🎯',
        xpReward: a.points,
        unlocked: a.unlocked,
        unlockedAt: a.unlockedAt ? new Date(a.unlockedAt) : undefined,
        progress: a.progress ? { current: a.progress.current, target: a.progress.target } : undefined,
      }));
      setAchievements(mapped);
    } else {
      setAchievements([
        {
          id: 'first-expense',
          title: 'First Step',
          description: 'Add your first expense',
          emoji: '🎯',
          xpReward: 50,
          unlocked: true,
          unlockedAt: new Date(),
        },
      ]);
    }
  }, [contextAvailable, ctx?.achievements]);

  const getCurrentLevel = () => {
    return levels.find(level => effectiveXP >= level.minXP && effectiveXP <= level.maxXP) || levels[0];
  };

  const getNextLevel = () => {
    const currentLevel = getCurrentLevel();
    return levels.find(level => level.level === currentLevel.level + 1);
  };

  const getProgressToNextLevel = () => {
    const currentLevel = getCurrentLevel();
    const nextLevel = getNextLevel();
    
    if (!nextLevel) return 100;
    
  const progressInCurrentLevel = effectiveXP - currentLevel.minXP;
    const totalXPForCurrentLevel = currentLevel.maxXP - currentLevel.minXP + 1;
    
    return (progressInCurrentLevel / totalXPForCurrentLevel) * 100;
  };

  const unlockedAchievements = achievements.filter(a => a.unlocked);
  const progressAchievements = achievements.filter(a => !a.unlocked && a.progress);

  useEffect(() => {
    const target = typeof effectiveXP === 'number' && !isNaN(effectiveXP) ? effectiveXP : 0;
    Animated.timing(animatedXP, {
      toValue: target,
      duration: 500,
      useNativeDriver: false,
    }).start();
  }, [effectiveXP, animatedXP]);

  const handleLevelPress = () => {
    setShowLevelInfo(true);
  };

  const currentLevel = getCurrentLevel();
  const nextLevel = getNextLevel();
  const progressPercent = getProgressToNextLevel();

  return (
    <View style={styles.container}>
      {/* Level and XP Display */}
      <TouchableOpacity onPress={handleLevelPress} style={styles.levelContainer}>
        <LinearGradient
          colors={['#8B5CF6', '#7C3AED']}
          style={styles.levelGradient}
        >
          <View style={styles.levelInfo}>
            <Text style={styles.levelBadge}>{currentLevel.badge}</Text>
            <View style={styles.levelText}>
              <Text style={styles.levelNumber}>Level {currentLevel.level}</Text>
              <Text style={styles.levelTitle}>{currentLevel.title}</Text>
            </View>
            <View style={styles.xpInfo}>
        <Text style={styles.xpText}>{effectiveXP} XP</Text>
              {nextLevel && (
                <Text style={styles.xpNext}>
          {nextLevel.minXP - effectiveXP} to next level
                </Text>
              )}
            </View>
          </View>
          
          {/* Progress Bar */}
          {nextLevel && (
            <View style={styles.progressContainer}>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${progressPercent}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {Math.round(progressPercent)}%
              </Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {/* Achievements Preview */}
      <TouchableOpacity 
        style={styles.achievementsPreview}
        onPress={() => setShowAchievements(true)}
      >
        <View style={styles.achievementHeader}>
          <Ionicons name="trophy-outline" size={20} color="#F59E0B" />
          <Text style={styles.achievementTitle}>Achievements</Text>
          <Text style={styles.achievementCount}>
            {unlockedAchievements.length}/{achievements.length}
          </Text>
        </View>
        
        <View style={styles.achievementsList}>
          {unlockedAchievements.slice(0, 3).map((achievement) => (
            <Text key={achievement.id} style={styles.achievementEmoji}>
              {achievement.emoji}
            </Text>
          ))}
          {unlockedAchievements.length > 3 && (
            <Text style={styles.achievementMore}>
              +{unlockedAchievements.length - 3}
            </Text>
          )}
        </View>
      </TouchableOpacity>

      {/* Level Info Modal */}
      <Modal
        visible={showLevelInfo}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Level Information</Text>
            <TouchableOpacity onPress={() => setShowLevelInfo(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <View style={styles.currentLevelCard}>
              <Text style={styles.currentLevelBadge}>{currentLevel.badge}</Text>
              <Text style={styles.currentLevelTitle}>
                Level {currentLevel.level}: {currentLevel.title}
              </Text>
              <Text style={styles.currentLevelXP}>
                {currentLevel.minXP} - {currentLevel.maxXP} XP
              </Text>
              
              <Text style={styles.benefitsTitle}>Benefits:</Text>
              {currentLevel.benefits.map((benefit, index) => (
                <Text key={index} style={styles.benefitItem}>
                  • {benefit}
                </Text>
              ))}
            </View>

            {nextLevel && (
              <View style={styles.nextLevelCard}>
                <Text style={styles.nextLevelTitle}>
                  Next: Level {nextLevel.level} - {nextLevel.title}
                </Text>
                <Text style={styles.nextLevelXP}>
                  Requires {nextLevel.minXP} XP ({nextLevel.minXP - effectiveXP} more needed)
                </Text>
                
                <Text style={styles.benefitsTitle}>New Benefits:</Text>
                {nextLevel.benefits.map((benefit, index) => (
                  <Text key={index} style={styles.benefitItem}>
                    • {benefit}
                  </Text>
                ))}
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Achievements Modal */}
      <Modal
        visible={showAchievements}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Achievements</Text>
            <TouchableOpacity onPress={() => setShowAchievements(false)}>
              <Ionicons name="close" size={24} color="#64748B" />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent}>
            <Text style={styles.sectionTitle}>Unlocked</Text>
            {unlockedAchievements.map((achievement) => (
              <View key={achievement.id} style={styles.achievementCard}>
                <Text style={styles.achievementCardEmoji}>{achievement.emoji}</Text>
                <View style={styles.achievementCardContent}>
                  <Text style={styles.achievementCardTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementCardDescription}>
                    {achievement.description}
                  </Text>
                  <Text style={styles.achievementCardXP}>+{achievement.xpReward} XP</Text>
                </View>
                <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              </View>
            ))}

            <Text style={styles.sectionTitle}>In Progress</Text>
            {progressAchievements.map((achievement) => (
              <View key={achievement.id} style={[styles.achievementCard, styles.progressCard]}>
                <Text style={styles.achievementCardEmoji}>{achievement.emoji}</Text>
                <View style={styles.achievementCardContent}>
                  <Text style={styles.achievementCardTitle}>{achievement.title}</Text>
                  <Text style={styles.achievementCardDescription}>
                    {achievement.description}
                  </Text>
                  {achievement.progress && (
                    <View style={styles.progressContainer}>
                      <View style={styles.progressBar}>
                        <View 
                          style={[
                            styles.progressFill, 
                            { 
                              width: `${(achievement.progress.current / achievement.progress.target) * 100}%`,
                              backgroundColor: '#F59E0B'
                            }
                          ]} 
                        />
                      </View>
                      <Text style={styles.progressText}>
                        {achievement.progress.current}/{achievement.progress.target}
                      </Text>
                    </View>
                  )}
                  <Text style={styles.achievementCardXP}>+{achievement.xpReward} XP</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  levelContainer: {
    marginBottom: 12,
  },
  levelGradient: {
    borderRadius: 16,
    padding: 20,
  },
  levelInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelBadge: {
    fontSize: 32,
    marginRight: 16,
  },
  levelText: {
    flex: 1,
  },
  levelNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  levelTitle: {
    fontSize: 14,
    color: '#E2E8F0',
  },
  xpInfo: {
    alignItems: 'flex-end',
  },
  xpText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  xpNext: {
    fontSize: 12,
    color: '#E2E8F0',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 4,
    marginRight: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    minWidth: 35,
    textAlign: 'right',
  },
  achievementsPreview: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  achievementHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
    marginLeft: 8,
  },
  achievementCount: {
    fontSize: 14,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  achievementsList: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  achievementEmoji: {
    fontSize: 24,
    marginRight: 8,
  },
  achievementMore: {
    fontSize: 14,
    color: '#64748B',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  currentLevelCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  currentLevelBadge: {
    fontSize: 48,
    marginBottom: 12,
  },
  currentLevelTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  currentLevelXP: {
    fontSize: 16,
    color: '#64748B',
    marginBottom: 16,
  },
  benefitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  benefitItem: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 4,
    alignSelf: 'flex-start',
  },
  nextLevelCard: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  nextLevelTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 8,
  },
  nextLevelXP: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 16,
    marginTop: 8,
  },
  achievementCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  achievementCardEmoji: {
    fontSize: 24,
    marginRight: 16,
  },
  achievementCardContent: {
    flex: 1,
  },
  achievementCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 4,
  },
  achievementCardDescription: {
    fontSize: 14,
    color: '#64748B',
    marginBottom: 8,
  },
  achievementCardXP: {
    fontSize: 12,
    color: '#10B981',
    fontWeight: '600',
  },
});
