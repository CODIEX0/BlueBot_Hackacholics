import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { theme } from '@/config/theme';
import { useMobileDatabase } from '@/contexts/MobileDatabaseContext';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import GlassCard from '@/components/GlassCard';

export default function AddExpenseScreen() {
  const router = useRouter();
  const { expenses = [], addExpense, updateExpense, deleteExpense, getCategoriesWithBudgets, editingExpenseId, setEditingExpenseId } = useMobileDatabase();
  const categories = getCategoriesWithBudgets().map(c => c.name);

  const [amount, setAmount] = React.useState('');
  const [category, setCategory] = React.useState(categories[0] || 'Other');
  const [merchant, setMerchant] = React.useState('');
  const [date, setDate] = React.useState(new Date().toISOString().slice(0,10));
  const [showDatePicker, setShowDatePicker] = React.useState(false);
  const [description, setDescription] = React.useState('');
  const [saving, setSaving] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  const editingId = editingExpenseId ?? undefined;
  const isEdit = typeof editingId === 'number' && Number.isFinite(editingId);

  React.useEffect(() => {
    if (isEdit) {
      const target = expenses.find((e) => e.id === editingId);
      if (target) {
        setAmount(String(target.amount));
        setCategory(target.category);
        setMerchant(target.merchant);
        setDate(target.date);
        setDescription(target.description || '');
      }
    }
  }, [isEdit, editingId, expenses]);

  const onSave = async () => {
    const value = parseFloat(amount);
    if (isNaN(value) || value <= 0) return Alert.alert('Invalid amount', 'Please enter a valid amount.');
    if (!merchant.trim()) return Alert.alert('Missing merchant', 'Please enter a merchant.');
    try {
      setSaving(true);
      if (isEdit && editingId) {
        await updateExpense(editingId, {
          amount: value,
          category,
          merchant: merchant.trim(),
          description: description.trim(),
          date,
        });
        Alert.alert('Updated', 'Expense updated successfully.');
      } else {
        await addExpense({
          amount: value,
          category,
          merchant: merchant.trim(),
          description: description.trim(),
          date,
          isRecurring: false,
          receiptUrl: undefined,
        });
        Alert.alert('Saved', 'Expense added successfully.');
      }
      // Clear editing state and go back
      setEditingExpenseId(null);
      router.back();
    } catch (e) {
      Alert.alert('Error', 'Could not save expense.');
    } finally {
      setSaving(false);
    }
  };

  const onDelete = (specificId?: number) => {
    const targetId = typeof specificId === 'number' ? specificId : editingId;
    if (!targetId) return;
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteExpense(targetId);
              Alert.alert('Deleted', 'Expense deleted.');
              setEditingExpenseId(null);
              router.back();
            } catch (e) {
              Alert.alert('Error', 'Failed to delete expense.');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={theme.gradients.hero as any} style={styles.header}>
        <TouchableOpacity onPress={() => { setEditingExpenseId(null); router.back(); }} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEdit ? 'Edit Expense' : 'Add Expense'}</Text>
        <View style={styles.headerBtn} />
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.card} border>
        <Text style={styles.label}>Amount</Text>
        <TextInput
          style={styles.input}
          placeholder="0.00"
          placeholderTextColor={theme.colors.muted}
          keyboardType="decimal-pad"
          value={amount}
          onChangeText={(v) => setAmount(v.replace(',', '.'))}
        />

        <Text style={styles.label}>Category</Text>
        <View style={styles.pickerWrapper}>
          {(() => {
            const PickerLib = Picker as any;
            const Item = (Picker as any).Item;
            return (
              <PickerLib
                selectedValue={category}
                onValueChange={(v: string) => setCategory(v)}
                dropdownIconColor={theme.colors.text}
                style={styles.picker}
              >
                {categories.map((c) => (
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
          value={merchant}
          onChangeText={setMerchant}
        />

        <Text style={styles.label}>Date</Text>
        <TouchableOpacity style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={{ color: theme.colors.text }}>{date}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={new Date(date)}
            mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            onChange={(_, d) => {
              if (d) {
                const iso = d.toISOString().slice(0,10);
                setDate(iso);
              }
              setShowDatePicker(false);
            }}
          />
        )}

        <Text style={styles.label}>Description</Text>
        <TextInput
          style={[styles.input, { height: 100, textAlignVertical: 'top' }]}
          placeholder="Optional notes"
          placeholderTextColor={theme.colors.muted}
          value={description}
          onChangeText={setDescription}
          multiline
        />
        </GlassCard>

        {/* Recent expenses (read + quick edit/delete) */}
        {expenses.length > 0 && (
          <View style={{ marginTop: 16 }}>
            <Text style={[styles.sectionTitle]}>Recent Expenses</Text>
            {expenses.slice(0, 5).map((e) => (
              <GlassCard key={e.id} style={styles.listItem} border>
                <View style={styles.listLeft}>
                  <View style={styles.listIcon}> 
                    <Ionicons name="card" size={16} color={theme.colors.accent} />
                  </View>
                  <View>
                    <Text style={styles.itemTitle}>{e.merchant}</Text>
                    <Text style={styles.itemSub}>R{e.amount.toFixed(2)} • {e.category} • {e.date}</Text>
                  </View>
                </View>
                <View style={styles.listActions}>
                  <TouchableOpacity onPress={() => { setEditingExpenseId(e.id); router.push('/add-expense'); }} style={styles.actionBtn}>
                    <Ionicons name="create-outline" size={18} color={theme.colors.text} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { onDelete(e.id); }} style={styles.actionBtn}>
                    <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
                  </TouchableOpacity>
                </View>
              </GlassCard>
            ))}
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          {isEdit && (
            <TouchableOpacity style={[styles.secondaryBtn]} onPress={() => onDelete()} disabled={deleting}>
              <Ionicons name="trash" size={18} color={theme.colors.danger} />
              <Text style={[styles.secondaryText, { color: theme.colors.danger }]}>{deleting ? 'Deleting…' : 'Delete'}</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.saveBtn} onPress={onSave} disabled={saving}>
            <Ionicons name="save" size={20} color="#fff" />
            <Text style={styles.saveText}>{saving ? (isEdit ? 'Updating…' : 'Saving…') : (isEdit ? 'Update Expense' : 'Save Expense')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { color: theme.colors.text, fontSize: 18, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 120 },
  card: { padding: 16 },
  label: { color: theme.colors.muted, marginBottom: 6, marginTop: 14, fontWeight: '600' },
  input: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    color: theme.colors.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  pickerWrapper: {
    backgroundColor: theme.colors.card,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 12,
  },
  picker: {
    color: theme.colors.text,
    height: 48,
  },
  footer: { padding: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  saveBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  saveText: { color: '#fff', fontWeight: '700' },
  secondaryBtn: {
    height: 52,
    borderRadius: 12,
    backgroundColor: theme.colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  secondaryText: { fontWeight: '700', color: theme.colors.text },
  sectionTitle: { color: theme.colors.text, fontSize: 16, fontWeight: '700', marginBottom: 8, paddingHorizontal: 4 },
  listItem: { padding: 12, marginBottom: 10 },
  listLeft: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  listIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.chipBg },
  itemTitle: { color: theme.colors.text, fontWeight: '600' },
  itemSub: { color: theme.colors.muted, marginTop: 2, fontSize: 12 },
  listActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actionBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border },
});
