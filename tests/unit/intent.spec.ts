import { parseExpenseIntent, ExpenseIntent } from '../../services/NLIntents';
import { selectExpenseTargets, summarizeExpense } from '../../services/IntentExecution';

describe('NLIntents.parseExpenseIntent', () => {
  test('parses create with amount/category/merchant/date keywords', () => {
    const intent = parseExpenseIntent('Add R200 for groceries at Checkers today');
    expect(intent).not.toBeNull();
    expect(intent!.type).toBe('create');
    expect(intent!.amount).toBeGreaterThan(0);
    expect(intent!.categoryRaw).toBeTruthy();
    expect(intent!.merchant?.toLowerCase()).toContain('checkers');
    expect(intent!.date || intent!.range).toBeTruthy();
  });

  test('parses read totals last month', () => {
    const intent = parseExpenseIntent('Show my total spending last month');
    expect(intent).not.toBeNull();
    expect(intent!.type).toBe('read');
    expect(intent!.range).toBeTruthy();
  });

  test('parses update target and amount', () => {
    const intent = parseExpenseIntent('Update my Uber to R150');
    expect(intent).not.toBeNull();
    expect(intent!.type).toBe('update');
    expect(intent!.merchant?.toLowerCase()).toContain('uber');
    expect(typeof intent!.amount).toBe('number');
  });

  test('parses delete last coffee', () => {
    const intent = parseExpenseIntent('Delete my last coffee expense');
    expect(intent).not.toBeNull();
    expect(intent!.type).toBe('delete');
  });
});

describe('IntentExecution.selectExpenseTargets', () => {
  const mock: Array<{ id: number; amount: number; category: string; merchant: string; date: string }> = [
    { id: 1, amount: 50, category: 'Food & Dining', merchant: 'Starbucks', date: '2025-08-20' },
    { id: 2, amount: 150, category: 'Transportation', merchant: 'Uber', date: '2025-08-22' },
    { id: 3, amount: 200, category: 'Food & Dining', merchant: 'Checkers', date: '2025-08-21' },
  ];

  test('filters by merchant and picks closest amount', () => {
    const intent: ExpenseIntent = { domain: 'expense', type: 'update', merchant: 'uber', amount: 155 };
    const res = selectExpenseTargets(mock as any, intent);
    expect(res[0].merchant).toBe('Uber');
  });

  test('filters by category and date range', () => {
    const intent: ExpenseIntent = { domain: 'expense', type: 'delete', categoryRaw: 'Food', range: { start: '2025-08-20', end: '2025-08-21' } };
    const res = selectExpenseTargets(mock as any, intent);
    expect(res.map(r => r.id)).toEqual(expect.arrayContaining([1,3]));
  });
});
