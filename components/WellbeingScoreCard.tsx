import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { theme } from '@/config/theme';
import { WellbeingScoreResult } from '@/services/WellbeingScoreService';
import { Ionicons } from '@expo/vector-icons';

interface Props { result: WellbeingScoreResult; onRefresh?: () => void; compact?: boolean; }

const gradeColor = (g: string) => {
  switch (g) {
    case 'A': return theme.colors.success;
    case 'B': return '#4ECDC4';
    case 'C': return theme.colors.warning;
    case 'D': return theme.colors.danger;
    default: return theme.colors.muted;
  }
};

export const WellbeingScoreCard: React.FC<Props> = ({ result, onRefresh, compact }) => {
  return (
    <View style={[styles.card, compact && { padding: 14 }]}> 
      <View style={styles.headerRow}>
        <Text style={styles.title}>Financial Wellbeing</Text>
        {onRefresh && (
          <TouchableOpacity onPress={onRefresh} accessibilityLabel="Refresh wellbeing score">
            <Ionicons name="refresh" size={18} color={theme.colors.muted} />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.scoreRow}>
        <View style={styles.scoreCircle}>
          <Text style={[styles.scoreValue, { color: gradeColor(result.grade) }]}>{Math.round(result.score)}</Text>
          <Text style={styles.gradeLabel}>{result.grade}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 16 }}>
          {result.breakdown.slice(0, compact ? 3 : 5).map(b => (
            <View key={b.key} style={styles.breakRow}>
              <Text style={styles.breakLabel}>{b.label}</Text>
              <Text style={styles.breakValue}>{Math.round(b.normalized)}%</Text>
            </View>
          ))}
          {!compact && (
            <Text style={styles.timestamp}>Updated {new Date(result.generatedAt).toLocaleTimeString()}</Text>
          )}
        </View>
      </View>
      {!compact && (
        <Text style={styles.caption}>Score blends spending balance, savings momentum, diversification, goal progress, and recurring load.</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)'
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  scoreRow: { flexDirection: 'row', alignItems: 'center' },
  scoreCircle: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  scoreValue: { fontSize: 30, fontWeight: '700' },
  gradeLabel: { fontSize: 13, fontWeight: '500', color: theme.colors.muted, marginTop: -4 },
  breakRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  breakLabel: { fontSize: 13, color: theme.colors.muted },
  breakValue: { fontSize: 13, fontWeight: '600', color: theme.colors.text },
  timestamp: { fontSize: 11, color: theme.colors.muted, marginTop: 6 },
  caption: { marginTop: 12, fontSize: 12, lineHeight: 16, color: theme.colors.muted },
});

export default WellbeingScoreCard;
