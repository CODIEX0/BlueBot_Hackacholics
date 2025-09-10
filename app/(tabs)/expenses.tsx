import React from 'react';
const { useMemo, useState } = React;
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  Platform,
  TextInput,
  Share,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ReceiptScanner from '@/components/ReceiptScanner';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { theme } from '@/config/theme';
import { DEFAULT_TOTAL_BALANCE } from '@/config/app';
import { useBalance } from '@/contexts/BalanceContext';
import { useAWS } from '@/contexts/AWSContext'; 
import { useAccountsIntegration } from '@/contexts/AccountIntegrationContext';
import BudgetProgress from '@/components/BudgetProgress';
import { budgetRecommendationService, BudgetPlanResult } from '@/services/BudgetRecommendationService';
import { useBudgetPlan } from '@/contexts/BudgetPlanContext';

type ExpenseForm = {
  amount: string;
  category: string;
  merchant: string;
  date: string; // YYYY-MM-DD
  description: string;
  isRecurring?: boolean;
};

type TabKey = 'Overview' | 'Month' | 'Add' | 'Balance' | 'History';

export default function Expenses() {
  const { currentBalance, setBalance } = useBalance();
  // AWS Context with fallback to demo mode
  const aws = useAWS();
  const { 
    isInitialized, 
    createExpense,
    updateExpense: awsUpdateExpense,
    deleteExpense: awsDeleteExpense,
    budgets = [],
  } = aws || {};
  const accountsFeed = useAccountsIntegration();
  const expenses = React.useMemo(() => accountsFeed.expenseLike.map((e, idx) => ({
    expenseId: `sim_${idx}`,
    amount: e.amount,
    category: e.category || 'Other',
    merchant: e.category || 'Merchant',
    description: e.category || 'Expense',
    date: (e.date || '').slice(0,10),
    isRecurring: e.isRecurring,
  })), [accountsFeed.expenseLike]);
  
  // Demo categories for fallback
  const demoCategories = [
    { name: 'Food', color: '#FF6B6B', budget: 1500 },
    { name: 'Transport', color: '#4ECDC4', budget: 800 },
    { name: 'Shopping', color: '#45B7D1', budget: 600 },
    { name: 'Entertainment', color: '#96CEB4', budget: 400 }
  ];
  
  const categoryObjs = isInitialized ? [] : demoCategories; // Will be populated from AWS in future
  
  const addExpense = async (_expenseData: any) => {
    // With account integration simulation we treat manual add as a no-op (could later inject into simulator state)
    Alert.alert('Simulated', 'In account integration mode, manual adds are not persisted.');
  };

  const updateExpense = async () => {
    Alert.alert('Read-Only', 'Simulated feed items cannot be edited yet.');
  };

  const deleteExpense = async () => {
    Alert.alert('Read-Only', 'Simulated feed items cannot be deleted.');
  };
  const categories = useMemo(() => (categoryObjs || []).map((c: any) => c.name), [categoryObjs]);

  const [modalVisible, setModalVisible] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('Overview');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [form, setForm] = useState<ExpenseForm>(() => ({
    amount: '',
    category: '',
    merchant: '',
    date: new Date().toISOString().slice(0, 10),
    description: '',
    isRecurring: false,
  }));
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');
  const { plan: globalPlan, setPlan } = useBudgetPlan();
  const [recommendation, setRecommendation] = useState<BudgetPlanResult | null>(null);
  const [recommending, setRecommending] = useState(false);

  const sortedExpenses = useMemo(() => {
    const list = Array.isArray(expenses) ? expenses : [];
    return [...list].sort((a: any, b: any) => {
      if (a.date !== b.date) return a.date < b.date ? 1 : -1;
      const aTime = a.updatedAt || a.createdAt || '';
      const bTime = b.updatedAt || b.createdAt || '';
      if (aTime !== bTime) return aTime < bTime ? 1 : -1;
      const aId = a.expenseId || a.id || '';
      const bId = b.expenseId || b.id || '';
      return aId < bId ? 1 : -1;
    });
  }, [expenses]);

  const openAdd = () => {
    setEditingId(null);
    setForm({ amount: '', category: categories[0] || 'Other', merchant: '', date: new Date().toISOString().slice(0, 10), description: '' });
    setModalVisible(true);
  };

  const openEdit = (e: any) => {
    setEditingId(e.expenseId || e.id);
    setForm({
      amount: String(e.amount ?? ''),
      category: e.category || '',
      merchant: e.merchant || '',
      date: e.date || new Date().toISOString().slice(0, 10),
  description: e.description || '',
  isRecurring: !!e.isRecurring,
    });
    setModalVisible(true);
  };

  const validate = (): { ok: boolean; msg?: string } => {
    const amt = Number(parseFloat((form.amount || '').replace(/[^0-9.]/g, '')));
    if (!isFinite(amt) || amt <= 0) return { ok: false, msg: 'Enter a valid amount' };
    if (!form.category.trim()) return { ok: false, msg: 'Category is required' };
    if (!form.merchant.trim()) return { ok: false, msg: 'Merchant is required' };
    if (!/^\d{4}-\d{2}-\d{2}$/.test(form.date)) return { ok: false, msg: 'Date must be YYYY-MM-DD' };
    return { ok: true };
  };

  const save = async () => {
    const v = validate();
    if (!v.ok) {
      Alert.alert('Invalid', v.msg || 'Please check the form');
      return;
    }
  const amount = Number(parseFloat((form.amount || '').replace(/[^0-9.]/g, '')));
  const category = (form.category && form.category.trim()) || categories[0] || 'Other';
    try {
      if (editingId) {
  await updateExpense();
      } else {
        await addExpense({
      amount,
      category,
          merchant: form.merchant.trim(),
          date: form.date,
          description: form.description.trim(),
          isRecurring: !!form.isRecurring,
          receiptUrl: undefined,
        } as any);
      }
      setModalVisible(false);
      setEditingId(null);
      setForm({ amount: '', category: '', merchant: '', date: new Date().toISOString().slice(0, 10), description: '', isRecurring: false });
    } catch (e) {
      Alert.alert('Error', 'Could not save expense');
    }
  };

  const confirmDelete = () => {
    Alert.alert('Read-Only', 'Deletion disabled in simulated account mode.');
  };

  const fmtMoney = (n: number) => `R${n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const totalSpent = useMemo(() => (Array.isArray(expenses) ? expenses.reduce((s: number, e: any) => s + (Number(e.amount) || 0), 0) : 0), [expenses]);
  const currentMonth = new Date().toISOString().slice(0,7); // YYYY-MM
  const monthExpenses = useMemo(() => sortedExpenses.filter((e: any) => String(e.date || '').startsWith(currentMonth)), [sortedExpenses, currentMonth]);

  // Filters
  const normalized = (s: string) => (s || '').toLowerCase();
  const filterBy = (list: any[]) => list.filter((e: any) => {
    const catOk = filterCategory === 'All' || (e.category || '') === filterCategory;
    const term = normalized(search);
    const text = `${e.merchant || ''} ${e.description || ''}`.toLowerCase();
    const searchOk = !term || text.includes(term);
    return catOk && searchOk;
  });
  const filteredMonthExpenses = useMemo(() => filterBy(monthExpenses), [monthExpenses, search, filterCategory]);
  const filteredHistoryExpenses = useMemo(() => filterBy(sortedExpenses), [sortedExpenses, search, filterCategory]);

  // Budget progress (month)
  const palette = ['#FF6B6B','#4ECDC4','#45B7D1','#96CEB4','#F7DC6F','#A29BFE','#81ECEC','#FAB1A0'];
  const colorForCategory = (name: string) => {
    const i = Math.abs((name || 'Other').split('').reduce((a,c)=>a+c.charCodeAt(0),0)) % palette.length;
    return palette[i];
  };
  const monthTotalSpent = useMemo(() => filteredMonthExpenses.reduce((s, e: any) => s + (Number(e.amount)||0), 0), [filteredMonthExpenses]);
  const categorySpendMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of filteredMonthExpenses) {
      const key = e.category || 'Other';
      map[key] = (map[key] || 0) + (Number(e.amount) || 0);
    }
    return map;
  }, [filteredMonthExpenses]);
  const budgetCategories = useMemo(() => {
    const catBudgets = (budgets || []).filter((b: any) => !!b.category);
    if (catBudgets.length) {
      return catBudgets.map((b: any) => ({
        name: b.category as string,
        spent: categorySpendMap[b.category || 'Other'] || 0,
        budget: Number(b.totalAmount) || 0,
        color: colorForCategory(String(b.category || 'Other')),
      }));
    }
    // Fallback to demo
    return (categoryObjs || []).map((c: any) => ({
      name: c.name,
      spent: categorySpendMap[c.name] || 0,
      budget: Number(c.budget) || 0,
      color: c.color || colorForCategory(c.name),
    }));
  }, [budgets, categorySpendMap, categoryObjs]);
  const totalBudget = useMemo(() => {
    const sum = (budgets || []).filter((b: any) => !!b.category).reduce((s: number, b: any) => s + (Number(b.totalAmount)||0), 0);
    if (sum > 0) return sum;
    return (categoryObjs || []).reduce((s: number, c: any) => s + (Number(c.budget)||0), 0);
  }, [budgets, categoryObjs]);

  const generateRecommendation = () => {
    try {
      setRecommending(true);
      const res = budgetRecommendationService.generate(
        monthExpenses.map((e:any)=>({ amount: Number(e.amount)||0, category: e.category, date: e.date })),
        totalBudget > 0 ? totalBudget : undefined
      );
      setRecommendation(res);
      setPlan(res);
    } catch (e) {
      Alert.alert('Error','Could not generate recommendations');
    } finally {
      setRecommending(false);
    }
  };

  const exportCSV = async (rows: any[]) => {
    const header = ['date','merchant','category','amount','description'];
    const csv = [header.join(',')].concat(
      rows.map((e) => [e.date, wrapCsv(e.merchant), wrapCsv(e.category), Number(e.amount||0).toFixed(2), wrapCsv(e.description)].join(','))
    ).join('\n');
    try {
      await Share.share({ message: csv, title: 'Expenses.csv' });
    } catch (err) {
      Alert.alert('Share failed', 'Could not share CSV.');
    }
  };
  const wrapCsv = (v: any) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return '"' + s.replace(/"/g,'""') + '"';
    }
    return s;
  };

  const TabButton = ({ label, icon, value }: { label: TabKey; icon: keyof typeof Ionicons.glyphMap; value: TabKey }) => (
    <TouchableOpacity onPress={() => setActiveTab(value)} style={[styles.tabBtn, activeTab === value && styles.tabBtnActive]}>
      <Ionicons name={icon} size={16} color={activeTab === value ? theme.colors.text : theme.colors.muted} />
      <Text style={[styles.tabBtnText, activeTab === value && styles.tabBtnTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Expenses</Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity style={styles.addButton} onPress={() => setScannerVisible(true)} accessibilityLabel="Scan receipt">
            <Ionicons name="scan-outline" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Scan</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addButton} onPress={openAdd} accessibilityLabel="Add expense">
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.tabsBar}>
        <TabButton label="Overview" icon="grid-outline" value="Overview" />
        <TabButton label="Month" icon="calendar-outline" value="Month" />
        <TabButton label="Add" icon="add-circle-outline" value="Add" />
        <TabButton label="Balance" icon="wallet-outline" value="Balance" />
        <TabButton label="History" icon="time-outline" value="History" />
      </View>

      {activeTab === 'Overview' && (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Balance</Text>
            <Text style={styles.statValue}>{fmtMoney(Number(currentBalance ?? DEFAULT_TOTAL_BALANCE))}</Text>
          </View>
          <View style={[styles.statCard, { marginTop: 12 }]}>
            <Text style={styles.statLabel}>Total Spent</Text>
            <Text style={styles.statValueDanger}>-{fmtMoney(totalSpent)}</Text>
          </View>
          <View style={[styles.statCard, { marginTop: 12 }]}> 
            <Text style={styles.sectionHeader}>Budget progress (this month)</Text>
            <BudgetProgress
              categories={budgetCategories}
              totalSpent={monthTotalSpent}
              totalBudget={totalBudget}
            />
          </View>
          <View style={{ marginTop: 16 }}>
            <Text style={styles.sectionHeader}>Recent</Text>
            {sortedExpenses.slice(0, 8).map((e: any) => (
              <View key={e.expenseId || e.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{e.merchant}</Text>
                  <Text style={styles.rowSub}>{e.category} • {e.date}</Text>
                </View>
                <Text style={styles.rowAmount}>-{fmtMoney(e.amount)}</Text>
              </View>
            ))}
            {sortedExpenses.length === 0 && (
              <Text style={{ color: theme.colors.muted }}>No expenses yet. Use Scan or Add to get started.</Text>
            )}
          </View>
        </ScrollView>
      )}

      {activeTab === 'Month' && (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <Text style={styles.sectionHeader}>This month ({currentMonth})</Text>
          <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:4, marginBottom:8 }}>
            <Text style={{ color: theme.colors.muted, fontSize:12 }}>Spent vs. suggested allocations</Text>
            <TouchableOpacity onPress={generateRecommendation} disabled={recommending} style={{ paddingHorizontal:12, paddingVertical:6, backgroundColor: theme.colors.primary, borderRadius: 20, opacity: recommending?0.6:1 }}>
              <Text style={{ color:'#fff', fontSize:12 }}>{recommending? 'Generating...' : recommendation? 'Refresh' : 'Recommend'}</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.filtersRow}>
            <View style={[styles.input, { flex: 1 }]}> 
              <TextInput
                style={{ color: theme.colors.text }}
                placeholder="Search merchant or note"
                placeholderTextColor={theme.colors.muted}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <View style={[styles.pickerWrapper, { flex: 1 }]}> 
              {(() => {
                const PickerLib = Picker as any; const Item = (Picker as any).Item;
                const opts = ['All', ...categories.filter(Boolean)];
                return (
                  <PickerLib
                    selectedValue={filterCategory}
                    onValueChange={(v: string) => setFilterCategory(v)}
                    dropdownIconColor={theme.colors.text}
                    style={styles.picker}
                  >
                    {opts.map((c: string) => (<Item key={c} label={c} value={c} />))}
                  </PickerLib>
                );
              })()}
            </View>
          </View>
          {monthExpenses.length === 0 ? (
            <Text style={{ color: theme.colors.muted }}>No expenses this month.</Text>
          ) : (
            filteredMonthExpenses.map((e: any) => (
              <View key={e.expenseId || e.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{e.merchant}</Text>
                  <Text style={styles.rowSub}>{e.category} • {e.date}</Text>
                </View>
                <Text style={styles.rowAmount}>-{fmtMoney(e.amount)}</Text>
                <TouchableOpacity style={styles.rowIcon} onPress={() => openEdit(e)}>
                  <Ionicons name="create-outline" size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rowIcon} onPress={() => confirmDelete()}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
          {recommendation && (
            <View style={[styles.statCard,{ marginTop:16 }]}> 
              <Text style={styles.sectionHeader}>Suggested Budget Plan</Text>
              <Text style={{ color: theme.colors.muted, fontSize:12, marginBottom:8 }}>Auto-generated {new Date(recommendation.generatedAt).toLocaleTimeString()}</Text>
              {recommendation.recommendations.slice(0,8).map(r => {
                const spent = categorySpendMap[r.category] || 0;
                const pct = r.suggested>0? Math.min(100, (spent / r.suggested)*100) : 0;
                return (
                  <View key={r.category} style={{ marginBottom:10 }}>
                    <View style={{ flexDirection:'row', justifyContent:'space-between' }}>
                      <Text style={{ color: theme.colors.text, fontSize:13 }}>{r.category}</Text>
                      <Text style={{ color: theme.colors.muted, fontSize:12 }}>R{spent.toFixed(0)} / R{r.suggested}</Text>
                    </View>
                    <View style={{ height:6, backgroundColor:'rgba(255,255,255,0.08)', borderRadius:3, marginTop:4 }}>
                      <View style={{ width: pct+'%', height:6, backgroundColor: theme.colors.primary, borderRadius:3 }} />
                    </View>
                  </View>
                );
              })}
              {recommendation.note && <Text style={{ color: theme.colors.muted, fontSize:11, marginTop:4 }}>{recommendation.note}</Text>}
            </View>
          )}
        </ScrollView>
      )}

      {activeTab === 'Add' && (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <TouchableOpacity style={styles.primaryCta} onPress={() => setScannerVisible(true)}>
            <Ionicons name="scan-outline" size={18} color={theme.colors.text} />
            <Text style={styles.primaryCtaText}>Scan a receipt</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.primaryCta, { marginTop: 12 }]} onPress={openAdd}>
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.text} />
            <Text style={styles.primaryCtaText}>Add manually</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {activeTab === 'Balance' && (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <View style={styles.statCard}>
            <Text style={styles.statLabel}>Total Balance</Text>
            <Text style={styles.statValue}>{fmtMoney(Number(currentBalance ?? DEFAULT_TOTAL_BALANCE))}</Text>
          </View>
          <View style={[styles.statCard, { marginTop: 12 }]}> 
            <Text style={styles.sectionHeader}>Change balance</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={[styles.input, { flex: 1 }]}> 
                <TextInput
                  style={{ color: theme.colors.text }}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={theme.colors.muted}
                  defaultValue={String(currentBalance ?? DEFAULT_TOTAL_BALANCE)}
                  onSubmitEditing={(e) => {
                    const v = Number(parseFloat((e.nativeEvent.text || '').replace(/[^0-9.]/g, '')));
                    if (!isFinite(v)) { Alert.alert('Invalid', 'Enter a valid number'); return; }
                    setBalance(v);
                  }}
                />
              </View>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => { /* no-op; rely on Enter submission */ }}
              >
                <Text style={styles.saveText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={[styles.statCard, { marginTop: 12 }]}>
            <Text style={styles.statLabel}>Spent to date</Text>
            <Text style={styles.statValueDanger}>-{fmtMoney(totalSpent)}</Text>
          </View>
        </ScrollView>
      )}

      {activeTab === 'History' && (
        <ScrollView contentContainerStyle={{ padding: theme.spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.sectionHeader, { flex: 1 }]}>All expenses</Text>
            {!!filteredHistoryExpenses.length && (
              <TouchableOpacity style={styles.secondaryBtn} onPress={() => exportCSV(filteredHistoryExpenses)}>
                <Ionicons name="share-outline" size={16} color={theme.colors.text} />
                <Text style={styles.secondaryText}>Export CSV</Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.filtersRow}>
            <View style={[styles.input, { flex: 1 }]}> 
              <TextInput
                style={{ color: theme.colors.text }}
                placeholder="Search merchant or note"
                placeholderTextColor={theme.colors.muted}
                value={search}
                onChangeText={setSearch}
              />
            </View>
            <View style={[styles.pickerWrapper, { flex: 1 }]}> 
              {(() => {
                const PickerLib = Picker as any; const Item = (Picker as any).Item;
                const opts = ['All', ...categories.filter(Boolean)];
                return (
                  <PickerLib
                    selectedValue={filterCategory}
                    onValueChange={(v: string) => setFilterCategory(v)}
                    dropdownIconColor={theme.colors.text}
                    style={styles.picker}
                  >
                    {opts.map((c: string) => (<Item key={c} label={c} value={c} />))}
                  </PickerLib>
                );
              })()}
            </View>
          </View>
          {filteredHistoryExpenses.length === 0 ? (
            <Text style={{ color: theme.colors.muted }}>No expense history.</Text>
          ) : (
            filteredHistoryExpenses.map((e: any) => (
              <View key={e.expenseId || e.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle}>{e.merchant}</Text>
                  <Text style={styles.rowSub}>{e.category} • {e.date}</Text>
                </View>
                <Text style={styles.rowAmount}>-{fmtMoney(e.amount)}</Text>
                <TouchableOpacity style={styles.rowIcon} onPress={() => openEdit(e)}>
                  <Ionicons name="create-outline" size={18} color={theme.colors.text} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.rowIcon} onPress={() => confirmDelete()}>
                  <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
      )}

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>{editingId ? 'Edit Expense' : 'Add Expense'}</Text>
            <View style={{ gap: 10 }}>
              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                keyboardType="decimal-pad"
                placeholder="0.00"
                placeholderTextColor={theme.colors.muted}
                value={form.amount}
                onChangeText={(v) => setForm((f) => ({ ...f, amount: v.replace(',', '.') }))}
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.pickerWrapper}>
                {(() => {
                  const PickerLib = Picker as any;
                  const Item = (Picker as any).Item;
                  const options = (() => {
                    const base = [...(categories || [])];
                    if (form.category && !base.includes(form.category)) base.unshift(form.category);
                    return base.length ? base : ['Other'];
                  })();
                  return (
                    <PickerLib
                      selectedValue={form.category}
                      onValueChange={(v: string) => setForm((f) => ({ ...f, category: v }))}
                      dropdownIconColor={theme.colors.text}
                      style={styles.picker}
                    >
                      {options.map((c: string) => (
                        <Item key={c} label={c} value={c} />
                      ))}
                    </PickerLib>
                  );
                })()}
              </View>

              <Text style={styles.label}>Merchant</Text>
              <TextInput
                style={styles.input}
                placeholder="Where did you spend?"
                placeholderTextColor={theme.colors.muted}
                value={form.merchant}
                onChangeText={(v) => setForm((f) => ({ ...f, merchant: v }))}
              />

              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text style={styles.label}>Recurring expense</Text>
                <Switch
                  value={!!form.isRecurring}
                  onValueChange={(v) => setForm((f) => ({ ...f, isRecurring: v }))}
                />
              </View>

              <Text style={styles.label}>Date</Text>
              <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
                <Text style={{ color: theme.colors.text }}>{form.date}</Text>
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={new Date(form.date)}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'inline' : 'default'}
                  onChange={(_, d) => {
                    if (d) {
                      setForm((f) => ({ ...f, date: d.toISOString().slice(0, 10) }));
                    }
                    setShowDatePicker(false);
                  }}
                />
              )}

              <Text style={styles.label}>Description (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                placeholder="Short note"
                placeholderTextColor={theme.colors.muted}
                value={form.description}
                multiline
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
              />

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity style={[styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.saveBtn]} onPress={save}>
                  <Text style={styles.saveText}>{editingId ? 'Save' : 'Add'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ReceiptScanner
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onReceiptProcessed={() => aws?.refreshUserData?.()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.primaryDark,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addButtonText: { color: theme.colors.text, fontWeight: '600' },
  tabsBar: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardAlt,
  },
  tabBtnActive: {
    backgroundColor: theme.colors.primaryDark,
    borderColor: theme.colors.primary,
  },
  tabBtnText: { color: theme.colors.muted, fontWeight: '600', fontSize: 12 },
  tabBtnTextActive: { color: theme.colors.text },
  sectionHeader: { color: theme.colors.text, fontWeight: '700', fontSize: 16, marginBottom: 8 },
  statCard: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
    padding: 14,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  secondaryText: { color: theme.colors.text, fontWeight: '600', fontSize: 12 },
  filtersRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statLabel: { color: theme.colors.muted, fontSize: 12 },
  statValue: { color: theme.colors.text, fontWeight: '800', fontSize: 20 },
  statValueDanger: { color: theme.colors.danger, fontWeight: '800', fontSize: 20 },
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: 14,
    borderRadius: 12,
  },
  primaryCtaText: { color: theme.colors.text, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  rowTitle: { fontSize: 15, fontWeight: '600', color: theme.colors.text },
  rowSub: { fontSize: 12, color: theme.colors.muted, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '700', color: theme.colors.danger, marginRight: 6 },
  rowIcon: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
  },
  backdrop: { flex: 1, backgroundColor: theme.colors.glass, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: theme.colors.card,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: theme.spacing.lg,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: theme.colors.text, marginBottom: 8 },
  label: { fontSize: 12, color: theme.colors.muted },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    backgroundColor: theme.colors.card,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: theme.colors.card,
  },
  picker: {
    color: theme.colors.text,
    height: 48,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.cardAlt,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelText: { color: theme.colors.text, fontWeight: '600' },
  saveBtn: { flex: 1, backgroundColor: theme.colors.primaryDark, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  saveText: { color: theme.colors.text, fontWeight: '700' },
});


