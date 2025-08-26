/**
 * Advanced Analytics Service for BlueBot
 * Provides detailed financial insights, predictions, and recommendations
 */

import { Transaction } from '../types/finance';

export interface SpendingPattern {
  category: string;
  averageDaily: number;
  averageWeekly: number;
  averageMonthly: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  seasonality: 'high' | 'medium' | 'low';
}

export interface FinancialInsight {
  type: 'warning' | 'tip' | 'achievement' | 'prediction';
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  category?: string;
  actionable: boolean;
  actions?: string[];
}

export interface BudgetRecommendation {
  category: string;
  currentSpending: number;
  recommendedBudget: number;
  reasoning: string;
  confidence: number; // 0-1
}

export interface SpendingForecast {
  period: 'week' | 'month' | 'quarter';
  categories: {
    [category: string]: {
      predicted: number;
      confidence: number;
      factors: string[];
    };
  };
  total: number;
  accuracy: number;
}

class AnalyticsService {
  private readonly STORAGE_KEY = '@bluebot_analytics';

  /**
   * Analyze spending patterns across different time periods
   */
  analyzeSpendingPatterns(Transactions: Transaction[]): SpendingPattern[] {
    const categoryGroups = this.groupTransactionsByCategory(Transactions);
    const patterns: SpendingPattern[] = [];

    for (const [category, categoryTransactions] of Object.entries(categoryGroups)) {
      const dailyAmounts = this.calculateDailyAverages(categoryTransactions);
      const weeklyAmounts = this.calculateWeeklyAverages(categoryTransactions);
      const monthlyAmounts = this.calculateMonthlyAverages(categoryTransactions);

      const trend = this.determineTrend(categoryTransactions);
      const seasonality = this.analyzeSeasonality(categoryTransactions);

      patterns.push({
        category,
        averageDaily: dailyAmounts,
        averageWeekly: weeklyAmounts,
        averageMonthly: monthlyAmounts,
        trend,
        seasonality,
      });
    }

    return patterns.sort((a, b) => b.averageMonthly - a.averageMonthly);
  }

  /**
   * Generate personalized financial insights
   */
  generateInsights(Transactions: Transaction[], patterns: SpendingPattern[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    // Check for unusual spending spikes
    insights.push(...this.detectSpendingSpikes(Transactions));
    
    // Identify saving opportunities
    insights.push(...this.identifySavingOpportunities(patterns));
    
    // Detect budget overshoots
    insights.push(...this.detectBudgetOvershoots(Transactions));
    
    // Generate category-specific tips
    insights.push(...this.generateCategoryTips(patterns));

    return insights.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 };
      return impactOrder[b.impact] - impactOrder[a.impact];
    });
  }

  /**
   * Generate budget recommendations based on spending history
   */
  generateBudgetRecommendations(Transactions: Transaction[]): BudgetRecommendation[] {
    const patterns = this.analyzeSpendingPatterns(Transactions);
    const recommendations: BudgetRecommendation[] = [];

    for (const pattern of patterns) {
      const currentSpending = pattern.averageMonthly;
      let recommendedBudget: number;
      let reasoning: string;
      let confidence: number;

      if (pattern.trend === 'increasing') {
        recommendedBudget = currentSpending * 1.1; // 10% buffer for increasing trends
        reasoning = 'Spending is trending upward, added 10% buffer for flexibility';
        confidence = 0.8;
      } else if (pattern.trend === 'decreasing') {
        recommendedBudget = currentSpending * 0.95; // Optimize for decreasing trends
        reasoning = 'Spending is decreasing, optimized budget to encourage continued reduction';
        confidence = 0.9;
      } else {
        recommendedBudget = currentSpending * 1.05; // 5% buffer for stable spending
        reasoning = 'Stable spending pattern, added small buffer for unexpected Transactions';
        confidence = 0.85;
      }

      // Adjust for category-specific factors
      if (pattern.category === 'Food' || pattern.category === 'Groceries') {
        recommendedBudget *= 1.1; // Food prices can be volatile
        reasoning += '. Added extra buffer for food price fluctuations';
      }

      recommendations.push({
        category: pattern.category,
        currentSpending,
        recommendedBudget: Math.round(recommendedBudget),
        reasoning,
        confidence,
      });
    }

    return recommendations;
  }

  /**
   * Forecast future spending based on historical data
   */
  forecastSpending(Transactions: Transaction[], period: 'week' | 'month' | 'quarter'): SpendingForecast {
    const patterns = this.analyzeSpendingPatterns(Transactions);
    const categoryForecasts: { [category: string]: any } = {};
    let totalForecast = 0;

    for (const pattern of patterns) {
      let baseForecast: number;
      let factors: string[] = [];

      // Base forecast on historical average
      switch (period) {
        case 'week':
          baseForecast = pattern.averageWeekly;
          break;
        case 'month':
          baseForecast = pattern.averageMonthly;
          break;
        case 'quarter':
          baseForecast = pattern.averageMonthly * 3;
          break;
      }

      // Adjust for trends
      if (pattern.trend === 'increasing') {
        baseForecast *= 1.15;
        factors.push('Increasing spending trend');
      } else if (pattern.trend === 'decreasing') {
        baseForecast *= 0.9;
        factors.push('Decreasing spending trend');
      }

      // Adjust for seasonality
      if (pattern.seasonality === 'high') {
        baseForecast *= 1.2;
        factors.push('High seasonal variation');
      } else if (pattern.seasonality === 'low') {
        baseForecast *= 1.05;
        factors.push('Low seasonal variation');
      }

      const confidence = this.calculateForecastConfidence(pattern);

      categoryForecasts[pattern.category] = {
        predicted: Math.round(baseForecast),
        confidence,
        factors,
      };

      totalForecast += baseForecast;
    }

    return {
      period,
      categories: categoryForecasts,
      total: Math.round(totalForecast),
      accuracy: this.calculateOverallAccuracy(patterns),
    };
  }

  private groupTransactionsByCategory(Transactions: Transaction[]): { [category: string]: Transaction[] } {
    return Transactions.reduce((groups, Transaction) => {
      const category = Transaction.category || 'Other';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(Transaction);
      return groups;
    }, {} as { [category: string]: Transaction[] });
  }

  private calculateDailyAverages(Transactions: Transaction[]): number {
    if (Transactions.length === 0) return 0;
    
    const total = Transactions.reduce((sum, exp) => sum + exp.amount, 0);
    const days = this.getDaysBetween(Transactions[0].date, Transactions[Transactions.length - 1].date) || 1;
    return total / days;
  }

  private calculateWeeklyAverages(Transactions: Transaction[]): number {
    return this.calculateDailyAverages(Transactions) * 7;
  }

  private calculateMonthlyAverages(Transactions: Transaction[]): number {
    return this.calculateDailyAverages(Transactions) * 30;
  }

  private determineTrend(Transactions: Transaction[]): 'increasing' | 'decreasing' | 'stable' {
    if (Transactions.length < 4) return 'stable';

    const sortedTransactions = [...Transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const firstHalf = sortedTransactions.slice(0, Math.floor(sortedTransactions.length / 2));
    const secondHalf = sortedTransactions.slice(Math.floor(sortedTransactions.length / 2));

    const firstHalfAvg = firstHalf.reduce((sum, exp) => sum + exp.amount, 0) / firstHalf.length;
    const secondHalfAvg = secondHalf.reduce((sum, exp) => sum + exp.amount, 0) / secondHalf.length;

    const changePercent = (secondHalfAvg - firstHalfAvg) / firstHalfAvg;

    if (changePercent > 0.1) return 'increasing';
    if (changePercent < -0.1) return 'decreasing';
    return 'stable';
  }

  private analyzeSeasonality(Transactions: Transaction[]): 'high' | 'medium' | 'low' {
    if (Transactions.length < 12) return 'medium';

    const monthlyTotals = new Array(12).fill(0);
    const monthlyCounts = new Array(12).fill(0);

    Transactions.forEach(Transaction => {
      const month = new Date(Transaction.date).getMonth();
      monthlyTotals[month] += Transaction.amount;
      monthlyCounts[month]++;
    });

    const monthlyAverages = monthlyTotals.map((total, index) => 
      monthlyCounts[index] > 0 ? total / monthlyCounts[index] : 0
    );

    const overallAverage = monthlyAverages.reduce((sum, avg) => sum + avg, 0) / 12;
    const variance = monthlyAverages.reduce((sum, avg) => sum + Math.pow(avg - overallAverage, 2), 0) / 12;
    const coefficientOfVariation = Math.sqrt(variance) / overallAverage;

    if (coefficientOfVariation > 0.3) return 'high';
    if (coefficientOfVariation > 0.15) return 'medium';
    return 'low';
  }

  private detectSpendingSpikes(Transactions: Transaction[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];
    const recentTransactions = Transactions.filter(exp => {
      const TransactionDate = new Date(exp.date);
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return TransactionDate >= weekAgo;
    });

    const recentTotal = recentTransactions.reduce((sum, exp) => sum + exp.amount, 0);
    const avgWeeklySpending = this.calculateWeeklyAverages(Transactions);

    if (recentTotal > avgWeeklySpending * 1.5) {
      insights.push({
        type: 'warning',
        title: 'Unusual Spending Spike Detected',
        description: `Your spending this week (R${recentTotal.toFixed(2)}) is ${((recentTotal / avgWeeklySpending - 1) * 100).toFixed(0)}% higher than your average.`,
        impact: 'high',
        actionable: true,
        actions: [
          'Review recent purchases for unnecessary Transactions',
          'Set spending alerts for the rest of the month',
          'Consider postponing non-essential purchases'
        ]
      });
    }

    return insights;
  }

  private identifySavingOpportunities(patterns: SpendingPattern[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    for (const pattern of patterns) {
      if (pattern.averageMonthly > 1000 && pattern.trend === 'increasing') {
        insights.push({
          type: 'tip',
          title: `Optimize ${pattern.category} Spending`,
          description: `You're spending R${pattern.averageMonthly.toFixed(2)} monthly on ${pattern.category} with an increasing trend. Consider setting a budget limit.`,
          impact: 'medium',
          category: pattern.category,
          actionable: true,
          actions: [
            `Set a monthly budget of R${(pattern.averageMonthly * 0.9).toFixed(2)} for ${pattern.category}`,
            'Track daily Transactions in this category',
            'Look for alternatives or discounts'
          ]
        });
      }
    }

    return insights;
  }

  private detectBudgetOvershoots(Transactions: Transaction[]): FinancialInsight[] {
    // This would integrate with actual budget data
    // For now, return empty array
    return [];
  }

  private generateCategoryTips(patterns: SpendingPattern[]): FinancialInsight[] {
    const insights: FinancialInsight[] = [];

    const foodPattern = patterns.find(p => p.category.toLowerCase().includes('food') || p.category.toLowerCase().includes('grocery'));
    if (foodPattern && foodPattern.averageMonthly > 2000) {
      insights.push({
        type: 'tip',
        title: 'Food Budget Optimization',
        description: 'Your food Transactions are quite high. Consider meal planning and bulk buying to reduce costs.',
        impact: 'medium',
        category: foodPattern.category,
        actionable: true,
        actions: [
          'Plan weekly meals in advance',
          'Buy ingredients in bulk',
          'Cook at home more often',
          'Use grocery store loyalty programs'
        ]
      });
    }

    return insights;
  }

  private calculateForecastConfidence(pattern: SpendingPattern): number {
    let confidence = 0.7; // Base confidence

    // Higher confidence for stable trends
    if (pattern.trend === 'stable') confidence += 0.1;
    
    // Lower confidence for high seasonality
    if (pattern.seasonality === 'high') confidence -= 0.1;
    
    // Higher confidence for consistent categories
    if (['Food', 'Transport', 'Utilities'].includes(pattern.category)) {
      confidence += 0.1;
    }

    return Math.min(0.95, Math.max(0.5, confidence));
  }

  private calculateOverallAccuracy(patterns: SpendingPattern[]): number {
    const avgConfidence = patterns.reduce((sum, p) => sum + this.calculateForecastConfidence(p), 0) / patterns.length;
    return Math.round(avgConfidence * 100) / 100;
  }

  private getDaysBetween(startDate: string, endDate: string): number {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
}

export default new AnalyticsService();
