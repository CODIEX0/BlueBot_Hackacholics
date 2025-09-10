// Simulated bank account + transactions feed to replace direct expenses reliance.
// Provides deterministic pseudo-random generation for demo/testing.
import { BankAccount, Transaction } from '../types/finance';

export interface AccountFeedState {
  accounts: BankAccount[];
  transactions: Transaction[];
  generatedAt: string;
}

export class AccountIntegrationSimulator {
  private static categories = ['Food','Transport','Utilities','Entertainment','Health','Shopping','Savings','Income'];
  private static merchants = ['Pick n Pay','Checkers','Woolworths','Uber','Takealot','Dischem','Clicks','Nedbank','Standard Bank','Spar'];

  static generate(seed: string = 'demo', months: number = 2, avgTxPerDay: number = 3): AccountFeedState {
    const rng = this.prng(seed);
    const now = new Date();
    const start = new Date(now);
    start.setMonth(now.getMonth() - months);

    const accounts: BankAccount[] = [
      { id: 'acc_checking', accountNumber: '1001001234', accountType: 'checking', balance: 0, currency: 'ZAR', bankName: 'Standard Bank', isLinked: true, isPrimary: true },
      { id: 'acc_savings', accountNumber: '3003001234', accountType: 'savings', balance: 0, currency: 'ZAR', bankName: 'Standard Bank', isLinked: true, isPrimary: false }
    ];

    const transactions: Transaction[] = [];

    let day = new Date(start);
    while (day <= now) {
      const txCount = Math.max(1, Math.round(avgTxPerDay + (rng() - 0.5) * 2));
      for (let i = 0; i < txCount; i++) {
        const isIncome = rng() < 0.07; // ~7% of transactions income
        const category = isIncome ? 'Income' : this.pickCategory(rng);
        const amountBase = isIncome ? 1000 + rng()*8000 : 20 + rng()*800; // Income larger amounts
        const amount = parseFloat(amountBase.toFixed(2));
        const id = `tx_${day.toISOString().slice(0,10)}_${i}_${Math.floor(rng()*1e5)}`;
        const description = isIncome ? 'Salary / Deposit' : this.pickMerchant(rng);
        const account = isIncome ? 'acc_checking' : (rng() < 0.2 ? 'acc_savings' : 'acc_checking');

        transactions.push({
          id,
          amount: isIncome ? amount : -amount,
            // use negative for expenses to simplify balance calc; services may adapt expecting positive expense amounts
          description,
          category: category === 'Income' ? 'Income' : category,
          date: `${day.toISOString().slice(0,10)}T${String(Math.floor(rng()*23)).padStart(2,'0')}:00:00.000Z`,
          type: isIncome ? 'income' : 'expense',
          merchant: description,
          recurring: !isIncome && rng() < 0.15, // ~15% flagged recurring
          tags: []
        });
      }
      day.setDate(day.getDate() + 1);
    }

    // Compute balances from transactions
    for (const acc of accounts) {
      acc.balance = transactions
        .filter(t => (acc.id === 'acc_checking' && t.type) || (acc.id === 'acc_savings' && t.category === 'Savings'))
        .reduce((sum, t) => sum + t.amount, 0);
    }

    return { accounts, transactions, generatedAt: new Date().toISOString() };
  }

  static toExpenseLike(transactions: Transaction[]) {
    // Convert negative amounts (expenses) into positive expense-like entries for existing analytics
    return transactions.filter(t => t.type === 'expense').map(t => ({
      amount: Math.abs(t.amount),
      category: t.category,
      date: t.date,
      isRecurring: t.recurring
    }));
  }

  private static pickCategory(rng: () => number) {
    return this.categories[Math.floor(rng()* (this.categories.length-1))]; // exclude 'Income'
  }
  private static pickMerchant(rng: () => number) {
    return this.merchants[Math.floor(rng()* this.merchants.length)];
  }
  private static prng(seed: string) {
    let h = 1779033703 ^ seed.length;
    for (let i=0;i<seed.length;i++) {
      h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
      h = h << 13 | h >>> 19;
    }
    return function() {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      const t = (h ^= h >>> 16) >>> 0;
      return t / 4294967296;
    };
  }
}

export default AccountIntegrationSimulator;
