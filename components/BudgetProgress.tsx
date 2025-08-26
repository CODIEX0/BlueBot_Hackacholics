import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface BudgetCategory {
  name: string;
  spent: number;
  budget: number;
  color: string;
}

interface BudgetProgressProps {
  categories: BudgetCategory[];
  totalSpent: number;
  totalBudget: number;
}

export default function BudgetProgress({
  categories,
  totalSpent,
  totalBudget,
}: BudgetProgressProps) {
  const formatCurrency = (amount: number): string => {
    return `R${amount.toLocaleString('en-ZA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const getProgressPercentage = (spent: number, budget: number): number => {
    return Math.min((spent / budget) * 100, 100);
  };

  const getStatusColor = (spent: number, budget: number): string => {
    const percentage = (spent / budget) * 100;
    if (percentage >= 90) return '#EF4444';
    if (percentage >= 75) return '#F59E0B';
    return '#10B981';
  };

  const overallProgress = getProgressPercentage(totalSpent, totalBudget);

  return (
    <View style={styles.container}>
      {/* Overall Progress */}
      <View style={styles.overallSection}>
        <View style={styles.overallHeader}>
          <Text style={styles.overallTitle}>Overall Budget</Text>
          <Text style={styles.overallAmount}>
            {formatCurrency(totalSpent)} / {formatCurrency(totalBudget)}
          </Text>
        </View>
        <View style={styles.overallProgressContainer}>
          <View style={styles.overallProgressBar}>
            <View
              style={[
                styles.overallProgressFill,
                {
                  width: `${overallProgress}%`,
                  backgroundColor: getStatusColor(totalSpent, totalBudget),
                },
              ]}
            />
          </View>
          <Text
            style={[
              styles.overallProgressText,
              { color: getStatusColor(totalSpent, totalBudget) },
            ]}
          >
            {Math.round(overallProgress)}%
          </Text>
        </View>
        <Text style={styles.remainingText}>
          {formatCurrency(Math.max(totalBudget - totalSpent, 0))} remaining
        </Text>
      </View>

      {/* Category Breakdown */}
      <View style={styles.categoriesSection}>
        <Text style={styles.categoriesTitle}>Category Breakdown</Text>
        {categories.map((category, index) => {
          const progress = getProgressPercentage(category.spent, category.budget);
          const statusColor = getStatusColor(category.spent, category.budget);

          return (
            <View key={index} style={styles.categoryItem}>
              <View style={styles.categoryHeader}>
                <View style={styles.categoryInfo}>
                  <View
                    style={[
                      styles.categoryIndicator,
                      { backgroundColor: category.color },
                    ]}
                  />
                  <Text style={styles.categoryName}>{category.name}</Text>
                </View>
                <Text style={styles.categoryAmount}>
                  {formatCurrency(category.spent)} / {formatCurrency(category.budget)}
                </Text>
              </View>
              <View style={styles.categoryProgressContainer}>
                <View style={styles.categoryProgressBar}>
                  <View
                    style={[
                      styles.categoryProgressFill,
                      {
                        width: `${progress}%`,
                        backgroundColor: statusColor,
                      },
                    ]}
                  />
                </View>
                <Text
                  style={[
                    styles.categoryProgressText,
                    { color: statusColor },
                  ]}
                >
                  {Math.round(progress)}%
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  overallSection: {
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  overallHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  overallTitle: {
    fontSize: 18,
    color: '#1E3A8A',
    fontWeight: '600',
  },
  overallAmount: {
    fontSize: 16,
    color: '#64748B',
    fontWeight: '500',
  },
  overallProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  overallProgressBar: {
    flex: 1,
    height: 8,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
    marginRight: 12,
  },
  overallProgressFill: {
    height: 8,
    borderRadius: 4,
  },
  overallProgressText: {
    fontSize: 16,
    fontWeight: '600',
  },
  remainingText: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
  },
  categoriesSection: {
    gap: 16,
  },
  categoriesTitle: {
    fontSize: 16,
    color: '#1E3A8A',
    fontWeight: '600',
    marginBottom: 4,
  },
  categoryItem: {
    gap: 8,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  categoryName: {
    fontSize: 14,
    color: '#1E3A8A',
    fontWeight: '500',
  },
  categoryAmount: {
    fontSize: 14,
    color: '#64748B',
  },
  categoryProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryProgressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginRight: 8,
  },
  categoryProgressFill: {
    height: 4,
    borderRadius: 2,
  },
  categoryProgressText: {
    fontSize: 12,
    fontWeight: '500',
    minWidth: 32,
    textAlign: 'right',
  },
});
