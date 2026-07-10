import { Section, PeriodSections, CashFlowTotals } from '../types';

// Helper to safely add floating point numbers and round to 4 decimal places
export const safeSum = (numbers: number[]): number => {
  const sum = numbers.reduce((acc, curr) => acc + (curr || 0), 0);
  return Math.round((sum + Number.EPSILON) * 10000) / 10000;
};

// Rounds a number to a displayable 2 decimal places
export const roundToDisplay = (num: number): number => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

export const calculateSectionTotal = (section: Section): { budgeted: number; actual: number } => {
  const budgeted = safeSum(section.items.map((item) => item.budgeted));
  const actual = safeSum(section.items.map((item) => item.actual));
  return { budgeted, actual };
};

export const calculateAllTotals = (sections: PeriodSections): CashFlowTotals => {
  const totalA = calculateSectionTotal(sections.A);
  const totalB = calculateSectionTotal(sections.B);
  
  const totalReceipts = {
    budgeted: safeSum([totalA.budgeted, totalB.budgeted]),
    actual: safeSum([totalA.actual, totalB.actual]),
  };

  const totalC = calculateSectionTotal(sections.C);
  const totalD = calculateSectionTotal(sections.D);
  const totalE = calculateSectionTotal(sections.E);

  const totalPayments = {
    budgeted: safeSum([totalC.budgeted, totalD.budgeted, totalE.budgeted]),
    actual: safeSum([totalC.actual, totalD.actual, totalE.actual]),
  };

  const balanceAvailable = {
    budgeted: safeSum([totalReceipts.budgeted, -totalPayments.budgeted]),
    actual: safeSum([totalReceipts.actual, -totalPayments.actual]),
  };

  const totalF = calculateSectionTotal(sections.F);

  const netBalanceAvailable = {
    budgeted: safeSum([balanceAvailable.budgeted, -totalF.budgeted]),
    actual: safeSum([balanceAvailable.actual, -totalF.actual]),
  };

  return {
    totalA,
    totalB,
    totalReceipts,
    totalC,
    totalD,
    totalE,
    totalPayments,
    balanceAvailable,
    totalF,
    netBalanceAvailable,
  };
};
