/**
 * Main Dashboard - BlueBot Home Screen
 * Integrated analytics, insights, and gamification features
 */

import React from 'react';
const { useState, useEffect } = React;
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInUp, Layout } from 'react-native-reanimated';
import { theme, shadow } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
// Lightweight custom chart will use simple Views with animations

// Import our contexts
import { useMobileDatabase } from '@/contexts/MobileDatabaseContext';
import { useMobileAuth } from '@/contexts/MobileAuthContext';
import GamificationWidget from '@/components/GamificationWidget';

const { width } = Dimensions.get('window');

interface QuickStat {
  label: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral' | 'warning';
  icon: keyof typeof Ionicons.glyphMap;
}

interface FinancialInsight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'tip';
  title: string;
  message: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export default function Dashboard() {
  const router = useRouter();
  const { user } = useMobileAuth();
  const { expenses, getExpensesByDateRange, getCategoryTotals, setOpenAddExpensePending, addExpense } = useMobileDatabase();
  const [totalBalance, setTotalBalance] = useState(15420.50);
  const [monthlyBudget] = useState(8000);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [userXP, setUserXP] = useState(450); // User's gamification XP

  // Calculate current month expenses
  const currentDate = new Date();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const lastDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
  
  const monthlyExpenses = getExpensesByDateRange(
    firstDayOfMonth.toISOString().split('T')[0],
    lastDayOfMonth.toISOString().split('T')[0]
  );

  const monthlySpent = monthlyExpenses.reduce((sum, expense) => sum + expense.amount, 0);
  const budgetUsed = (monthlySpent / monthlyBudget) * 100;
  const remaining = monthlyBudget - monthlySpent;

  // Generate insights based on spending patterns
  useEffect(() => {
    generateInsights();
  }, [expenses]);

  const generateInsights = () => {
    const newInsights: FinancialInsight[] = [];

    // Budget insight
    if (budgetUsed > 90) {
      newInsights.push({
        id: 'budget-warning',
        type: 'warning',
        title: 'Budget Alert',
        message: `You've used ${budgetUsed.toFixed(0)}% of your monthly budget. Consider reducing discretionary spending.`,
        icon: 'warning-outline'
      });
    } else if (budgetUsed < 70) {
      newInsights.push({
        id: 'budget-good',
        type: 'positive',
        title: 'Great Progress!',
        message: `You're doing well! Only ${budgetUsed.toFixed(0)}% of budget used with ${new Date(lastDayOfMonth.getTime() - currentDate.getTime()).getDate()} days left.`,
        icon: 'checkmark-circle-outline'
      });
    }

    // Category spending insight
    const categoryTotals = getCategoryTotals();
    const topCategory = Object.entries(categoryTotals).sort(([,a], [,b]) => (b as number) - (a as number))[0];
    
    if (topCategory && (topCategory[1] as number) > monthlyBudget * 0.3) {
      newInsights.push({
        id: 'category-spending',
        type: 'tip',
        title: 'Spending Pattern',
        message: `${topCategory[0]} is your highest expense category at R${(topCategory[1] as number).toFixed(2)}. Consider setting a specific budget for this category.`,
        icon: 'analytics-outline'
      });
    }

    // Savings opportunity
    if (remaining > 0) {
      newInsights.push({
        id: 'savings-tip',
        type: 'tip',
        title: 'Savings Opportunity',
        message: `You have R${remaining.toFixed(2)} left in your budget. Consider transferring it to your emergency fund or TFSA.`,
        icon: 'wallet-outline'
      });
    }

    setInsights(newInsights);
  };

  const quickStats: QuickStat[] = [
    {
      label: 'Total Balance',
      value: `R${totalBalance.toFixed(2)}`,
      change: '+R234.50',
      changeType: 'positive',
      icon: 'wallet-outline'
    },
    {
      label: 'Monthly Spent',
      value: `R${monthlySpent.toFixed(2)}`,
      change: `${budgetUsed.toFixed(0)}% of budget`,
      changeType: budgetUsed > 90 ? 'negative' : budgetUsed > 75 ? 'warning' : 'positive',
      icon: 'card-outline'
    },
    {
      label: 'Budget Remaining',
      value: `R${remaining.toFixed(2)}`,
      change: `${Math.max(lastDayOfMonth.getDate() - currentDate.getDate(), 0)} days left`,
      changeType: remaining > 0 ? 'positive' : 'negative',
      icon: 'trending-up-outline'
    },
    {
      label: 'This Week',
      value: 'R456.30',
      change: '-12% vs last week',
      changeType: 'positive',
      icon: 'calendar-outline'
    }
  ];

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'positive':
        return { bg: '#F0FDF4', border: '#10B981', text: '#047857' };
      case 'negative':
        return { bg: '#FEF2F2', border: '#EF4444', text: '#DC2626' };
      case 'warning':
        return { bg: '#FFFBEB', border: '#F59E0B', text: '#D97706' };
      case 'tip':
        return { bg: '#F0F9FF', border: '#0EA5E9', text: '#0284C7' };
      default:
        return { bg: '#F8FAFC', border: '#64748B', text: '#334155' };
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Seed demo expenses for a richer dashboard preview
  const seedDemoData = async () => {
    const today = new Date();
    const ymd = (d: Date) => d.toISOString().slice(0, 10);
    const make = (offset: number, amount: number, category: string, merchant: string, description: string) => ({
      date: ymd(new Date(today.getFullYear(), today.getMonth(), today.getDate() - offset)),
      amount,
      category,
      merchant,
      description,
      isRecurring: false,
      receiptUrl: undefined as string | undefined,
    });
    const samples = [
      make(0, 250.0, 'Fuel', 'Engen', 'Petrol'),
      make(1, 129.99, 'Food & Dining', 'Woolworths', 'Groceries'),
      make(2, 42.5, 'Transportation', 'Uber', 'Work ride'),
      make(3, 319.0, 'Shopping', 'Takealot', 'Household items'),
      make(4, 59.99, 'Entertainment', 'Netflix', 'Subscription'),
      make(5, 85.0, 'Food & Dining', 'Checkers', 'Top-up shop'),
      make(6, 450.0, 'Bills & Utilities', 'Telkom', 'Fibre'),
    ];
    for (const s of samples) {
      try { await addExpense(s as any); } catch {}
    }
    Alert.alert('Demo data added', 'A week of sample expenses was added for preview.');
  };

  // Prepare last 7 days spending for chart
  const last7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const iso = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString(undefined, { weekday: 'short' });
    const amount = expenses.filter(e => e.date === iso).reduce((s, e) => s + e.amount, 0);
    return { day: label, amount };
  });

  return (
  <SafeAreaView style={styles.container}>
  <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
  <LinearGradient colors={theme.gradients.hero as any} style={styles.header}>
          <View style={styles.headerContent}>
            <View>
              <Animated.Text entering={FadeInDown.duration(450)} style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</Animated.Text>
              <Animated.Text entering={FadeInDown.delay(100).duration(450)} style={styles.userName}>{user?.name || 'Welcome to BlueBot'}</Animated.Text>
            </View>
      <View style={{ flexDirection: 'row' }}>
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => Alert.alert('Notifications', 'No new notifications at this time.')}
              >
                <Ionicons name="notifications-outline" size={24} color="#FFFFFF" />
              </TouchableOpacity>
              <TouchableOpacity 
        style={[styles.notificationButton, { marginLeft: 10, backgroundColor: 'rgba(255,255,255,0.15)' }]}
                onPress={seedDemoData}
                accessibilityLabel="Add demo data"
              >
                <Ionicons name="flash-outline" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Balance Overview */}
          <Animated.View entering={FadeInUp.duration(500)} layout={Layout.springify()}>
            <GlassCard style={styles.balanceCard} gradient="nav" border>
              <Text style={styles.balanceLabel}>Total Balance</Text>
              <Text style={styles.balanceAmount}>{formatCurrency(totalBalance)}</Text>
              <View style={styles.balanceChange}>
                <Ionicons name="trending-up" size={16} color="#10B981" />
                <Text style={styles.balanceChangeText}>+2.3% this month</Text>
              </View>
            </GlassCard>
          </Animated.View>
        </LinearGradient>

        {/* Gamification Widget */}
        <View style={styles.gamificationContainer}>
          <GamificationWidget 
            currentXP={userXP} 
            onXPChange={setUserXP}
          />
        </View>

        {/* Quick Stats */}
        <View style={styles.quickStatsContainer}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.quickStatsGrid}>
            {quickStats.map((stat, index) => (
              <Animated.View key={index} entering={FadeInDown.delay(index * 90)} layout={Layout.springify()}>
                <GlassCard style={styles.quickStatCard} border>
                <View style={styles.quickStatHeader}>
                  <Ionicons 
                    name={stat.icon} 
                    size={20} 
                    color="#64748B" 
                  />
                  <Text style={styles.quickStatLabel}>{stat.label}</Text>
                </View>
                <Text style={styles.quickStatValue}>{stat.value}</Text>
                <Text style={[
                  styles.quickStatChange,
                  {
                    color: stat.changeType === 'positive' ? '#10B981' : 
                           stat.changeType === 'negative' ? '#EF4444' : '#F59E0B'
                  }
                ]}>
                  {stat.change}
                </Text>
                </GlassCard>
              </Animated.View>
            ))}
          </View>
        </View>

        {/* Spending Trend */}
        <View style={styles.quickStatsContainer}>
          <Text style={styles.sectionTitle}>Spending Trend (7 days)</Text>
          <GlassCard border>
            <Animated.View entering={FadeInUp.duration(500)} style={styles.barChart}>
              {(() => {
                const maxVal = Math.max(1, ...last7.map(d => d.amount));
                return (
                  <View style={styles.barRow}>
                    {last7.map((d, i) => {
                      const h = Math.max(6, Math.round((d.amount / maxVal) * 120));
                      return (
                        <View key={`barc-${i}`} style={styles.barCol}>
                          <Animated.View entering={FadeInUp.delay(i * 60)} style={[styles.bar, { height: h, backgroundColor: theme.colors.primary }]} />
                          <Text style={styles.barLabel}>{d.day}</Text>
                        </View>
                      );
                    })}
                  </View>
                );
              })()}
            </Animated.View>
          </GlassCard>
        </View>

        {/* Financial Insights */}
        {insights.length > 0 && (
          <View style={styles.insightsContainer}>
            <Text style={styles.sectionTitle}>AI Insights</Text>
            {insights.map((insight, i) => {
              const colors = getInsightColors(insight.type);
              return (
                <Animated.View
                  key={insight.id}
                  entering={FadeInDown.delay(i * 80)}
                  style={[
                    styles.insightCard,
                    {
                      backgroundColor: colors.bg,
                      borderLeftColor: colors.border,
                    }
                  ]}
                >
                  <View style={styles.insightHeader}>
                    <Ionicons name={insight.icon} size={20} color={colors.text} />
                    <Text style={[styles.insightTitle, { color: colors.text }]}>
                      {insight.title}
                    </Text>
                  </View>
                  <Text style={[styles.insightMessage, { color: colors.text }]}>
                    {insight.message}
                  </Text>
                </Animated.View>
              );
            })}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionGrid}>
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => { setOpenAddExpensePending(true); router.push('/(tabs)/expenses'); }}
            >
              <LinearGradient
                colors={theme.gradients.success as any}
                style={styles.actionGradient}
              >
                <Ionicons name="add-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionText}>Add Expense</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/scan-receipt')}
            >
              <LinearGradient
                colors={theme.gradients.info as any}
                style={styles.actionGradient}
              >
                <Ionicons name="camera-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionText}>Scan Receipt</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/expenses')}
            >
              <LinearGradient
                colors={theme.gradients.purple as any}
                style={styles.actionGradient}
              >
                <Ionicons name="analytics-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionText}>View Reports</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.actionButton}
              onPress={() => router.push('/(tabs)/learn')}
            >
              <LinearGradient
                colors={theme.gradients.warning as any}
                style={styles.actionGradient}
              >
                <Ionicons name="school-outline" size={24} color="#FFFFFF" />
                <Text style={styles.actionText}>Learn</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Activity */}
        <View style={styles.recentContainer}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Activity</Text>
            <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
              <Text style={styles.seeAllText}>See All</Text>
            </TouchableOpacity>
          </View>
          {monthlyExpenses.slice(0, 3).map((expense) => (
            <View key={expense.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Ionicons name="receipt-outline" size={20} color="#64748B" />
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>{expense.merchant}</Text>
                <Text style={styles.activitySubtitle}>{expense.category}</Text>
              </View>
              <View style={styles.activityAmount}>
                <Text style={styles.activityAmountText}>
                  -{formatCurrency(expense.amount)}
                </Text>
                <Text style={styles.activityDate}>{expense.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  greeting: {
    fontSize: 16,
    color: theme.colors.muted,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
  backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  ...shadow(8, 0.2),
  },
  balanceCard: {
  backgroundColor: theme.colors.glass,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(96,165,250,0.15)',
  },
  balanceLabel: {
    fontSize: 16,
    color: theme.colors.muted,
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 8,
  },
  balanceChange: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  balanceChangeText: {
    fontSize: 14,
    color: '#10B981',
    marginLeft: 4,
  },
  gamificationContainer: {
    paddingHorizontal: theme.spacing.lg,
  },
  quickStatsContainer: {
    padding: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: theme.spacing.md,
  },
  quickStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickStatCard: {
  backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    width: (width - 60) / 2,
    marginBottom: 12,
  borderWidth: 1,
  borderColor: theme.colors.border,
  ...shadow(6, 0.16),
  },
  quickStatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quickStatLabel: {
    fontSize: 14,
    color: theme.colors.muted,
    marginLeft: 8,
  },
  quickStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginBottom: 4,
  },
  quickStatChange: {
    fontSize: 12,
    fontWeight: '600',
  },
  insightsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  insightCard: {
  borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderLeftWidth: 4,
    backgroundColor: theme.colors.card,
    borderColor: theme.colors.border,
    ...shadow(4, 0.14),
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  insightMessage: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.muted,
  },
  actionsContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionButton: {
    width: (width - 60) / 2,
    marginBottom: 12,
  },
  actionGradient: {
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    height: 80,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
  },
  recentContainer: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  barChart: {
    paddingVertical: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    paddingHorizontal: 6,
  },
  barCol: {
    alignItems: 'center',
    justifyContent: 'flex-end',
    flex: 1,
  },
  bar: {
    width: (width - 60) / 14, // approx half of a quick card width
    borderTopLeftRadius: 6,
    borderTopRightRadius: 6,
    backgroundColor: theme.colors.primary,
  },
  barLabel: {
    marginTop: 6,
    fontSize: 10,
    color: theme.colors.muted,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  seeAllText: {
  fontSize: 14,
  color: theme.colors.accent,
  fontWeight: '600',
  },
  activityItem: {
  backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
    ...shadow(3, 0.12),
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.cardAlt,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: theme.colors.text,
    marginBottom: 2,
  },
  activitySubtitle: {
    fontSize: 14,
    color: theme.colors.muted,
  },
  activityAmount: {
    alignItems: 'flex-end',
  },
  activityAmountText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#EF4444',
    marginBottom: 2,
  },
  activityDate: {
    fontSize: 12,
    color: theme.colors.muted,
  },
});
