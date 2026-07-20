/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CustomerCollection {
  id: string;
  customerName: string;
  amount: number; // Receivable in Rupees (literal)
  collectedAmount: number; // Collected in Rupees (literal)
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}

export interface VendorPayment {
  id: string;
  vendorName: string;
  amount: number; // Payable in Rupees (literal)
  paidAmount: number; // Paid in Rupees (literal)
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  department?: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  type: 'Deposit' | 'Withdrawal' | 'Transfer';
  amount: number; // in Rupees (literal)
}

export interface BudgetVsActualItem {
  category: string;
  budgeted: number; // Planned budget in Rupees (literal)
  actual: number;   // Actual expense in Rupees (literal)
}

export interface PeriodInflow {
  category: string;
  budgeted: number;
  actual: number;
  department?: string;
}

export interface PeriodOutflow {
  category: string;
  budgeted: number;
  actual: number;
  department?: string;
}

export interface Period {
  id: string;
  name: string; // e.g., "Jan 2026", "Feb 2026"
  bankBalance: number; // Opening Bank Balance
  cashInHand: number;  // Opening Cash in Hand
  inflows: PeriodInflow[];
  outflows: PeriodOutflow[];
}

export interface Project {
  id: string;
  name: string;
  company: string; // e.g., "Vanguard Developers", "Aurelia Group"
  status: 'Planning' | 'Ongoing' | 'Completed' | 'On Hold';
  financialYear: string; // e.g., "FY 2026-27"
  periods: Period[];
  collections: CustomerCollection[];
  payments: VendorPayment[];
  transactions: BankTransaction[];
  budgetVsActual: BudgetVsActualItem[];
}
