import { financialNarrativeService } from '@/services/FinancialNarrativeService';
import { WellbeingScoreResult } from '@/services/WellbeingScoreService';

const mockWellbeing: WellbeingScoreResult = {
  score: 72,
  grade: 'B',
  generatedAt: new Date().toISOString(),
  breakdown: [
    { key:'eff', label:'Spending Efficiency', weight:0.3, raw:0.5, normalized:60, contribution:18 },
    { key:'sav', label:'Savings Momentum', weight:0.2, raw:500, normalized:55, contribution:11 },
    { key:'div', label:'Category Diversification', weight:0.15, raw:0.3, normalized:70, contribution:10.5 },
    { key:'go', label:'Goal Progress', weight:0.2, raw:40, normalized:40, contribution:8 },
    { key:'rec', label:'Recurring Balance', weight:0.15, raw:50, normalized:65, contribution:9.75 },
  ]
};

describe('FinancialNarrativeService', () => {
  it('generates narrative with wellbeing only', () => {
    const res = financialNarrativeService.generate({ wellbeing: mockWellbeing, currentBalance: 10000, recentSpend: 4200 });
    expect(res.narrative).toContain('Financial Wellbeing Score');
    expect(res.highlights.length).toBeGreaterThan(0);
  });

  it('handles missing wellbeing gracefully', () => {
    const res = financialNarrativeService.generate({ wellbeing: null, currentBalance: 0, recentSpend: 0 });
    expect(res.narrative).toContain('No wellbeing score');
  });
});
