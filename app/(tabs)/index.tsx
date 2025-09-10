/**
 * Dashboard Tab - Main Financial Overview
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
import AWSServiceStatus from '@/components/AWSServiceStatus';
import BudgetProgress from '@/components/BudgetProgress';
import WellbeingScoreCard from '@/components/WellbeingScoreCard';
import { wellbeingScoreService, WellbeingScoreResult } from '@/services/WellbeingScoreService';
import FinancialInsights from '@/components/FinancialInsights';
import { financialNarrativeService } from '@/services/FinancialNarrativeService';
import { useBudgetPlan } from '@/contexts/BudgetPlanContext';
import { standardBankService } from '@/services/StandardBankService';
import { DEFAULT_TOTAL_BALANCE } from '@/config/app';
import { useBalance } from '@/contexts/BalanceContext';

// Contexts
import { useAWS } from '@/contexts/AWSContext';
import { useAccountsIntegration } from '@/contexts/AccountIntegrationContext';
import GamificationWidget from '@/components/GamificationWidget';

// Hook to safely get window dimensions
const useWindowDimensions = () => {
  const [dimensions, setDimensions] = useState(() => {
    try {
      return Dimensions.get('window');
    } catch (error) {
      console.warn('Dimensions not available during initial render, using fallback', error);
      return { width: 375, height: 812 };
    }
  });

  useEffect(() => {
    const updateDimensions = () => {
      try {
        setDimensions(Dimensions.get('window'));
      } catch (error) {
        console.warn('Dimensions not available during update, keeping current', error);
      }
    };

    const subscription = Dimensions.addEventListener('change', updateDimensions);
    
    return () => subscription?.remove();
  }, []);

  return dimensions;
};

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
  const [editBalanceVisible, setEditBalanceVisible] = useState(false);
  
  // AWS Context with fallback to demo mode
  const aws = useAWS();
  const accountsFeed = useAccountsIntegration();
  const { currentUser, isAuthenticated, isInitialized, serviceStatus, createExpense } = aws || {};
  // Replace expenses with simulated feed (converted)
  const expenses = React.useMemo(() => {
    // accountsFeed.expenseLike has {amount, category, date, isRecurring}
    // For dashboard components expecting expenseId/description we synthesize minimal fields.
    return accountsFeed.expenseLike.map((e, idx) => ({
      expenseId: `sim_${idx}`,
      amount: e.amount,
      category: e.category || 'Other',
      description: e.category || 'Expense',
      date: (e.date || '').slice(0,10),
      isRecurring: e.isRecurring,
    }));
  }, [accountsFeed.expenseLike]);
  const displayExpenses = expenses; // no demo fallback for cleaner dashboard
  const user = currentUser || { firstName: 'Demo', email: 'demo@bluebot.com' };
  
  const { width } = useWindowDimensions(); // Use the hook here
  const { currentBalance, setBalance } = useBalance();
  const [monthlyBudget] = useState(12000);
  const [insights, setInsights] = useState<FinancialInsight[]>([]);
  const [userXP, setUserXP] = useState(450);
  const [wellbeing, setWellbeing] = useState<WellbeingScoreResult | null>(null);
  const [narrative, setNarrative] = useState<string>('');
  const [narrativeHighlights, setNarrativeHighlights] = useState<string[]>([]);
  const { plan: budgetPlan } = useBudgetPlan();

  // Helper functions for demo/AWS mode
  const getExpensesByDateRange = (startDate: string, endDate: string) => {
    return displayExpenses.filter(expense => {
      const expenseDate = new Date(expense.date);
      return expenseDate >= new Date(startDate) && expenseDate <= new Date(endDate);
    });
  };

  const getCategoryTotals = () => {
    const totals: Record<string, number> = {};
    displayExpenses.forEach(expense => {
      totals[expense.category] = (totals[expense.category] || 0) + expense.amount;
    });
    return totals;
  };

  // Demo budgets (ZAR) per category
  const demoBudgetCategories: { name: string; budget: number; color: string }[] = [
    { name: 'Food & Dining', budget: 3500, color: theme.colors.primary },
    { name: 'Transportation', budget: 1800, color: theme.colors.success },
    { name: 'Shopping', budget: 2000, color: theme.gradients.purple[1] },
    { name: 'Bills & Utilities', budget: 2500, color: theme.colors.warning },
    { name: 'Entertainment', budget: 1000, color: theme.colors.danger },
  ];

  const addExpense = async (expenseData: any) => {
    if (isInitialized && createExpense) {
      try {
        await createExpense(expenseData);
      } catch (error) {
        console.error('Failed to add expense:', error);
      }
    } else {
      // Demo mode - just show alert
      Alert.alert('Demo Mode', 'Expense would be added in live mode');
    }
  };

  const setOpenAddExpensePending = (pending: boolean) => {
    // Demo placeholder - would navigate to add expense
    if (pending) router.push('/add-expense');
  };

  // Create dynamic styles based on screen width
  const styles = createStyles(width);

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

  // Build BudgetProgress props from category totals (fallback to demo budgets)
  const categoryTotals = getCategoryTotals();
  const budgetCategoriesForProgress = demoBudgetCategories.map(cat => ({
    name: cat.name,
    spent: categoryTotals[cat.name] || 0,
    budget: cat.budget,
    color: cat.color,
  }));
  const totalBudgetPlanned = demoBudgetCategories.reduce((s, c) => s + c.budget, 0);

  // Upcoming bills (mock if demo)
  const upcomingBills = [
    { id: 'b1', name: 'Telkom Fibre', amount: 899.00, due: 'in 5 days' },
    { id: 'b2', name: 'Netflix', amount: 159.00, due: 'in 9 days' },
    { id: 'b3', name: 'Gym Membership', amount: 499.00, due: 'in 12 days' },
  ];

  // Product recommendations (demo-based for now)
  const productRecommendations = (() => {
    try {
      const customer = standardBankService.getDemoCustomer();
      return standardBankService.getProductRecommendations(customer).slice(0, 2);
    } catch {
      return [] as any[];
    }
  })();

  useEffect(() => {
    generateInsights();
    refreshWellbeing();
  }, [expenses, currentBalance]);

  // Rebuild narrative when wellbeing changes
  useEffect(() => {
    try {
      const recentSpend = expenses.slice(0,30).reduce((s,e)=>s+e.amount,0);
      const result = financialNarrativeService.generate({ wellbeing, budget: budgetPlan, currentBalance, recentSpend });
      setNarrative(result.narrative);
      setNarrativeHighlights(result.highlights);
    } catch {}
  }, [wellbeing, expenses, currentBalance, budgetPlan]);

  const generateInsights = () => {
    const newInsights: FinancialInsight[] = [];

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

  const refreshWellbeing = () => {
    try {
      const result = wellbeingScoreService.compute(
        displayExpenses.map((e: any) => ({ amount: e.amount, category: e.category, date: e.date, isRecurring: e.isRecurring })),
        [], // goals placeholder
        currentBalance
      );
      setWellbeing(result);
    } catch (e) {
      console.warn('Failed to compute wellbeing score', e);
    }
  };

  const quickStats: QuickStat[] = [
    {
      label: 'Total Balance',
      value: `R${currentBalance.toFixed(2)}`,
      change: `${(monthlySpent / Math.max(currentBalance || 1,1) * 100).toFixed(1)}% of balance in month`,
      changeType: 'neutral',
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
    }
  ];

  // map insights to component props (already compatible)

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };


  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={theme.gradients.primary}
        style={styles.gradient}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Removed DemoModeBanner for cleaner layout */}
          
          {/* Header */}
          <Animated.View entering={FadeInUp.delay(100)} style={styles.header}>
            <View>
              <Text style={styles.greeting}>Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}</Text>
              <Text style={styles.username}>{user?.firstName || user?.email || 'User'}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <AWSServiceStatus showDetails={false} />
              <TouchableOpacity 
                style={styles.notificationButton}
                onPress={() => router.push('/(tabs)/profile')}
              >
                <Ionicons name="notifications-outline" size={24} color={theme.colors.primary} />
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Wellbeing Score */}
          {wellbeing && (
            <Animated.View entering={FadeInUp.delay(150)} style={styles.section}>
              <WellbeingScoreCard result={wellbeing} onRefresh={refreshWellbeing} />
            </Animated.View>
          )}

          {/* AI Narrative */}
          {narrative && (
            <Animated.View entering={FadeInUp.delay(170)} style={styles.section}>
              <GlassCard style={[styles.cardPadded, shadow(2)]}>
                <Text style={{ color: theme.colors.text, fontWeight:'700', marginBottom:8 }}>AI Financial Snapshot</Text>
                <Text style={{ color: theme.colors.muted, fontSize:13, lineHeight:18 }}>{narrative}</Text>
                {narrativeHighlights.length>0 && (
                  <View style={{ marginTop:10 }}>
                    <Text style={{ color: theme.colors.text, fontSize:12, fontWeight:'600', marginBottom:4 }}>Highlights</Text>
                    {narrativeHighlights.map(h => (
                      <Text key={h} style={{ color: theme.colors.muted, fontSize:12, marginBottom:2 }}>• {h}</Text>
                    ))}
                  </View>
                )}
              </GlassCard>
            </Animated.View>
          )}

          {/* Quick Stats Grid */}
          <Animated.View entering={FadeInUp.delay(200)} style={styles.section}>
            <Text style={styles.sectionTitle}>Financial Overview</Text>
            <View style={styles.statsGrid}>
              {quickStats.map((stat, index) => (
                <Animated.View
                  key={stat.label}
                  entering={FadeInDown.delay(300 + index * 100)}
                  layout={Layout.springify()}
                >
                  <GlassCard style={[styles.statCard, shadow(4)]}>
                    <View style={styles.statHeader}>
                      <Ionicons 
                        name={stat.icon} 
                        size={20} 
                        color={theme.colors.primary} 
                      />
                      <Text style={styles.statLabel}>{stat.label}</Text>
                    </View>
                    <Text style={styles.statValue}>{stat.value}</Text>
                    <Text style={[
                      styles.statChange,
                      { color: stat.changeType === 'positive' ? theme.colors.success : 
                               stat.changeType === 'negative' ? theme.colors.danger :
                               stat.changeType === 'warning' ? theme.colors.warning : theme.colors.muted }
                    ]}>
                      {stat.change}
                    </Text>
                  </GlassCard>
                </Animated.View>
              ))}
              <TouchableOpacity onPress={() => setEditBalanceVisible(true)}>
                <Text style={{ color: theme.colors.muted, textAlign: 'right', marginTop: 8 }}>Change balance</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
          {/* Edit Balance Modal (lightweight) */}
          {editBalanceVisible && (
            <View style={{ backgroundColor: theme.colors.card, borderRadius: 12, marginHorizontal: 16, padding: 12, borderWidth: 1, borderColor: theme.colors.border }}>
              <Text style={{ color: theme.colors.text, fontWeight: '700', marginBottom: 6 }}>Set total balance</Text>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                <TouchableOpacity style={[styles.quickAction, { flex: 1 }]}
                  onPress={() => { /* placeholder for input focus in RN */ }}>
                  <Text style={{ color: theme.colors.text }}>Current: R{currentBalance.toFixed(2)}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.quickAction]}
                  onPress={() => { setBalance(currentBalance + 1000); }}>
                  <Ionicons name="add" size={16} color={theme.colors.primary} />
                  <Text style={{ color: theme.colors.text }}>+R1000</Text>
                </TouchableOpacity>
              </View>
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <TouchableOpacity style={[styles.quickAction, { flex: 1 }]} onPress={() => setEditBalanceVisible(false)}>
                  <Text style={{ color: theme.colors.text }}>Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Budget Overview */}
          <Animated.View entering={FadeInUp.delay(300)} style={styles.section}>
            <Text style={styles.sectionTitle}>Budget Overview</Text>
            <GlassCard style={[styles.cardPadded, shadow(3)]}>
              <BudgetProgress 
                categories={budgetCategoriesForProgress}
                totalSpent={monthlySpent}
                totalBudget={totalBudgetPlanned}
              />
            </GlassCard>
          </Animated.View>

          {/* Quick Actions */}
          <Animated.View entering={FadeInUp.delay(400)} style={styles.section}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => { setOpenAddExpensePending(true); router.push('/(tabs)/expenses'); }}
              >
                <Ionicons name="add-circle" size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Add Expense</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => router.push('/scan-receipt')}
              >
                <Ionicons name="camera" size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Scan Receipt</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => router.push('/(tabs)/expenses')}
              >
                <Ionicons name="analytics" size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>View Expenses</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => router.push('/(tabs)/learn')}
              >
                <Ionicons name="book" size={24} color={theme.colors.primary} />
                <Text style={styles.quickActionText}>Learn</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* Recent Activity Preview */
          }
          <Animated.View entering={FadeInUp.delay(500)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/expenses')}>
                <Text style={styles.seeAllText}>See All</Text>
              </TouchableOpacity>
            </View>
            
            {monthlyExpenses.slice(0, 3).map((expense, index) => (
              <GlassCard key={expense.expenseId} style={[styles.expenseItem, shadow(2)]}>
                <View style={styles.expenseDetails}>
                  <View style={styles.expenseIcon}>
                    <Ionicons 
                      name="card-outline" 
                      size={20} 
                      color={theme.colors.primary} 
                    />
                  </View>
                  <View style={styles.expenseInfo}>
                    <Text style={styles.expenseMerchant}>{expense.description}</Text>
                    <Text style={styles.expenseCategory}>{expense.category}</Text>
                  </View>
                  <Text style={styles.expenseAmount}>-R{expense.amount.toFixed(2)}</Text>
                </View>
              </GlassCard>
            ))}
          </Animated.View>

          {/* Financial Insights */}
          {insights.length > 0 && (
            <Animated.View entering={FadeInUp.delay(600)} style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Insights</Text>
              <GlassCard style={[styles.cardPadded, shadow(2)]}>
                <FinancialInsights insights={insights} />
              </GlassCard>
            </Animated.View>
          )}

          {/* Upcoming Bills */}
          <Animated.View entering={FadeInUp.delay(650)} style={styles.section}>
            <Text style={styles.sectionTitle}>Upcoming Bills</Text>
            {upcomingBills.map(bill => (
              <GlassCard key={bill.id} style={[styles.billItem, shadow(2)]}>
                <View style={styles.billRow}>
                  <View>
                    <Text style={styles.billName}>{bill.name}</Text>
                    <Text style={styles.billDue}>Due {bill.due}</Text>
                  </View>
                  <Text style={styles.billAmount}>{formatCurrency(bill.amount)}</Text>
                </View>
              </GlassCard>
            ))}
          </Animated.View>

          {/* Recommended for You */}
          {productRecommendations.length > 0 && (
            <Animated.View entering={FadeInUp.delay(700)} style={styles.section}>
              <Text style={styles.sectionTitle}>Recommended for You</Text>
              {productRecommendations.map((p, idx) => (
                <GlassCard key={p.id || idx} style={[styles.productCard, shadow(2)]}>
                  <Text style={styles.productName}>{p.name} <Text style={styles.productType}>({p.type})</Text></Text>
                  <Text style={styles.productDesc}>{p.description}</Text>
                  {!!p.features && (
                    <Text style={styles.productFeatures}>Features: {p.features.slice(0,3).join(', ')}</Text>
                  )}
                </GlassCard>
              ))}
            </Animated.View>
          )}

          {/* (Moved Goals Snapshot & Gamification to Profile Screen to avoid duplication) */}

          {/* Footer spacer */}
          <View style={{ height: 60 }} />
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

// Dynamic styles function that takes width parameter
const createStyles = (screenWidth: number) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  gradient: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 16,
    color: theme.colors.muted,
    fontWeight: '500',
  },
  username: {
    fontSize: 24,
    color: theme.colors.text,
    fontWeight: 'bold',
    marginTop: 4,
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 16,
  },
  seeAllText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  statCard: {
    width: (screenWidth - 52) / 2,
    padding: 16,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 12,
    color: theme.colors.muted,
    marginLeft: 8,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.text,
    marginBottom: 4,
  },
  statChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 12,
  },
  quickAction: {
    width: (screenWidth - 52) / 2,
    backgroundColor: theme.colors.glass,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  quickActionText: {
    color: theme.colors.text,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
  },
  expenseItem: {
    marginBottom: 8,
    padding: 16,
  },
  expenseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.glass,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseMerchant: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  expenseCategory: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme.colors.danger,
  },
  insightCard: {
    marginBottom: 12,
    padding: 16,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  insightMessage: {
    fontSize: 14,
    color: theme.colors.muted,
    lineHeight: 20,
  },
  cardPadded: {
    padding: 12,
  },
  billItem: {
    padding: 16,
    marginBottom: 8,
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.text,
  },
  billDue: {
    fontSize: 12,
    color: theme.colors.muted,
    marginTop: 2,
  },
  billAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  productCard: {
    padding: 16,
    marginBottom: 8,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  productType: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.muted,
  },
  productDesc: {
    fontSize: 13,
    color: theme.colors.muted,
    marginTop: 4,
  },
  productFeatures: {
    fontSize: 12,
    color: theme.colors.text,
    marginTop: 6,
  },
  goalItem: {
    padding: 16,
    marginBottom: 8,
  },
  goalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  goalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.text,
  },
  goalAmounts: {
    fontSize: 12,
    color: theme.colors.muted,
    fontWeight: '600',
  },
  goalBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.border,
    overflow: 'hidden',
  },
  goalBarFill: {
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  demoButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
  },
  demoButtonText: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
});
