// Lightweight natural language intent parsing for expense CRUD
// Free, local-only heuristics

export type IntentType = 'create' | 'read' | 'update' | 'delete';

export interface DateRange {
  start?: string; // YYYY-MM-DD
  end?: string;   // YYYY-MM-DD
}

export interface ExpenseIntent {
  domain: 'expense';
  type: IntentType;
  amount?: number;
  categoryRaw?: string;
  merchant?: string;
  description?: string;
  date?: string; // YYYY-MM-DD
  range?: DateRange;
  target?: 'last' | 'byMerchant' | 'byCategory' | 'all';
}

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseAmount(text: string): number | undefined {
  // Matches R1,234.56 or 1234 or 1234.50 etc.
  const m = text.match(/(?:^|\s)r\s*([0-9][0-9.,]*)|(?:^|\s)([0-9][0-9.,]*)\s*(?:rand|zar)?/i);
  if (!m) return undefined;
  const raw = (m[1] || m[2] || '').replace(/[,\s]/g, '');
  if (!raw) return undefined;
  const val = parseFloat(raw);
  return isNaN(val) ? undefined : val;
}

function parseRelativeDate(text: string): { date?: string; range?: DateRange } {
  const now = new Date();
  const lower = text.toLowerCase();
  if (/(today)/.test(lower)) return { date: toISODate(now) };
  if (/(yesterday)/.test(lower)) {
    const d = new Date(now); d.setDate(d.getDate() - 1); return { date: toISODate(d) };
  }
  if (/(last\s+week)/.test(lower)) {
    const d = new Date(now); const day = d.getDay();
    const end = new Date(d); end.setDate(d.getDate() - day);
    const start = new Date(end); start.setDate(end.getDate() - 7);
    return { range: { start: toISODate(start), end: toISODate(end) } };
  }
  if (/(this\s+week)/.test(lower)) {
    const d = new Date(now); const day = d.getDay();
    const start = new Date(d); start.setDate(d.getDate() - day);
    return { range: { start: toISODate(start), end: toISODate(now) } };
  }
  if (/(last\s+month)/.test(lower)) {
    const d = new Date(now); d.setDate(1); d.setMonth(d.getMonth() - 1);
    const start = new Date(d);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return { range: { start: toISODate(start), end: toISODate(end) } };
  }
  if (/(this\s+month)/.test(lower)) {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { range: { start: toISODate(start), end: toISODate(now) } };
  }
  // on 10 Aug / 10 August / 2025-08-10
  const mDmy = lower.match(/on\s+(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\b/i);
  if (mDmy) {
    const day = parseInt(mDmy[1], 10);
    const monStr = mDmy[2].slice(0,3).toLowerCase();
    const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
    const month = months.indexOf(monStr);
    const year = now.getFullYear();
    const d = new Date(year, month, day);
    return { date: toISODate(d) };
  }
  const mIso = lower.match(/(20\d{2}-\d{2}-\d{2})/);
  if (mIso) return { date: mIso[1] };

  return {};
}

function extractCategory(text: string): string | undefined {
  // naive extraction by common keywords
  const lower = text.toLowerCase();
  const catMap: Record<string, string> = {
    groceries: 'Food & Dining',
    grocery: 'Food & Dining',
    food: 'Food & Dining',
    dining: 'Food & Dining',
    transport: 'Transportation',
    fuel: 'Transportation',
    petrol: 'Transportation',
    uber: 'Transportation',
    shopping: 'Shopping',
    clothes: 'Shopping',
    clothing: 'Shopping',
    entertainment: 'Entertainment',
    movie: 'Entertainment',
    movies: 'Entertainment',
    bill: 'Bills & Utilities',
    electricity: 'Bills & Utilities',
    water: 'Bills & Utilities',
    rent: 'Housing',
    coffee: 'Food & Dining',
    lunch: 'Food & Dining',
    breakfast: 'Food & Dining',
  };
  for (const key of Object.keys(catMap)) {
    if (lower.includes(key)) return catMap[key];
  }
  return undefined;
}

function extractMerchant(text: string): string | undefined {
  // naive merchant extract: after 'at', 'from', 'to', 'with', or 'my'
  const m = text.match(/\b(?:at|from|to|with|my)\s+([A-Za-z][\w&'\- ]{1,40})/i);
  if (m) return m[1].trim();
  return undefined;
}

export function parseExpenseIntent(text: string): ExpenseIntent | null {
  const lower = (text || '').toLowerCase();
  const amount = parseAmount(text);
  const { date, range } = parseRelativeDate(text);
  const categoryRaw = extractCategory(text);
  const merchant = extractMerchant(text);

  // Create
  if (/(^|\s)(add|record|log)\b/.test(lower) || (amount && /(for|on|spent|spend)/.test(lower))) {
    return {
      domain: 'expense',
      type: 'create',
      amount,
      categoryRaw,
      merchant,
      description: text,
      date,
    };
  }

  // Read
  if (/(^|\s)(show|list|how much|total|report|view)\b/.test(lower)) {
    return {
      domain: 'expense',
      type: 'read',
      categoryRaw,
      range,
      target: categoryRaw ? 'byCategory' : 'all'
    };
  }

  // Update
  if (/(^|\s)(update|change|edit|correct)\b/.test(lower)) {
    return {
      domain: 'expense',
      type: 'update',
      amount,
      categoryRaw,
      merchant,
      description: text,
      target: merchant ? 'byMerchant' : (categoryRaw ? 'byCategory' : 'last')
    };
  }

  // Delete
  if (/(^|\s)(delete|remove|undo)\b/.test(lower)) {
    return {
      domain: 'expense',
      type: 'delete',
      categoryRaw,
      merchant,
      target: merchant ? 'byMerchant' : (categoryRaw ? 'byCategory' : 'last')
    };
  }

  // Fallback no match
  return null;
}
