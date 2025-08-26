import { Platform } from 'react-native';

export type SBProduct = {
  id: string;
  name: string;
  category: string;
  description?: string;
  eligibility?: string;
  feesNote?: string;
  link: string;
  keywords?: string[];
  updatedAt?: string;
};

export type Suggestion = {
  product: SBProduct;
  reason: string;
  disclaimer: string;
};

const DEFAULT_DISCLAIMER =
  'Informational only — not financial advice. Product details may change. Verify on the official Standard Bank website before acting.';

class StandardBankService {
  private catalog: SBProduct[] = [];
  private lastLoaded: number = 0;
  private loading: Promise<void> | null = null;

  async ensureCatalog(force = false) {
    if (this.catalog.length && !force && Date.now() - this.lastLoaded < 1000 * 60 * 60 * 12) {
      return; // cache for up to 12 hours
    }
    if (this.loading) return this.loading;

    this.loading = this.loadCatalog().finally(() => {
      this.loading = null;
    });
    return this.loading;
  }

  private async loadCatalog() {
    // Try remote URL first (optional)
    const url = process.env.EXPO_PUBLIC_SB_CATALOG_URL;
    if (url) {
      try {
        const resp = await fetch(url, { method: 'GET' });
        if (resp.ok) {
          const data = (await resp.json()) as SBProduct[];
          if (Array.isArray(data)) {
            this.catalog = data;
            this.lastLoaded = Date.now();
            return;
          }
        }
      } catch {
        // ignore and fall back to local
      }
    }

    // Fallback to local bundled JSON
    try {
      const localData = require('../data/standard-bank-products.json');
      this.catalog = (localData as SBProduct[]) || [];
      this.lastLoaded = Date.now();
    } catch {
      this.catalog = [];
      this.lastLoaded = Date.now();
    }
  }

  getCatalog(): SBProduct[] {
    return this.catalog;
  }

  suggestProducts(input: { message: string; context?: any }, limit: number = 3): Suggestion[] {
    const text = `${input.message || ''}`.toLowerCase();
    const ctx = input.context || {};

    // Simple intent heuristics
    const intents: Array<{ match: (t: string) => boolean; categories: string[]; reason: (p: SBProduct) => string }>= [
      {
        match: (t) => /(open|new).*(account)|bank account|debit card|atm/.test(t),
        categories: ['Accounts'],
        reason: (p) => `You mentioned accounts. ${p.name} is a popular option in the ${p.category} category.`
      },
      {
        match: (t) => /(savings?|interest|save|stash|emergency fund)/.test(t),
        categories: ['Savings'],
        reason: (p) => `For saving goals, ${p.name} could fit with flexible access and competitive rates.`
      },
      {
        match: (t) => /(loan|borrow|credit|personal loan)/.test(t),
        categories: ['Loans'],
        reason: (p) => `${p.name} may suit short-to-medium term borrowing needs.`
      },
      {
        match: (t) => /(home|mortgage|bond|property)/.test(t),
        categories: ['Home Loans'],
        reason: (p) => `Considering a home? ${p.name} is a core product in ${p.category}.`
      },
      {
        match: (t) => /(car|vehicle|auto|vaf)/.test(t),
        categories: ['Vehicle & Asset Finance'],
        reason: (p) => `${p.name} is designed for vehicle and asset purchases.`
      },
      {
        match: (t) => /(student|study|uni|university|college)/.test(t),
        categories: ['Student'],
        reason: (p) => `${p.name} targets students and study-related expenses.`
      },
      {
        match: (t) => /(business|merchant|pos|sme|startup)/.test(t),
        categories: ['Business'],
        reason: (p) => `${p.name} supports small business banking and merchant needs.`
      },
      {
        match: (t) => /(international|forex|fx|overseas|travel)/.test(t),
        categories: ['Foreign Exchange'],
        reason: (p) => `${p.name} helps with cross-border spend and foreign currency.`
      },
      {
        match: (t) => /(insurance|cover|funeral|life|car insurance)/.test(t),
        categories: ['Insurance'],
        reason: (p) => `${p.name} provides insurance coverage in the ${p.category} category.`
      },
      {
        match: (t) => /(credit\s*card|card limit|card fees)/.test(t),
        categories: ['Credit Cards'],
        reason: (p) => `${p.name} is a credit card option that might fit your needs.`
      },
    ];

    const matchedCategories = new Set<string>();
    intents.forEach((i) => { if (i.match(text)) i.categories.forEach(c => matchedCategories.add(c)); });

    // If nothing matched, provide zero suggestions
    if (matchedCategories.size === 0) return [];

    const results: Suggestion[] = [];
    const cats = Array.from(matchedCategories);
    for (const cat of cats) {
      const prod = this.catalog.filter(p => p.category === cat);
      for (const p of prod) {
        const intent = intents.find(i => i.categories.includes(cat))!;
        results.push({ product: p, reason: intent.reason(p), disclaimer: DEFAULT_DISCLAIMER });
        if (results.length >= limit) break;
      }
      if (results.length >= limit) break;
    }

    return results;
  }
}

export default new StandardBankService();
