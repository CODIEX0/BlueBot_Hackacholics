import { wellbeingScoreService } from '@/services/WellbeingScoreService';

describe('WellbeingScoreService', () => {
  it('computes a score within 0-100', () => {
    const res = wellbeingScoreService.compute([
      { amount: 200, category: 'Food', date: new Date().toISOString().slice(0,10) },
      { amount: 150, category: 'Transport', date: new Date().toISOString().slice(0,10), isRecurring: true },
      { amount: 50, category: 'Entertainment', date: new Date().toISOString().slice(0,10) }
    ], [], 5000);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
    expect(res.breakdown.length).toBe(5);
  });

  it('handles empty data gracefully', () => {
    const res = wellbeingScoreService.compute([], [], 0);
    expect(res.score).toBeGreaterThanOrEqual(0);
    expect(res.score).toBeLessThanOrEqual(100);
  });
});
