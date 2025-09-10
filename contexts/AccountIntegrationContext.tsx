import React from 'react';
import AccountIntegrationSimulator, { AccountFeedState } from '../services/AccountIntegrationSimulator';
import { BankAccount, Transaction } from '../types/finance';
import { ExpenseLike } from '../services/WellbeingScoreService';
import { ExpenseInput } from '../services/BudgetRecommendationService';

export interface AccountIntegrationContextType {
  accounts: BankAccount[];
  transactions: Transaction[];
  expenseLike: ExpenseLike[];
  expenseInputs: ExpenseInput[];
  regenerate: (seed?: string) => void;
  lastGenerated: string | null;
}

const AccountIntegrationContext = React.createContext<AccountIntegrationContextType | undefined>(undefined);

export const AccountIntegrationProvider: React.FC<{ children: React.ReactNode; seed?: string; }> = ({ children, seed }) => {
  const [feed, setFeed] = React.useState<AccountFeedState | null>(null);

  const generate = (s?: string) => {
    const state = AccountIntegrationSimulator.generate(s || seed || 'demo');
    setFeed(state);
  };

  React.useEffect(() => { generate(seed); }, [seed]);

  const expenseLike = React.useMemo<ExpenseLike[]>(() => feed ? AccountIntegrationSimulator.toExpenseLike(feed.transactions) : [], [feed]);
  const expenseInputs = React.useMemo<ExpenseInput[]>(() => expenseLike.map(e => ({ amount: e.amount, category: e.category, date: e.date })), [expenseLike]);

  return (
    <AccountIntegrationContext.Provider value={{
      accounts: feed?.accounts || [],
      transactions: feed?.transactions || [],
      expenseLike,
      expenseInputs,
      regenerate: generate,
      lastGenerated: feed?.generatedAt || null
    }}>
      {children}
    </AccountIntegrationContext.Provider>
  );
};

export const useAccountsIntegration = () => {
  const ctx = React.useContext(AccountIntegrationContext);
  if (!ctx) throw new Error('useAccountsIntegration must be used within AccountIntegrationProvider');
  return ctx;
};
