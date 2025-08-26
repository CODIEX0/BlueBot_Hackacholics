import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { theme } from '@/config/theme';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  visible: boolean;
  onClose: () => void;
  onAdd?: () => void;
  onScan?: () => void;
}

export default function AddExpenseModal({ visible, onClose, onAdd, onScan }: Props) {
  return (
    <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Quick Add Expense</Text>
          <Text style={styles.subtitle}>Choose a method</Text>

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.primaryDark }]} onPress={onAdd}>
              <Ionicons name="add" color="#fff" size={20} />
              <Text style={styles.actionText}>Manual</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: theme.colors.accent }]} onPress={onScan}>
              <Ionicons name="camera" color="#fff" size={20} />
              <Text style={styles.actionText}>Scan Receipt</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: theme.colors.card,
    padding: theme.spacing.lg,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: theme.colors.border,
    marginBottom: theme.spacing.md,
  },
  title: {
    fontSize: 20,
    color: theme.colors.text,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    color: theme.colors.muted,
    marginTop: 2,
    marginBottom: theme.spacing.lg,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  actionText: {
    color: '#fff',
    fontWeight: '700',
  },
  close: {
    marginTop: theme.spacing.lg,
    alignItems: 'center',
  },
  closeText: {
    color: theme.colors.muted,
    fontWeight: '600',
  },
});
