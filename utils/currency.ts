/**
 * Currency formatting utilities for South African Rand
 */

export const formatCurrency = (
  amount: number,
  options: {
    showSymbol?: boolean;
    showCents?: boolean;
    compact?: boolean;
  } = {}
): string => {
  const {
    showSymbol = true,
    showCents = true,
    compact = false,
  } = options;

  if (compact && Math.abs(amount) >= 1000) {
    return formatCompactCurrency(amount, showSymbol);
  }

  const formatted = Math.abs(amount).toLocaleString('en-ZA', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });

  const symbol = showSymbol ? 'R' : '';
  const sign = amount < 0 ? '-' : '';

  return `${sign}${symbol}${formatted}`;
};

const formatCompactCurrency = (amount: number, showSymbol: boolean): string => {
  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const symbol = showSymbol ? 'R' : '';

  if (absAmount >= 1000000) {
    return `${sign}${symbol}${(absAmount / 1000000).toFixed(1)}M`;
  } else if (absAmount >= 1000) {
    return `${sign}${symbol}${(absAmount / 1000).toFixed(1)}K`;
  }

  return formatCurrency(amount, { showSymbol, showCents: true });
};

export const parseCurrency = (value: string): number => {
  // Remove currency symbol, spaces, and commas
  const cleaned = value.replace(/[R\s,]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatPercentage = (
  value: number,
  options: {
    decimals?: number;
    showSign?: boolean;
  } = {}
): string => {
  const { decimals = 1, showSign = false } = options;
  const sign = showSign && value > 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
};

export const calculatePercentageChange = (
  current: number,
  previous: number
): number => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

export const formatCurrencyRange = (
  min: number,
  max: number,
  options: {
    showSymbol?: boolean;
    compact?: boolean;
  } = {}
): string => {
  const minFormatted = formatCurrency(min, options);
  const maxFormatted = formatCurrency(max, { ...options, showSymbol: false });
  return `${minFormatted} - ${maxFormatted}`;
};

export const isValidCurrencyAmount = (amount: number): boolean => {
  return !isNaN(amount) && isFinite(amount) && amount >= 0;
};

export const roundToNearestCent = (amount: number): number => {
  return Math.round(amount * 100) / 100;
};

export const formatBudgetStatus = (spent: number, budget: number): {
  percentage: number;
  status: 'good' | 'warning' | 'over';
  message: string;
} => {
  const percentage = (spent / budget) * 100;
  
  if (percentage >= 100) {
    return {
      percentage,
      status: 'over',
      message: `Over budget by ${formatCurrency(spent - budget)}`,
    };
  } else if (percentage >= 80) {
    return {
      percentage,
      status: 'warning',
      message: `${formatCurrency(budget - spent)} remaining`,
    };
  } else {
    return {
      percentage,
      status: 'good',
      message: `${formatCurrency(budget - spent)} remaining`,
    };
  }
};