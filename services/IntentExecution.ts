import { ExpenseIntent } from './NLIntents';

// Minimal Expense shape for targeting and summaries
export interface SimpleExpense {
  id: number;
  amount: number;
  category: string;
  merchant: string;
  description?: string;
  date: string; // YYYY-MM-DD
}

export function selectExpenseTargets(expenses: SimpleExpense[], intent: ExpenseIntent): SimpleExpense[] {
  let list = [...expenses];

  // Filter by range or exact date
  if (intent.range?.start && intent.range?.end) {
    list = list.filter(e => e.date >= intent.range!.start! && e.date <= intent.range!.end!);
  } else if (intent.date) {
    list = list.filter(e => e.date === intent.date);
  }

  // Filter by category if provided
  if (intent.categoryRaw) {
    const key = intent.categoryRaw.toLowerCase();
    list = list.filter(e => e.category.toLowerCase().includes(key));
  }

  // Filter by merchant if provided
  if (intent.merchant) {
    const key = intent.merchant.toLowerCase();
    list = list.filter(e => e.merchant.toLowerCase().includes(key));
  }

  // If amount present for update/delete, prefer near matches (±1 rand)
  if ((intent.type === 'update' || intent.type === 'delete') && typeof intent.amount === 'number') {
    const amt = intent.amount;
    const near = list.filter(e => Math.abs(e.amount - amt) <= 1);
    if (near.length > 0) list = near;
  }

  // Sort by recency desc, then by amount proximity if amount given
  list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  if (typeof intent.amount === 'number') {
    const amt = intent.amount;
    list.sort((a, b) => Math.abs(a.amount - amt) - Math.abs(b.amount - amt));
  }

  return list;
}

export function summarizeExpense(e: SimpleExpense): string {
  return `${e.merchant} - ${e.category} - R${e.amount.toFixed(2)} on ${e.date}`;
}

export function disambiguationMessage(candidates: SimpleExpense[], max = 3): string {
  const top = candidates.slice(0, max);
  return `I found multiple matches. Please pick one:\n` +
    top.map((e, i) => `${i + 1}) ${summarizeExpense(e)}`).join('\n');
}

export function buildActionSummary(intent: ExpenseIntent): string {
  switch (intent.type) {
    case 'create': {
      const amt = intent.amount ? `R${intent.amount.toFixed(2)}` : 'an expense';
      const cat = intent.categoryRaw ? ` in ${intent.categoryRaw}` : '';
      const mer = intent.merchant ? ` at ${intent.merchant}` : '';
      const dt = intent.date ? ` on ${intent.date}` : '';
      return `Add ${amt}${cat}${mer}${dt}?`;
    }
    case 'update': {
      const changes: string[] = [];
      if (typeof intent.amount === 'number') changes.push(`amount to R${intent.amount.toFixed(2)}`);
      if (intent.categoryRaw) changes.push(`category to ${intent.categoryRaw}`);
      if (intent.merchant) changes.push(`merchant to ${intent.merchant}`);
      return `Update the selected expense ${changes.length ? 'setting ' + changes.join(', ') : ''}?`;
    }
    case 'delete':
      return 'Delete the selected expense?';
    case 'read':
    default:
      return 'Show requested spending?';
  }
}
