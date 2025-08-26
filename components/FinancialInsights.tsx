import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { TrendingUp, TrendingDown, AlertTriangle, Lightbulb } from 'lucide-react-native';

interface Insight {
  id: string;
  type: 'positive' | 'negative' | 'warning' | 'tip';
  title: string;
  message: string;
  actionText?: string;
  onAction?: () => void;
}

interface FinancialInsightsProps {
  insights: Insight[];
}

export default function FinancialInsights({ insights }: FinancialInsightsProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <TrendingUp size={20} color="#10B981" />;
      case 'negative':
        return <TrendingDown size={20} color="#EF4444" />;
      case 'warning':
        return <AlertTriangle size={20} color="#F59E0B" />;
      case 'tip':
        return <Lightbulb size={20} color="#0EA5E9" />;
      default:
        return <TrendingUp size={20} color="#64748B" />;
    }
  };

  const getInsightColors = (type: string) => {
    switch (type) {
      case 'positive':
        return {
          backgroundColor: '#F0FDF4',
          borderColor: '#10B981',
          titleColor: '#047857',
          messageColor: '#065F46',
        };
      case 'negative':
        return {
          backgroundColor: '#FEF2F2',
          borderColor: '#EF4444',
          titleColor: '#DC2626',
          messageColor: '#991B1B',
        };
      case 'warning':
        return {
          backgroundColor: '#FFFBEB',
          borderColor: '#F59E0B',
          titleColor: '#D97706',
          messageColor: '#92400E',
        };
      case 'tip':
        return {
          backgroundColor: '#F0F9FF',
          borderColor: '#0EA5E9',
          titleColor: '#0284C7',
          messageColor: '#075985',
        };
      default:
        return {
          backgroundColor: '#F8FAFC',
          borderColor: '#64748B',
          titleColor: '#334155',
          messageColor: '#475569',
        };
    }
  };

  return (
    <View style={styles.container}>
      {insights.map((insight) => {
        const colors = getInsightColors(insight.type);
        return (
          <View
            key={insight.id}
            style={[
              styles.insightCard,
              {
                backgroundColor: colors.backgroundColor,
                borderColor: colors.borderColor,
              },
            ]}
          >
            <View style={styles.insightHeader}>
              <View style={styles.insightIcon}>
                {getInsightIcon(insight.type)}
              </View>
              <View style={styles.insightContent}>
                <Text
                  style={[
                    styles.insightTitle,
                    { color: colors.titleColor },
                  ]}
                >
                  {insight.title}
                </Text>
                <Text
                  style={[
                    styles.insightMessage,
                    { color: colors.messageColor },
                  ]}
                >
                  {insight.message}
                </Text>
              </View>
            </View>
            {insight.actionText && insight.onAction && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { borderColor: colors.borderColor },
                ]}
                onPress={insight.onAction}
              >
                <Text
                  style={[
                    styles.actionText,
                    { color: colors.titleColor },
                  ]}
                >
                  {insight.actionText}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  insightCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  insightMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
