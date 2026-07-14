/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CustomerCollection {
  id: string;
  customerName: string;
  amount: number; // Receivable in Rs. Lakhs
  collectedAmount: number; // Collected in Rs. Lakhs
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
}

export interface VendorPayment {
  id: string;
  vendorName: string;
  amount: number; // Payable in Rs. Lakhs
  paidAmount: number; // Paid in Rs. Lakhs
  dueDate: string;
  status: 'Paid' | 'Pending' | 'Overdue';
  department?: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  type: 'Deposit' | 'Withdrawal' | 'Transfer';
  amount: number; // in Rs. Lakhs
}

export interface BudgetVsActualItem {
  category: string;
  budgeted: number; // Planned budget in Rs. Lakhs
  actual: number;   // Actual expense in Rs. Lakhs
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
