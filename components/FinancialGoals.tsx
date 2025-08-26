import React from 'react';
const { useState, useCallback, useEffect, useRef, useContext, createContext } = React;
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  TextInput,
  Modal,
} from 'react-native';

interface FinancialGoal {
  id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  category: 'emergency' | 'savings' | 'investment' | 'debt-payoff' | 'purchase' | 'retirement';
  targetDate: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
}

const GOAL_CATEGORIES = {
  emergency: { name: 'Emergency Fund', color: '#EF4444', emoji: '🚨' },
  savings: { name: 'General Savings', color: '#10B981', emoji: '💰' },
  investment: { name: 'Investment', color: '#0EA5E9', emoji: '📈' },
  'debt-payoff': { name: 'Debt Payoff', color: '#F59E0B', emoji: '💳' },
  purchase: { name: 'Major Purchase', color: '#8B5CF6', emoji: '🛒' },
  retirement: { name: 'Retirement', color: '#6B7280', emoji: '🏖️' },
};

export default function FinancialGoals() {
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [showAddGoal, setShowAddGoal] = useState(false);
  const [newGoal, setNewGoal] = useState({
    title: '',
    targetAmount: '',
    category: 'savings' as keyof typeof GOAL_CATEGORIES,
    targetDate: '',
    description: '',
  });

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = () => {
    // Mock data for now - this would come from database
    const mockGoals: FinancialGoal[] = [
      {
        id: '1',
        title: 'Emergency Fund',
        targetAmount: 50000,
        currentAmount: 32500,
        category: 'emergency',
        targetDate: '2025-12-31',
        description: 'Build emergency fund covering 6 months of expenses',
        isActive: true,
        createdAt: '2025-01-01',
      },
      {
        id: '2',
        title: 'New Car',
        targetAmount: 250000,
        currentAmount: 75000,
        category: 'purchase',
        targetDate: '2025-08-15',
        description: 'Save for a reliable family car',
        isActive: true,
        createdAt: '2024-12-01',
      },
      {
        id: '3',
        title: 'Vacation Fund',
        targetAmount: 15000,
        currentAmount: 8500,
        category: 'savings',
        targetDate: '2025-07-01',
        description: 'Family vacation to Cape Town',
        isActive: true,
        createdAt: '2025-01-15',
      },
    ];
    setGoals(mockGoals);
  };

  const handleAddGoal = () => {
    if (!newGoal.title || !newGoal.targetAmount) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    const goal: FinancialGoal = {
      id: Math.random().toString(36).substr(2, 9),
      title: newGoal.title,
      targetAmount: parseFloat(newGoal.targetAmount),
      currentAmount: 0,
      category: newGoal.category,
      targetDate: newGoal.targetDate,
      description: newGoal.description,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    setGoals([...goals, goal]);
    setNewGoal({
      title: '',
      targetAmount: '',
      category: 'savings',
      targetDate: '',
      description: '',
    });
    setShowAddGoal(false);
    Alert.alert('Success', 'Goal created successfully!');
  };

  const handleAddContribution = (goalId: string) => {
    if (Alert.prompt) {
      Alert.prompt(
        'Add Contribution',
        'How much would you like to add to this goal?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Add',
            onPress: (amount) => {
              if (amount && !isNaN(parseFloat(amount))) {
                const updatedGoals = goals.map(goal => 
                  goal.id === goalId 
                    ? { ...goal, currentAmount: goal.currentAmount + parseFloat(amount) }
                    : goal
                );
                setGoals(updatedGoals);
                Alert.alert('Success', `R${amount} added to your goal!`);
              }
            }
          }
        ],
        'plain-text',
        '',
        'numeric'
      );
    } else {
      // Fallback for platforms that don't support Alert.prompt
      Alert.alert(
        'Add Contribution',
        'This feature requires a text input dialog which is not available on this platform.',
        [{ text: 'OK' }]
      );
    }
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getProgress = (current: number, target: number) => {
    return Math.min((current / target) * 100, 100);
  };

  const getDaysRemaining = (targetDate: string) => {
    const target = new Date(targetDate);
    const today = new Date();
    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getProgressStatus = (progress: number) => {
    if (progress >= 100) return { color: '#10B981', text: 'Completed!' };
    if (progress >= 75) return { color: '#10B981', text: 'Almost there!' };
    if (progress >= 50) return { color: '#F59E0B', text: 'Good progress' };
    if (progress >= 25) return { color: '#0EA5E9', text: 'Getting started' };
    return { color: '#64748B', text: 'Just started' };
  };

  const totalGoalAmount = goals.reduce((sum, goal) => sum + goal.targetAmount, 0);
  const totalSavedAmount = goals.reduce((sum, goal) => sum + goal.currentAmount, 0);
  const overallProgress = totalGoalAmount > 0 ? (totalSavedAmount / totalGoalAmount) * 100 : 0;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Financial Goals</Text>
          <TouchableOpacity 
            style={styles.addButton}
            onPress={() => setShowAddGoal(true)}
          >
            <Text style={styles.addButtonText}>+ Goal</Text>
          </TouchableOpacity>
        </View>

        {/* Overall Progress */}
        <View style={styles.overallCard}>
          <Text style={styles.overallTitle}>Overall Progress</Text>
          <View style={styles.overallStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(totalSavedAmount)}</Text>
              <Text style={styles.statLabel}>Total Saved</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{formatCurrency(totalGoalAmount)}</Text>
              <Text style={styles.statLabel}>Total Goals</Text>
            </View>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{overallProgress.toFixed(1)}%</Text>
              <Text style={styles.statLabel}>Complete</Text>
            </View>
          </View>
          
          <View style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(overallProgress, 100)}%` }
                ]} 
              />
            </View>
          </View>
        </View>

        {/* Goals List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Goals</Text>
          
          {goals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No goals set yet</Text>
              <Text style={styles.emptyStateSubtext}>
                Create your first financial goal to start saving with purpose
              </Text>
            </View>
          ) : (
            goals.map((goal) => {
              const progress = getProgress(goal.currentAmount, goal.targetAmount);
              const progressStatus = getProgressStatus(progress);
              const daysRemaining = getDaysRemaining(goal.targetDate);
              const categoryInfo = GOAL_CATEGORIES[goal.category];

              return (
                <View key={goal.id} style={styles.goalCard}>
                  <View style={styles.goalHeader}>
                    <View style={styles.goalTitleContainer}>
                      <Text style={styles.goalEmoji}>{categoryInfo.emoji}</Text>
                      <View>
                        <Text style={styles.goalTitle}>{goal.title}</Text>
                        <Text style={styles.goalCategory}>{categoryInfo.name}</Text>
                      </View>
                    </View>
                    <TouchableOpacity 
                      style={[
                        styles.contributeButton,
                        { backgroundColor: categoryInfo.color }
                      ]}
                      onPress={() => handleAddContribution(goal.id)}
                    >
                      <Text style={styles.contributeButtonText}>+ Add</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.goalProgress}>
                    <View style={styles.goalAmounts}>
                      <Text style={styles.currentAmount}>
                        {formatCurrency(goal.currentAmount)}
                      </Text>
                      <Text style={styles.targetAmount}>
                        of {formatCurrency(goal.targetAmount)}
                      </Text>
                    </View>
                    
                    <View style={styles.progressBarContainer}>
                      <View style={styles.progressBarBackground}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { 
                              width: `${Math.min(progress, 100)}%`,
                              backgroundColor: categoryInfo.color
                            }
                          ]} 
                        />
                      </View>
                    </View>

                    <View style={styles.goalStats}>
                      <Text style={[styles.progressText, { color: progressStatus.color }]}>
                        {progress.toFixed(1)}% • {progressStatus.text}
                      </Text>
                      <Text style={styles.daysText}>
                        {daysRemaining > 0 ? `${daysRemaining} days left` : 'Overdue'}
                      </Text>
                    </View>
                  </View>

                  {goal.description && (
                    <Text style={styles.goalDescription}>{goal.description}</Text>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Quick Tips */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Savings Tips</Text>
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>💡</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipText}>
                Set up automatic transfers to reach your goals faster. Even R50/week adds up!
              </Text>
            </View>
          </View>
          
          <View style={styles.tipCard}>
            <Text style={styles.tipEmoji}>🎯</Text>
            <View style={styles.tipContent}>
              <Text style={styles.tipText}>
                Make your goals specific and time-bound for better success rates.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Add Goal Modal */}
      <Modal
        visible={showAddGoal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddGoal(false)}>
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>New Goal</Text>
            <TouchableOpacity onPress={handleAddGoal}>
              <Text style={styles.modalSaveText}>Save</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Goal Title</Text>
              <TextInput
                style={styles.textInput}
                value={newGoal.title}
                onChangeText={(text) => setNewGoal({ ...newGoal, title: text })}
                placeholder="e.g., Emergency Fund"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Amount (R)</Text>
              <TextInput
                style={styles.textInput}
                value={newGoal.targetAmount}
                onChangeText={(text) => setNewGoal({ ...newGoal, targetAmount: text })}
                placeholder="0.00"
                keyboardType="numeric"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.categoryOptions}>
                  {Object.entries(GOAL_CATEGORIES).map(([key, category]) => (
                    <TouchableOpacity
                      key={key}
                      style={[
                        styles.categoryOption,
                        newGoal.category === key && styles.categoryOptionSelected,
                        { borderColor: category.color }
                      ]}
                      onPress={() => setNewGoal({ ...newGoal, category: key as keyof typeof GOAL_CATEGORIES })}
                    >
                      <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                      <Text style={styles.categoryName}>{category.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Target Date</Text>
              <TextInput
                style={styles.textInput}
                value={newGoal.targetDate}
                onChangeText={(text) => setNewGoal({ ...newGoal, targetDate: text })}
                placeholder="YYYY-MM-DD"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Description (Optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textAreaInput]}
                value={newGoal.description}
                onChangeText={(text) => setNewGoal({ ...newGoal, description: text })}
                placeholder="Add details about your goal..."
                multiline
                numberOfLines={3}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  addButton: {
    backgroundColor: '#1E3A8A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  overallCard: {
    backgroundColor: '#FFFFFF',
    margin: 20,
    padding: 24,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  overallTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  overallStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1E3A8A',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
  },
  progressBarContainer: {
    marginTop: 8,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#10B981',
    borderRadius: 4,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#64748B',
    marginBottom: 4,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
  },
  goalCard: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  goalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goalEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  goalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
    marginBottom: 2,
  },
  goalCategory: {
    fontSize: 14,
    color: '#64748B',
  },
  contributeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  contributeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  goalProgress: {
    marginBottom: 12,
  },
  goalAmounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  currentAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1E3A8A',
  },
  targetAmount: {
    fontSize: 14,
    color: '#64748B',
  },
  goalStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  daysText: {
    fontSize: 12,
    color: '#64748B',
  },
  goalDescription: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
  },
  tipCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  tipEmoji: {
    fontSize: 20,
    marginRight: 12,
  },
  tipContent: {
    flex: 1,
  },
  tipText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  modalCancelText: {
    fontSize: 16,
    color: '#64748B',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  modalSaveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E3A8A',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: '#FFFFFF',
  },
  textAreaInput: {
    height: 80,
    textAlignVertical: 'top',
  },
  categoryOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  categoryOption: {
    alignItems: 'center',
    padding: 12,
    borderWidth: 2,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    minWidth: 80,
  },
  categoryOptionSelected: {
    backgroundColor: '#F0F9FF',
  },
  categoryEmoji: {
    fontSize: 20,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 10,
    color: '#374151',
    textAlign: 'center',
    fontWeight: '500',
  },
});


