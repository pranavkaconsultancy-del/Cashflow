/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LineItem {
  id: string;
  name: string;
  budgeted: number; // in Rs. Lakhs (Budgeted/Approved)
  actual: number;   // in Rs. Lakhs (Actual/Taken)
}

export interface Section {
  id: string;
  title: string;
  letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  items: LineItem[];
}

export interface PeriodSections {
  A: Section;
  B: Section;
  C: Section;
  D: Section;
  E: Section;
  F: Section;
}

export interface Period {
  id: string;
  name: string; // e.g., "Apr-Jun 2026"
  sections: PeriodSections;
}

export interface CashFlowTotals {
  totalA: { budgeted: number; actual: number };
  totalB: { budgeted: number; actual: number };
  totalReceipts: { budgeted: number; actual: number };
  totalC: { budgeted: number; actual: number };
  totalD: { budgeted: number; actual: number };
  totalE: { budgeted: number; actual: number };
  totalPayments: { budgeted: number; actual: number };
  balanceAvailable: { budgeted: number; actual: number };
  totalF: { budgeted: number; actual: number };
  netBalanceAvailable: { budgeted: number; actual: number };
}
