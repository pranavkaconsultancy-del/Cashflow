import { Period } from '../types';

// Safe sum for floating point precision
export const safeSum = (numbers: number[]): number => {
  const sum = numbers.reduce((acc, curr) => acc + (curr || 0), 0);
  return Math.round((sum + Number.EPSILON) * 100) / 100;
};

export interface PeriodTotals {
  openingBalance: number;
  totalInflow: number;
  totalOutflow: number;
  netCashFlow: number;
  closingBalance: number;
}

export const calculatePeriodTotals = (period: Period): PeriodTotals => {
  const openingBalance = safeSum([period.bankBalance, period.cashInHand]);
  const totalInflow = safeSum(period.inflows.map(i => i.actual));
  const totalOutflow = safeSum(period.outflows.map(o => o.actual));
  const netCashFlow = Math.round((totalInflow - totalOutflow) * 100) / 100;
  const closingBalance = Math.round((openingBalance + netCashFlow) * 100) / 100;

  return {
    openingBalance,
    totalInflow,
    totalOutflow,
    netCashFlow,
    closingBalance
  };
};

export const calculatePeriodBudgetTotals = (period: Period) => {
  const openingBalance = safeSum([period.bankBalance, period.cashInHand]);
  const totalInflow = safeSum(period.inflows.map(i => i.budgeted));
  const totalOutflow = safeSum(period.outflows.map(o => o.budgeted));
  const netCashFlow = Math.round((totalInflow - totalOutflow) * 100) / 100;
  const closingBalance = Math.round((openingBalance + netCashFlow) * 100) / 100;

  return {
    openingBalance,
    totalInflow,
    totalOutflow,
    netCashFlow,
    closingBalance
  };
};

export const formatCurrency = (val: number | string): string => {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num) || num === null || num === undefined) return '₹0';
  
  const hasFraction = num % 1 !== 0;
  const formatter = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  });
  
  return `₹${formatter.format(num)}`;
};
