import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Dimensions,
  Modal,
  Alert,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { theme, shadow } from '@/config/theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import GlassCard from '@/components/GlassCard';
import ReceiptScanner from '../../components/ReceiptScanner';
import { useMobileDatabase } from '../../contexts/MobileDatabaseContext';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TextInput } from 'react-native';

const { width } = Dimensions.get('window');

// Icon wrapper component to handle type issues
const IconComponent = ({ name, size, color }: { name: string; size: number; color: string }) => {
  const IconLib = Ionicons as any;
  return <IconLib name={name} size={size} color={color} />;
};

// LinearGradient wrapper component to handle type issues
const GradientComponent = ({ colors, style, children }: { colors: string[]; style?: any; children: React.ReactNode }) => {
  const GradientLib = LinearGradient as any;
  return <GradientLib colors={colors} style={style}>{children}</GradientLib>;
};

// Picker wrapper component to handle type issues
const PickerComponent = ({ selectedValue, onValueChange, style, children }: { 
  selectedValue: string; 
  onValueChange: (value: string) => void; 
  style?: any; 
  children: React.ReactNode 
}) => {
  const PickerLib = Picker as any;
  return <PickerLib selectedValue={selectedValue} onValueChange={onValueChange} style={style}>{children}</PickerLib>;
};

export default function Expenses() {
  const {
    expenses = [],
    categories = [],
    currentUser,
    addExpense,
    updateExpense,
    deleteExpense,
    scanReceiptAndAddExpense,
    getExpensesByDateRange,
    getCategoriesWithBudgets,
    updateCategoryBudget,
    createLocalUser,
  openAddExpensePending,
  setOpenAddExpensePending,
  editingExpenseId,
  setEditingExpenseId,
  } = useMobileDatabase();

  const [selectedPeriod, setSelectedPeriod] = React.useState('This Month');
  const [showReceiptModal, setShowReceiptModal] = React.useState(false);
  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showBudgetModal, setShowBudgetModal] = React.useState(false);
  const [selectedExpense, setSelectedExpense] = React.useState<any>(null);
  const [selectedCategory, setSelectedCategory] = React.useState<any>(null);
  const [addForm, setAddForm] = React.useState({ amount: '', category: '', merchant: '', date: new Date().toISOString().slice(0,10), description: '' });
  const [budgetForm, setBudgetForm] = React.useState({ budget: '' });
  const [adding, setAdding] = React.useState(false);
  const [updating, setUpdating] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [ocrLoading, setOcrLoading] = React.useState(false);
  const [ocrError, setOcrError] = React.useState('');
  const [ocrResult, setOcrResult] = React.useState(null);
  const [showDatePicker, setShowDatePicker] = React.useState(false);

  // Refs for scrolling/focus to inline Add form
  const scrollRef = React.useRef<ScrollView | null>(null);
  const addFormAnchorRef = React.useRef<any>(null);
  const amountInputRef = React.useRef<any>(null);

  // Initialize demo user if none exists
  React.useEffect(() => {
    const initializeDemoUser = async () => {
      if (!currentUser) {
        try {
          await createLocalUser({
            email: 'demo@bluebot.com',
            fullName: 'Demo User',
            isVerified: true,
            phoneNumber: '+27123456789',
          });
        } catch (error) {
          console.log('Demo user might already exist');
        }
      }
    };
    
    initializeDemoUser();
  }, [currentUser, createLocalUser]);

  // If another screen requested opening Add Expense, scroll to and focus inline form
  React.useEffect(() => {
    if (openAddExpensePending) {
      // Scroll to add form
      requestAnimationFrame(() => {
        addFormAnchorRef.current?.measureLayout(
          // @ts-ignore - get native scroll view handle
          scrollRef.current?.getInnerViewNode?.() || (scrollRef.current as any),
          (_x: number, y: number) => {
            scrollRef.current?.scrollTo({ y: Math.max(y - 20, 0), animated: true });
            // Focus amount field shortly after scroll
            setTimeout(() => amountInputRef.current?.focus?.(), 150);
          },
          () => {
            // Fallback: just focus
            setTimeout(() => amountInputRef.current?.focus?.(), 150);
          }
        );
      });
      setOpenAddExpensePending(false);
    }
  }, [openAddExpensePending, setOpenAddExpensePending]);

  // If an external screen sets an expense to edit, open the Edit modal here
  React.useEffect(() => {
    if (editingExpenseId) {
      const exp = expenses.find(e => e.id === editingExpenseId);
      if (exp) {
        setSelectedExpense(exp);
        setAddForm({
          amount: String(exp.amount),
          category: exp.category,
          merchant: exp.merchant,
          date: exp.date,
          description: exp.description || ''
        });
        setShowEditModal(true);
      }
      setEditingExpenseId(null);
    }
  }, [editingExpenseId, expenses]);

  // Seed realistic demo data for the current month
  const seedDemoBudgetAndExpenses = async () => {
    try {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      const ymd = (d: Date) => d.toISOString().slice(0, 10);

      // 1) Set category budgets to total R21,000
      const budgets: Record<string, number> = {
        'Food & Dining': 5000,
        'Bills & Utilities': 4000,
        'Transportation': 2500,
        'Healthcare': 1500,
        'Shopping': 2000,
        'Entertainment': 1500,
        'Education': 3000,
        'Other': 500,
      };

      for (const [cat, amount] of Object.entries(budgets)) {
        try { await updateCategoryBudget(cat, amount); } catch {}
      }

      // 2) Add expenses for THIS MONTH such that half the budget is spent (R10,500)
      //    and that half is split across essentials and savings-like transfers.
      const expensesToAdd = [
        // Essentials (~R5,250)
        { amount: 1200, category: 'Food & Dining', merchant: 'Woolworths', description: 'Groceries (week 1)', date: ymd(new Date(y, m, 3)) },
        { amount: 650, category: 'Food & Dining', merchant: 'Checkers', description: 'Top-up groceries', date: ymd(new Date(y, m, 10)) },
        { amount: 1800, category: 'Bills & Utilities', merchant: 'City Power', description: 'Electricity bill', date: ymd(new Date(y, m, 5)) },
        { amount: 450, category: 'Healthcare', merchant: 'Clicks Pharmacy', description: 'Medication', date: ymd(new Date(y, m, 8)) },
        { amount: 1150, category: 'Transportation', merchant: 'Shell', description: 'Fuel', date: ymd(new Date(y, m, 12)) },

        // Savings-like (~R5,250) placed under existing categories
        { amount: 4000, category: 'Education', merchant: 'Savings Transfer', description: 'TFSA contribution', date: ymd(new Date(y, m, 2)) },
        { amount: 1250, category: 'Other', merchant: 'Savings Transfer', description: 'Emergency fund deposit', date: ymd(new Date(y, m, 15)) },
      ];

      for (const e of expensesToAdd) {
        await addExpense({ ...e, isRecurring: false, receiptUrl: undefined });
      }

      Alert.alert('Demo ready', 'Budget set to R21,000 and current month seeded with realistic expenses.');
    } catch (e) {
      Alert.alert('Error', 'Failed to seed demo data.');
    }
  };

  // Filter expenses based on selected period
  const getFilteredExpenses = () => {
    const now = new Date();
    let startDate = '';
    let endDate = '';

    switch (selectedPeriod) {
      case 'This Week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        startDate = weekStart.toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        break;
      case 'This Month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        break;
      case 'Last Month':
        const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        startDate = lastMonth.toISOString().slice(0, 10);
        endDate = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10);
        break;
      case 'This Year':
        startDate = new Date(now.getFullYear(), 0, 1).toISOString().slice(0, 10);
        endDate = new Date().toISOString().slice(0, 10);
        break;
      default:
        return expenses;
    }

    const list = getExpensesByDateRange(startDate, endDate);
    // Sort newest first by date, then createdAt, then id
    return [...list].sort((a: any, b: any) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) return a.createdAt < b.createdAt ? 1 : -1;
      return (a.id || 0) < (b.id || 0) ? 1 : -1;
    });
  };

  const filteredExpenses = getFilteredExpenses();
  const recentExpenses = React.useMemo(() => filteredExpenses.slice(0, 20), [filteredExpenses]);

  // Calculate totals and budgets from filtered data
  const totalSpent = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  // Default monthly budget to R21,000 if no budgets are set yet
  const computedBudget = categories.reduce((sum, c) => sum + (c.budget || 0), 0);
  const monthlyBudget = computedBudget > 0 ? computedBudget : 21000;
  const budgetRemaining = Math.max(monthlyBudget - totalSpent, 0);
  const budgetProgress = monthlyBudget > 0 ? (totalSpent / monthlyBudget) * 100 : 0;

  // Add expense via text form
  const handleAddExpense = async () => {
    if (!addForm.amount || !addForm.category || !addForm.merchant) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setAdding(true);
    try {
      const parsed = Number(parseFloat(addForm.amount.replace(/[^0-9.]/g, '')));
      if (!isFinite(parsed) || parsed <= 0) throw new Error('Invalid amount');
  await addExpense({
        amount: parsed,
        category: addForm.category,
        merchant: addForm.merchant,
        date: addForm.date || new Date().toISOString().slice(0, 10),
        description: addForm.description || '',
        isRecurring: false
      });
  // reset form for next entry and bring focus to amount
  setAddForm({ amount: '', category: addForm.category, merchant: '', date: new Date().toISOString().slice(0,10), description: '' });
  requestAnimationFrame(() => amountInputRef.current?.focus?.());
      Alert.alert('Success', 'Expense added successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to add expense.');
    }
    setAdding(false);
  };

  // Edit expense
  const handleEditExpense = async () => {
    if (!selectedExpense || !addForm.amount || !addForm.category || !addForm.merchant) {
      Alert.alert('Error', 'Please fill in all required fields.');
      return;
    }

    setUpdating(true);
    try {
      await updateExpense(selectedExpense.id, {
        amount: parseFloat(addForm.amount),
        category: addForm.category,
        merchant: addForm.merchant,
        date: addForm.date || selectedExpense.date,
        description: addForm.description || ''
      });
      setShowEditModal(false);
      setSelectedExpense(null);
      setAddForm({ amount: '', category: '', merchant: '', date: '', description: '' });
      Alert.alert('Success', 'Expense updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update expense.');
    }
    setUpdating(false);
  };

  // Delete expense
  const handleDeleteExpense = (expense: any) => {
    Alert.alert(
      'Delete Expense',
      `Are you sure you want to delete this expense: ${expense.merchant} - ${formatCurrency(expense.amount)}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpense(expense.id);
              Alert.alert('Success', 'Expense deleted successfully!');
            } catch (e) {
              Alert.alert('Error', 'Failed to delete expense.');
            }
            setDeleting(false);
          }
        }
      ]
    );
  };

  // Open edit modal
  const openEditModal = (expense: any) => {
    setSelectedExpense(expense);
    setAddForm({
      amount: expense.amount.toString(),
      category: expense.category,
      merchant: expense.merchant,
      date: expense.date,
      description: expense.description || ''
    });
    setShowEditModal(true);
  };

  // Update category budget
  const handleUpdateBudget = async () => {
    if (!selectedCategory || !budgetForm.budget) {
      Alert.alert('Error', 'Please enter a valid budget amount.');
      return;
    }

    try {
      await updateCategoryBudget(selectedCategory.name, parseFloat(budgetForm.budget));
      setShowBudgetModal(false);
      setSelectedCategory(null);
      setBudgetForm({ budget: '' });
      Alert.alert('Success', 'Budget updated successfully!');
    } catch (e) {
      Alert.alert('Error', 'Failed to update budget.');
    }
  };

  // Open budget modal
  const openBudgetModal = (category: any) => {
    setSelectedCategory(category);
    setBudgetForm({ budget: (category.budget || 0).toString() });
    setShowBudgetModal(true);
  };

  // Add expense via OCR
  const handleReceiptProcessed = async (receipt) => {
    setOcrLoading(true);
    setOcrError('');
    try {
      await addExpense({
        amount: receipt.total,
        category: receipt.category,
        merchant: receipt.merchant,
        date: receipt.date,
      });
      setOcrResult(receipt);
      setShowReceiptModal(false);
    } catch (e) {
      setOcrError('Failed to add expense from receipt.');
    }
    setOcrLoading(false);
  };

  const formatCurrency = (amount: number) => {
    return `R${amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getBudgetProgress = (spent: number, budget?: number) => {
    if (!budget) return 0;
    return Math.min((spent / budget) * 100, 100);
  };

  const getBudgetStatus = (spent: number, budget?: number) => {
    if (!budget) return 'no-budget';
    const percentage = (spent / budget) * 100;
    if (percentage >= 90) return 'over-budget';
    if (percentage >= 75) return 'warning';
    return 'good';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'over-budget':
        return '#EF4444';
      case 'warning':
        return '#F59E0B';
      case 'good':
        return '#10B981';
      default:
        return '#64748B';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
  <ScrollView ref={scrollRef as any} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Expense Tracking</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerButton} onPress={seedDemoBudgetAndExpenses}>
              <IconComponent name="add-circle-outline" size={20} color="#1E3A8A" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerButton}>
              <IconComponent name="funnel-outline" size={20} color="#1E3A8A" />
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.headerButton}
              onPress={() => setShowReceiptModal(true)}
            >
              <IconComponent name="camera-outline" size={20} color="#1E3A8A" />
            </TouchableOpacity>
          </View>
        </View>

    {/* Add Expense (inline) */}
        <View ref={addFormAnchorRef as any} style={styles.section}>
          <GlassCard style={styles.addCard} border>
      <Text style={styles.sectionTitle}>Add Expense (deducts from this month’s budget)</Text>
            <View style={{ gap: 12 }}>
              <Text style={styles.addLabel}>Amount</Text>
              <TextInput
                ref={amountInputRef}
                style={styles.addInput}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.muted}
                value={addForm.amount}
                onChangeText={(v) => setAddForm(f => ({ ...f, amount: v.replace(',', '.') }))}
              />

              <Text style={styles.addLabel}>Category</Text>
              <View style={styles.addPickerWrapper}>
                {(() => {
                  const PickerLib = Picker as any;
                  const Item = (Picker as any).Item;
                  return (
                    <PickerLib
                      selectedValue={addForm.category}
                      onValueChange={(v: string) => setAddForm(f => ({ ...f, category: v }))}
                      dropdownIconColor={theme.colors.text}
                      style={styles.addPicker}
                    >
                      <Item label="Select category" value="" />
                      {categories.map((c) => (
                        <Item key={c.name} label={c.name} value={c.name} />
                      ))}
                    </PickerLib>
                  );
                })()}
              </View>

              <Text style={styles.addLabel}>Merchant</Text>
              <TextInput
                style={styles.addInput}
                placeholder="Where did you spend?"
                placeholderTextColor={theme.colors.muted}
                value={addForm.merchant}
                onChangeText={(v) => setAddForm(f => ({ ...f, merchant: v }))}
              />

              <Text style={styles.addLabel}>Date</Text>
              <TouchableOpacity style={styles.addInput} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: theme.colors.text }}>{addForm.date || new Date().toISOString().slice(0,10)}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(addForm.date || new Date().toISOString().slice(0,10))}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, d) => {
                    if (d) {
                      const iso = d.toISOString().slice(0,10);
                      setAddForm(f => ({ ...f, date: iso }));
                    }
                    setShowDatePicker(false);
                  }}
                />
              )}

              <Text style={styles.addLabel}>Description (optional)</Text>
              <TextInput
                style={[styles.addInput, { height: 90, textAlignVertical: 'top' }]}
                placeholder="Notes..."
                placeholderTextColor={theme.colors.muted}
                value={addForm.description}
                onChangeText={(v) => setAddForm(f => ({ ...f, description: v }))}
                multiline
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity style={styles.addPrimaryBtn} disabled={adding} onPress={handleAddExpense}>
                  <IconComponent name="save-outline" size={18} color="#fff" />
                  <Text style={styles.addPrimaryText}>{adding ? 'Saving…' : 'Save Expense'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.addSecondaryBtn} onPress={() => setShowReceiptModal(true)}>
                  <IconComponent name="camera-outline" size={18} color={theme.colors.text} />
                  <Text style={styles.addSecondaryText}>Scan</Text>
                </TouchableOpacity>
              </View>
            </View>
          </GlassCard>
        </View>

        {/* Period Selector */}
        <View style={styles.periodSelector}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {['This Week', 'This Month', 'Last Month', 'This Year'].map((period) => (
              <TouchableOpacity
                key={period}
                style={[
                  styles.periodButton,
                  selectedPeriod === period && styles.periodButtonActive,
                ]}
                onPress={() => setSelectedPeriod(period)}
              >
                <Text
                  style={[
                    styles.periodButtonText,
                    selectedPeriod === period && styles.periodButtonTextActive,
                  ]}
                >
                  {period}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Budget Overview */}
        <View style={styles.section}>
          <GradientComponent
            colors={budgetProgress > 90 ? ['#EF4444', '#DC2626'] : ['#1E3A8A', '#0EA5E9']}
            style={styles.budgetCard}
          >
            <View style={styles.budgetHeader}>
              <Text style={styles.budgetLabel}>Monthly Budget</Text>
              <Text style={styles.budgetProgress}>{Math.round(budgetProgress)}%</Text>
            </View>
            <Text style={styles.budgetAmount}>{formatCurrency(totalSpent)}</Text>
            <Text style={styles.budgetSubtext}>
              of {formatCurrency(monthlyBudget)} • {formatCurrency(budgetRemaining)} remaining
            </Text>
            <View style={styles.budgetProgressBar}>
              <View
                style={[
                  styles.budgetProgressFill,
                  { width: `${Math.min(budgetProgress, 100)}%` },
                ]}
              />
            </View>
          </GradientComponent>
        </View>

        {/* Category Breakdown */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Spending by Category</Text>
          {categories.map((category) => {
            const catExpenses = filteredExpenses.filter(e => e.category === category.name);
            const spent = catExpenses.reduce((sum, e) => sum + e.amount, 0);
            const progress = getBudgetProgress(spent, category.budget);
            const status = getBudgetStatus(spent, category.budget);
            return (
              <TouchableOpacity 
                key={category.name} 
                style={{ marginBottom: 12 }}
                onPress={() => openBudgetModal(category)}
                onLongPress={() => openBudgetModal(category)}
              >
                <GlassCard style={styles.categoryItem}>
                <View style={styles.categoryHeader}>
                  <View style={styles.categoryInfo}>
                    <View style={[styles.categoryIcon, { backgroundColor: `${category.color}20` }]}> 
                      <IconComponent name={category.icon} size={20} color={category.color} />
                    </View>
                    <View>
                      <Text style={styles.categoryName}>{category.name}</Text>
                      <Text style={styles.categoryCount}>{catExpenses.length} transactions</Text>
                    </View>
                  </View>
                  <View style={styles.categoryAmounts}>
                    <Text style={styles.categoryAmount}>{formatCurrency(spent)}</Text>
                    {category.budget && category.budget > 0 ? (
                      <Text style={styles.categoryBudget}>of {formatCurrency(category.budget)}</Text>
                    ) : (
                      <Text style={styles.categoryNoBudget}>Tap to set budget</Text>
                    )}
                  </View>
                </View>
                {category.budget && category.budget > 0 && (
                  <View style={styles.categoryProgressContainer}>
                    <View style={styles.categoryProgressBar}>
                      <View
                        style={[
                          styles.categoryProgressFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: getStatusColor(status),
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.categoryProgressText,
                        { color: getStatusColor(status) },
                      ]}
                    >
                      {Math.round(progress)}%
                    </Text>
                  </View>
                )}
                </GlassCard>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent Transactions */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Expenses</Text>
            <TouchableOpacity>
              <Text style={styles.seeAllText}>See All ({filteredExpenses.length})</Text>
            </TouchableOpacity>
          </View>
  {recentExpenses.map((expense) => (
            <TouchableOpacity 
              key={expense.id} 
        style={{ marginBottom: 8 }}
              onPress={() => openEditModal(expense)}
            >
        <GlassCard style={styles.expenseItem}>
              <View style={styles.expenseInfo}>
                <Text style={styles.expenseMerchant}>{expense.merchant}</Text>
                <Text style={styles.expenseCategory}>{expense.category}</Text>
                {expense.description && (
                  <Text style={styles.expenseDescription}>{expense.description}</Text>
                )}
              </View>
              <View style={styles.expenseRight}>
                <Text style={styles.expenseAmount}>
                  -{formatCurrency(expense.amount)}
                </Text>
                <View style={styles.expenseDetails}>
                  <Text style={styles.expenseDate}>{expense.date}</Text>
                  {expense.receiptUrl && (
                    <IconComponent name="receipt-outline" size={12} color="#10B981" />
                  )}
                </View>
                <TouchableOpacity 
                  style={styles.deleteButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    handleDeleteExpense(expense);
                  }}
                >
                  <IconComponent name="trash-outline" size={16} color="#EF4444" />
                </TouchableOpacity>
              </View>
              </GlassCard>
            </TouchableOpacity>
          ))}
          {filteredExpenses.length === 0 && (
            <GlassCard style={styles.emptyState} border>
              <IconComponent name="receipt-outline" size={48} color="#CBD5E1" />
              <Text style={styles.emptyStateText}>No expenses for this period</Text>
              <Text style={styles.emptyStateSubtext}>Add your first expense to get started</Text>
            </GlassCard>
          )}
        </View>

  {/* Inline form above replaces the old Add Expense button */}
      </ScrollView>

  {/* Removed Add Expense Modal; replaced by inline form */}

      {/* Edit Expense Modal */}
      <Modal visible={showEditModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowEditModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Edit Expense</Text>
            <TouchableOpacity disabled={updating} onPress={handleEditExpense}>
              <Text style={styles.modalDone}>{updating ? 'Updating...' : 'Update'}</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            <Text>Amount</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 12, padding: 8 }}
              keyboardType="numeric"
              value={addForm.amount}
              onChangeText={v => setAddForm(f => ({ ...f, amount: v }))}
            />
            <Text>Category</Text>
            <PickerComponent
              selectedValue={addForm.category}
              onValueChange={v => setAddForm(f => ({ ...f, category: v }))}
              style={{ marginBottom: 12 }}
            >
              <Picker.Item label="Select category" value="" />
              {categories.map(c => (
                <Picker.Item key={c.name} label={c.name} value={c.name} />
              ))}
            </PickerComponent>
            <Text>Merchant</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 12, padding: 8 }}
              value={addForm.merchant}
              onChangeText={v => setAddForm(f => ({ ...f, merchant: v }))}
            />
            <Text>Date</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 12, padding: 8 }}
              value={addForm.date}
              placeholder="YYYY-MM-DD"
              onChangeText={v => setAddForm(f => ({ ...f, date: v }))}
            />
            <Text>Description (Optional)</Text>
            <TextInput
              style={{ borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 8, marginBottom: 12, padding: 8 }}
              value={addForm.description}
              placeholder="Additional notes..."
              onChangeText={v => setAddForm(f => ({ ...f, description: v }))}
              multiline
            />
          </View>
        </SafeAreaView>
      </Modal>

      {/* Budget Management Modal */}
      <Modal visible={showBudgetModal} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowBudgetModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Set Budget</Text>
            <TouchableOpacity onPress={handleUpdateBudget}>
              <Text style={styles.modalDone}>Save</Text>
            </TouchableOpacity>
          </View>
          <View style={{ padding: 20 }}>
            {selectedCategory && (
              <>
                <View style={styles.budgetCategoryHeader}>
                  <View style={[styles.categoryIcon, { backgroundColor: `${selectedCategory.color}20` }]}>
                    <IconComponent name={selectedCategory.icon} size={24} color={selectedCategory.color} />
                  </View>
                  <Text style={styles.budgetCategoryName}>{selectedCategory.name}</Text>
                </View>
                <Text style={styles.budgetModalLabel}>Monthly Budget</Text>
                <TextInput
                  style={styles.budgetInput}
                  keyboardType="numeric"
                  value={budgetForm.budget}
                  placeholder="Enter budget amount"
                  onChangeText={v => setBudgetForm({ budget: v })}
                />
                <Text style={styles.budgetHint}>
                  Current spending: {formatCurrency(selectedCategory.spent || 0)}
                </Text>
              </>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Receipt Scanner Modal */}
      <Modal
        visible={showReceiptModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowReceiptModal(false)}>
              <Text style={styles.modalCancel}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Scan Receipt</Text>
            <TouchableOpacity disabled={ocrLoading}>
              <Text style={styles.modalDone}>{ocrLoading ? 'Scanning...' : 'Done'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.cameraPlaceholder}>
            <ReceiptScanner
              visible={showReceiptModal}
              onClose={() => setShowReceiptModal(false)}
              onReceiptProcessed={handleReceiptProcessed}
            />
            {ocrError ? <Text style={{ color: 'red' }}>{ocrError}</Text> : null}
            {ocrResult ? <Text style={{ color: 'green' }}>Expense added!</Text> : null}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  paddingHorizontal: theme.spacing.lg,
  paddingTop: theme.spacing.lg,
  paddingBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 24,
  color: theme.colors.text,
    fontWeight: '700',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
  backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
  borderWidth: 1,
  borderColor: theme.colors.border,
  ...shadow(6, 0.16),
  },
  periodSelector: {
  paddingHorizontal: theme.spacing.lg,
  marginBottom: theme.spacing.xl,
  },
  periodButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  backgroundColor: theme.colors.card,
    marginRight: 12,
    borderWidth: 1,
  borderColor: theme.colors.border,
  },
  periodButtonActive: {
  backgroundColor: theme.colors.primaryDark,
  borderColor: theme.colors.primaryDark,
  },
  periodButtonText: {
    fontSize: 14,
  color: theme.colors.muted,
    fontWeight: '500',
  },
  periodButtonTextActive: {
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 16,
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
    fontWeight: '500',
  },
  budgetCard: {
    borderRadius: theme.radius.lg,
    padding: theme.spacing.xl,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  budgetLabel: {
    fontSize: 16,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  budgetProgress: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  budgetAmount: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: '700',
    marginBottom: 4,
  },
  budgetSubtext: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 16,
  },
  budgetProgressBar: {
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
  },
  budgetProgressFill: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  categoryItem: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
  color: theme.colors.text,
    fontWeight: '500',
  },
  categoryCount: {
    fontSize: 12,
  color: theme.colors.muted,
    marginTop: 2,
  },
  categoryAmounts: {
    alignItems: 'flex-end',
  },
  categoryAmount: {
    fontSize: 18,
  color: theme.colors.text,
    fontWeight: '600',
  },
  categoryBudget: {
    fontSize: 14,
  color: theme.colors.muted,
    marginTop: 2,
  },
  categoryNoBudget: {
    fontSize: 14,
  color: theme.colors.accent,
    marginTop: 2,
    fontStyle: 'italic',
  },
  categoryProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginRight: 12,
  },
  categoryProgressFill: {
    height: 6,
    borderRadius: 3,
  },
  categoryProgressText: {
    fontSize: 14,
    fontWeight: '600',
  },
  expenseItem: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseMerchant: {
    fontSize: 16,
  color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  expenseCategory: {
    fontSize: 14,
  color: theme.colors.muted,
  },
  expenseDescription: {
    fontSize: 12,
  color: theme.colors.muted,
    marginTop: 2,
    fontStyle: 'italic',
  },
  expenseRight: {
    alignItems: 'flex-end',
    position: 'relative',
  },
  expenseAmount: {
    fontSize: 16,
  color: theme.colors.text,
    fontWeight: '600',
    marginBottom: 4,
  },
  expenseDetails: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  expenseDate: {
    fontSize: 12,
  color: theme.colors.muted,
    marginRight: 6,
  },
  deleteButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
  backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
  color: theme.colors.muted,
    fontWeight: '500',
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 4,
  },
  budgetCategoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  budgetCategoryName: {
    fontSize: 20,
  color: theme.colors.text,
    fontWeight: '600',
    marginLeft: 12,
  },
  budgetModalLabel: {
    fontSize: 16,
  color: theme.colors.text,
    fontWeight: '500',
    marginBottom: 8,
  },
  budgetInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 12,
  },
  budgetHint: {
    fontSize: 14,
    color: '#64748B',
  },
  receiptIcon: {
    marginLeft: 4,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1E3A8A',
    marginHorizontal: 20,
    marginBottom: 32,
    paddingVertical: 16,
    borderRadius: 12,
    shadowColor: '#1E3A8A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  addButtonText: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  paddingHorizontal: theme.spacing.lg,
  paddingVertical: theme.spacing.md,
  backgroundColor: theme.colors.card,
  borderBottomWidth: 1,
  borderBottomColor: theme.colors.border,
  },
  modalCancel: {
    fontSize: 16,
  color: theme.colors.muted,
  },
  modalTitle: {
    fontSize: 18,
  color: theme.colors.text,
    fontWeight: '600',
  },
  modalDone: {
    fontSize: 16,
  color: theme.colors.accent,
    fontWeight: '600',
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  cameraText: {
    fontSize: 18,
  color: theme.colors.muted,
    fontWeight: '500',
    marginTop: 16,
    textAlign: 'center',
  },
  cameraSubtext: {
    fontSize: 14,
  color: theme.colors.muted,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
});

