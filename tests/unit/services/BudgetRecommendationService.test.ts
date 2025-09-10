import { budgetRecommendationService } from '@/services/BudgetRecommendationService';

describe('BudgetRecommendationService', () => {
  it('generates recommendations with spending data', () => {
    const res = budgetRecommendationService.generate([
      { amount: 500, category: 'Food', date: new Date().toISOString().slice(0,10) },
      { amount: 300, category: 'Transport', date: new Date().toISOString().slice(0,10) },
      { amount: 200, category: 'Entertainment', date: new Date().toISOString().slice(0,10) }
    ]);
    expect(res.recommendations.length).toBeGreaterThan(0);
    expect(res.totalSuggested).toBeGreaterThan(0);
  });

  it('falls back to default mix when no data', () => {
    const res = budgetRecommendationService.generate([]);
    expect(res.note).toBeDefined();
    expect(res.recommendations.find(r=>r.category==='Savings')).toBeTruthy();
  });
});
