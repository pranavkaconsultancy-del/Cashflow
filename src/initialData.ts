import { Project, Period, CustomerCollection, VendorPayment, BankTransaction, BudgetVsActualItem } from './types';

// Helper to generate IDs
export const generateId = () => Math.random().toString(36).substring(2, 9);

export const DEFAULT_INFLOW_CATEGORIES = [
  'Booking Amount',
  'Down Payment',
  'Installment Collection',
  'Customer Payments',
  'Bank Loan Disbursement',
  'Investor Funds',
  'Rental Income',
  'Other Income'
];

export const DEFAULT_OUTFLOW_CATEGORIES = [
  'Land Purchase',
  'Construction Cost',
  'Material Purchase',
  'Labour Cost',
  'Contractor Payment',
  'Consultant/Architect Fees',
  'Marketing Expenses',
  'Office Expenses',
  'Salaries',
  'Loan EMI',
  'Interest',
  'Government Fees (RERA, Approval, Stamp Duty)',
  'Utility Bills',
  'Miscellaneous Expenses'
];

export const getDepartmentByCategory = (category: string): string => {
  const constructionCats = ['Construction Cost', 'Material Purchase', 'Labour Cost', 'Contractor Payment'];
  const financeCats = ['Loan EMI', 'Interest', 'Bank Loan Disbursement', 'Investor Funds'];
  const marketingCats = ['Marketing Expenses'];
  const legalCats = ['Government Fees (RERA, Approval, Stamp Duty)'];
  const designCats = ['Consultant/Architect Fees', 'Land Purchase'];
  const hrCats = ['Salaries'];

  if (constructionCats.includes(category)) return 'Construction';
  if (financeCats.includes(category)) return 'Finance';
  if (marketingCats.includes(category)) return 'Marketing';
  if (legalCats.includes(category)) return 'Legal';
  if (designCats.includes(category)) return 'Design';
  if (hrCats.includes(category)) return 'HR & Admin';
  return 'Operations';
};

export const createBlankPeriod = (name: string, prevBankBalance = 1500000, prevCashInHand = 200000): Period => {
  return {
    id: `per-${generateId()}`,
    name,
    bankBalance: prevBankBalance,
    cashInHand: prevCashInHand,
    inflows: DEFAULT_INFLOW_CATEGORIES.map(cat => ({
      category: cat,
      budgeted: 0,
      actual: 0,
      department: getDepartmentByCategory(cat)
    })),
    outflows: DEFAULT_OUTFLOW_CATEGORIES.map(cat => ({
      category: cat,
      budgeted: 0,
      actual: 0,
      department: getDepartmentByCategory(cat)
    }))
  };
};

export const getSeedProjects = (): Project[] => {
  // Project 1: Vanguard Heights Residence (Ongoing)
  const p1Periods: Period[] = [
    {
      id: 'per-p1-jan',
      name: 'Jan 2026',
      bankBalance: 45.0,
      cashInHand: 5.5,
      inflows: [
        { category: 'Booking Amount', budgeted: 15.0, actual: 18.0 },
        { category: 'Down Payment', budgeted: 25.0, actual: 24.5 },
        { category: 'Installment Collection', budgeted: 90.0, actual: 88.0 },
        { category: 'Customer Payments', budgeted: 5.0, actual: 7.2 },
        { category: 'Bank Loan Disbursement', budgeted: 100.0, actual: 100.0 },
        { category: 'Investor Funds', budgeted: 0, actual: 0 },
        { category: 'Rental Income', budgeted: 12.0, actual: 12.0 },
        { category: 'Other Income', budgeted: 2.0, actual: 1.5 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 0, actual: 0 },
        { category: 'Construction Cost', budgeted: 45.0, actual: 49.0 },
        { category: 'Material Purchase', budgeted: 30.0, actual: 32.5 },
        { category: 'Labour Cost', budgeted: 15.0, actual: 14.8 },
        { category: 'Contractor Payment', budgeted: 20.0, actual: 21.0 },
        { category: 'Consultant/Architect Fees', budgeted: 8.0, actual: 8.0 },
        { category: 'Marketing Expenses', budgeted: 12.0, actual: 11.5 },
        { category: 'Office Expenses', budgeted: 3.0, actual: 3.2 },
        { category: 'Salaries', budgeted: 18.0, actual: 18.0 },
        { category: 'Loan EMI', budgeted: 10.0, actual: 10.0 },
        { category: 'Interest', budgeted: 5.0, actual: 5.0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 15.0, actual: 15.5 },
        { category: 'Utility Bills', budgeted: 2.0, actual: 2.1 },
        { category: 'Miscellaneous Expenses', budgeted: 5.0, actual: 4.8 }
      ]
    },
    {
      id: 'per-p1-feb',
      name: 'Feb 2026',
      bankBalance: 101.9,
      cashInHand: 5.8,
      inflows: [
        { category: 'Booking Amount', budgeted: 20.0, actual: 22.0 },
        { category: 'Down Payment', budgeted: 30.0, actual: 28.0 },
        { category: 'Installment Collection', budgeted: 95.0, actual: 102.0 },
        { category: 'Customer Payments', budgeted: 8.0, actual: 6.5 },
        { category: 'Bank Loan Disbursement', budgeted: 0, actual: 0 },
        { category: 'Investor Funds', budgeted: 50.0, actual: 50.0 },
        { category: 'Rental Income', budgeted: 12.0, actual: 12.0 },
        { category: 'Other Income', budgeted: 1.0, actual: 1.2 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 0, actual: 0 },
        { category: 'Construction Cost', budgeted: 50.0, actual: 58.0 }, // Overbudget!
        { category: 'Material Purchase', budgeted: 35.0, actual: 38.0 },
        { category: 'Labour Cost', budgeted: 16.0, actual: 15.5 },
        { category: 'Contractor Payment', budgeted: 25.0, actual: 27.0 },
        { category: 'Consultant/Architect Fees', budgeted: 5.0, actual: 5.0 },
        { category: 'Marketing Expenses', budgeted: 10.0, actual: 10.2 },
        { category: 'Office Expenses', budgeted: 3.0, actual: 2.8 },
        { category: 'Salaries', budgeted: 18.0, actual: 18.0 },
        { category: 'Loan EMI', budgeted: 10.0, actual: 10.0 },
        { category: 'Interest', budgeted: 5.0, actual: 5.0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 2.0, actual: 2.0 },
        { category: 'Utility Bills', budgeted: 2.0, actual: 1.9 },
        { category: 'Miscellaneous Expenses', budgeted: 4.0, actual: 3.8 }
      ]
    },
    {
      id: 'per-p1-mar',
      name: 'Mar 2026',
      bankBalance: 121.3,
      cashInHand: 6.1,
      inflows: [
        { category: 'Booking Amount', budgeted: 25.0, actual: 21.0 },
        { category: 'Down Payment', budgeted: 35.0, actual: 38.0 },
        { category: 'Installment Collection', budgeted: 110.0, actual: 114.0 },
        { category: 'Customer Payments', budgeted: 10.0, actual: 11.2 },
        { category: 'Bank Loan Disbursement', budgeted: 150.0, actual: 150.0 },
        { category: 'Investor Funds', budgeted: 0, actual: 0 },
        { category: 'Rental Income', budgeted: 12.5, actual: 12.5 },
        { category: 'Other Income', budgeted: 2.0, actual: 2.4 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 0, actual: 0 },
        { category: 'Construction Cost', budgeted: 60.0, actual: 64.0 },
        { category: 'Material Purchase', budgeted: 45.0, actual: 48.5 },
        { category: 'Labour Cost', budgeted: 18.0, actual: 19.0 },
        { category: 'Contractor Payment', budgeted: 30.0, actual: 32.0 },
        { category: 'Consultant/Architect Fees', budgeted: 6.0, actual: 6.0 },
        { category: 'Marketing Expenses', budgeted: 15.0, actual: 14.5 },
        { category: 'Office Expenses', budgeted: 3.0, actual: 3.1 },
        { category: 'Salaries', budgeted: 18.0, actual: 18.0 },
        { category: 'Loan EMI', budgeted: 10.0, actual: 10.0 },
        { category: 'Interest', budgeted: 5.0, actual: 5.0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 5.0, actual: 4.8 },
        { category: 'Utility Bills', budgeted: 2.0, actual: 2.2 },
        { category: 'Miscellaneous Expenses', budgeted: 5.0, actual: 5.5 }
      ]
    },
    {
      id: 'per-p1-apr',
      name: 'Apr 2026',
      bankBalance: 247.1,
      cashInHand: 7.3,
      inflows: [
        { category: 'Booking Amount', budgeted: 30.0, actual: 32.0 },
        { category: 'Down Payment', budgeted: 40.0, actual: 42.0 },
        { category: 'Installment Collection', budgeted: 120.0, actual: 125.0 },
        { category: 'Customer Payments', budgeted: 12.0, actual: 11.0 },
        { category: 'Bank Loan Disbursement', budgeted: 0, actual: 0 },
        { category: 'Investor Funds', budgeted: 0, actual: 0 },
        { category: 'Rental Income', budgeted: 13.0, actual: 13.0 },
        { category: 'Other Income', budgeted: 1.5, actual: 1.8 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 0, actual: 0 },
        { category: 'Construction Cost', budgeted: 65.0, actual: 62.0 },
        { category: 'Material Purchase', budgeted: 48.0, actual: 46.0 },
        { category: 'Labour Cost', budgeted: 20.0, actual: 19.5 },
        { category: 'Contractor Payment', budgeted: 35.0, actual: 33.0 },
        { category: 'Consultant/Architect Fees', budgeted: 5.0, actual: 5.0 },
        { category: 'Marketing Expenses', budgeted: 12.0, actual: 11.0 },
        { category: 'Office Expenses', budgeted: 3.5, actual: 3.3 },
        { category: 'Salaries', budgeted: 20.0, actual: 20.0 },
        { category: 'Loan EMI', budgeted: 12.0, actual: 12.0 },
        { category: 'Interest', budgeted: 6.0, actual: 6.0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 3.0, actual: 3.1 },
        { category: 'Utility Bills', budgeted: 2.2, actual: 2.0 },
        { category: 'Miscellaneous Expenses', budgeted: 4.5, actual: 4.0 }
      ]
    },
    {
      id: 'per-p1-may',
      name: 'May 2026',
      bankBalance: 281.3,
      cashInHand: 8.5,
      inflows: [
        { category: 'Booking Amount', budgeted: 35.0, actual: 33.0 },
        { category: 'Down Payment', budgeted: 45.0, actual: 41.0 },
        { category: 'Installment Collection', budgeted: 130.0, actual: 128.0 },
        { category: 'Customer Payments', budgeted: 15.0, actual: 16.5 },
        { category: 'Bank Loan Disbursement', budgeted: 0, actual: 0 },
        { category: 'Investor Funds', budgeted: 0, actual: 0 },
        { category: 'Rental Income', budgeted: 13.0, actual: 13.0 },
        { category: 'Other Income', budgeted: 2.0, actual: 1.7 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 0, actual: 0 },
        { category: 'Construction Cost', budgeted: 70.0, actual: 75.0 },
        { category: 'Material Purchase', budgeted: 50.0, actual: 54.0 },
        { category: 'Labour Cost', budgeted: 22.0, actual: 23.0 },
        { category: 'Contractor Payment', budgeted: 38.0, actual: 41.0 },
        { category: 'Consultant/Architect Fees', budgeted: 5.0, actual: 5.0 },
        { category: 'Marketing Expenses', budgeted: 10.0, actual: 11.5 },
        { category: 'Office Expenses', budgeted: 3.5, actual: 3.8 },
        { category: 'Salaries', budgeted: 20.0, actual: 20.0 },
        { category: 'Loan EMI', budgeted: 12.0, actual: 12.0 },
        { category: 'Interest', budgeted: 6.0, actual: 6.0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 1.0, actual: 1.2 },
        { category: 'Utility Bills', budgeted: 2.2, actual: 2.4 },
        { category: 'Miscellaneous Expenses', budgeted: 4.5, actual: 5.0 }
      ]
    },
    {
      id: 'per-p1-jun',
      name: 'Jun 2026',
      bankBalance: 279.1,
      cashInHand: 9.0,
      inflows: [
        { category: 'Booking Amount', budgeted: 38.0, actual: 41.0 },
        { category: 'Down Payment', budgeted: 48.0, actual: 45.0 },
        { category: 'Installment Collection', budgeted: 140.0, actual: 143.0 },
        { category: 'Customer Payments', budgeted: 18.0, actual: 19.0 },
        { category: 'Bank Loan Disbursement', budgeted: 100.0, actual: 100.0 },
        { category: 'Investor Funds', budgeted: 0, actual: 0 },
        { category: 'Rental Income', budgeted: 13.5, actual: 13.5 },
        { category: 'Other Income', budgeted: 2.5, actual: 2.8 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 0, actual: 0 },
        { category: 'Construction Cost', budgeted: 75.0, actual: 82.0 }, // Over budget!
        { category: 'Material Purchase', budgeted: 55.0, actual: 60.5 },
        { category: 'Labour Cost', budgeted: 24.0, actual: 25.0 },
        { category: 'Contractor Payment', budgeted: 42.0, actual: 45.0 },
        { category: 'Consultant/Architect Fees', budgeted: 6.0, actual: 6.0 },
        { category: 'Marketing Expenses', budgeted: 15.0, actual: 16.5 },
        { category: 'Office Expenses', budgeted: 4.0, actual: 4.2 },
        { category: 'Salaries', budgeted: 22.0, actual: 22.0 },
        { category: 'Loan EMI', budgeted: 12.0, actual: 12.0 },
        { category: 'Interest', budgeted: 6.0, actual: 6.0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 4.0, actual: 4.5 },
        { category: 'Utility Bills', budgeted: 2.5, actual: 2.7 },
        { category: 'Miscellaneous Expenses', budgeted: 5.0, actual: 5.6 }
      ]
    }
  ];

  const p1Collections: CustomerCollection[] = [
    { id: 'coll-1', customerName: 'Rajesh Kumar', amount: 45.0, collectedAmount: 45.0, dueDate: '2026-05-10', status: 'Paid' },
    { id: 'coll-2', customerName: 'Mehta Developers Pvt Ltd', amount: 120.0, collectedAmount: 60.0, dueDate: '2026-06-20', status: 'Overdue' },
    { id: 'coll-3', customerName: 'Ananya Sharma', amount: 35.0, collectedAmount: 0, dueDate: '2026-06-15', status: 'Overdue' },
    { id: 'coll-4', customerName: 'Sanjay Dutt Residences', amount: 80.0, collectedAmount: 80.0, dueDate: '2026-07-02', status: 'Paid' },
    { id: 'coll-5', customerName: 'Goel Traders LLC', amount: 55.0, collectedAmount: 0, dueDate: '2026-08-15', status: 'Pending' }
  ];

  const p1Payments: VendorPayment[] = [
    { id: 'pay-1', vendorName: 'Tata Steel Corp', amount: 65.0, paidAmount: 65.0, dueDate: '2026-05-12', status: 'Paid' },
    { id: 'pay-2', vendorName: 'Ultratech Cement Ltd', amount: 42.0, paidAmount: 12.0, dueDate: '2026-06-18', status: 'Overdue' },
    { id: 'pay-3', vendorName: 'Ace Elevators India', amount: 28.0, paidAmount: 0, dueDate: '2026-07-01', status: 'Overdue' },
    { id: 'pay-4', vendorName: 'Architect Hafeez Contractor', amount: 15.0, paidAmount: 15.0, dueDate: '2026-07-10', status: 'Paid' },
    { id: 'pay-5', vendorName: 'Nircon Electric Corp', amount: 22.0, paidAmount: 0, dueDate: '2026-08-05', status: 'Pending' }
  ];

  const p1Transactions: BankTransaction[] = [
    { id: 'tx-1', date: '2026-07-01', description: 'Lease Rent collected from Tenant A', type: 'Deposit', amount: 13.5 },
    { id: 'tx-2', date: '2026-07-03', description: 'Advance Paid to Steel supplier', type: 'Withdrawal', amount: 25.0 },
    { id: 'tx-3', date: '2026-07-06', description: 'Fund Transfer to Office Petty Cash', type: 'Transfer', amount: 2.0 },
    { id: 'tx-4', date: '2026-07-09', description: 'Down Payment from Plot #12', type: 'Deposit', amount: 45.0 }
  ];

  const p1Budget: BudgetVsActualItem[] = [
    { category: 'Land Purchase', budgeted: 0, actual: 0 },
    { category: 'Construction Cost', budgeted: 340.0, actual: 357.0 }, // Over budget!
    { category: 'Material Purchase', budgeted: 243.0, actual: 268.0 }, // Over budget!
    { category: 'Labour Cost', budgeted: 115.0, actual: 116.6 },
    { category: 'Contractor Payment', budgeted: 175.0, actual: 184.2 },
    { category: 'Consultant/Architect Fees', budgeted: 35.0, actual: 35.0 },
    { category: 'Marketing Expenses', budgeted: 74.0, actual: 75.7 },
    { category: 'Office Expenses', budgeted: 20.0, actual: 20.9 },
    { category: 'Salaries', budgeted: 114.0, actual: 114.0 },
    { category: 'Loan EMI', budgeted: 66.0, actual: 66.0 },
    { category: 'Interest', budgeted: 33.0, actual: 33.0 },
    { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 29.0, actual: 31.1 },
    { category: 'Utility Bills', budgeted: 12.9, actual: 13.3 },
    { category: 'Miscellaneous Expenses', budgeted: 28.5, actual: 29.3 }
  ];

  // Project 2: Aurelia Commercial Plaza (Ongoing)
  const p2Periods: Period[] = [
    {
      id: 'per-p2-jan',
      name: 'Jan 2026',
      bankBalance: 20.0,
      cashInHand: 1.2,
      inflows: [
        { category: 'Booking Amount', budgeted: 10.0, actual: 12.0 },
        { category: 'Down Payment', budgeted: 15.0, actual: 15.0 },
        { category: 'Installment Collection', budgeted: 40.0, actual: 43.0 },
        { category: 'Customer Payments', budgeted: 0, actual: 0 },
        { category: 'Bank Loan Disbursement', budgeted: 0, actual: 0 },
        { category: 'Investor Funds', budgeted: 100.0, actual: 100.0 },
        { category: 'Rental Income', budgeted: 35.0, actual: 35.0 },
        { category: 'Other Income', budgeted: 1.0, actual: 1.5 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 0, actual: 0 },
        { category: 'Construction Cost', budgeted: 25.0, actual: 24.0 },
        { category: 'Material Purchase', budgeted: 20.0, actual: 19.5 },
        { category: 'Labour Cost', budgeted: 10.0, actual: 10.2 },
        { category: 'Contractor Payment', budgeted: 15.0, actual: 15.0 },
        { category: 'Consultant/Architect Fees', budgeted: 4.0, actual: 4.2 },
        { category: 'Marketing Expenses', budgeted: 8.0, actual: 8.0 },
        { category: 'Office Expenses', budgeted: 2.0, actual: 1.8 },
        { category: 'Salaries', budgeted: 12.0, actual: 12.0 },
        { category: 'Loan EMI', budgeted: 8.0, actual: 8.0 },
        { category: 'Interest', budgeted: 4.0, actual: 4.0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 10.0, actual: 9.5 },
        { category: 'Utility Bills', budgeted: 1.5, actual: 1.6 },
        { category: 'Miscellaneous Expenses', budgeted: 3.0, actual: 2.8 }
      ]
    },
    {
      id: 'per-p2-feb',
      name: 'Feb 2026',
      bankBalance: 107.0,
      cashInHand: 2.1,
      inflows: [
        { category: 'Booking Amount', budgeted: 12.0, actual: 10.0 },
        { category: 'Down Payment', budgeted: 18.0, actual: 16.5 },
        { category: 'Installment Collection', budgeted: 45.0, actual: 42.0 },
        { category: 'Customer Payments', budgeted: 2.0, actual: 1.5 },
        { category: 'Bank Loan Disbursement', budgeted: 50.0, actual: 50.0 },
        { category: 'Investor Funds', budgeted: 0, actual: 0 },
        { category: 'Rental Income', budgeted: 35.0, actual: 35.0 },
        { category: 'Other Income', budgeted: 1.0, actual: 0.8 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 0, actual: 0 },
        { category: 'Construction Cost', budgeted: 30.0, actual: 28.5 },
        { category: 'Material Purchase', budgeted: 25.0, actual: 26.0 },
        { category: 'Labour Cost', budgeted: 12.0, actual: 11.5 },
        { category: 'Contractor Payment', budgeted: 18.0, actual: 18.2 },
        { category: 'Consultant/Architect Fees', budgeted: 3.0, actual: 3.0 },
        { category: 'Marketing Expenses', budgeted: 6.0, actual: 5.8 },
        { category: 'Office Expenses', budgeted: 2.0, actual: 2.1 },
        { category: 'Salaries', budgeted: 12.0, actual: 12.0 },
        { category: 'Loan EMI', budgeted: 8.0, actual: 8.0 },
        { category: 'Interest', budgeted: 4.0, actual: 4.0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 1.0, actual: 1.1 },
        { category: 'Utility Bills', budgeted: 1.5, actual: 1.4 },
        { category: 'Miscellaneous Expenses', budgeted: 3.0, actual: 2.9 }
      ]
    }
  ];

  const p2Collections: CustomerCollection[] = [
    { id: 'coll-p2-1', customerName: 'Reliance Retail Ltd', amount: 85.0, collectedAmount: 85.0, dueDate: '2026-05-15', status: 'Paid' },
    { id: 'coll-p2-2', customerName: 'ICICI Bank Zonal Office', amount: 150.0, collectedAmount: 150.0, dueDate: '2026-06-10', status: 'Paid' },
    { id: 'coll-p2-3', customerName: 'Aditya Birla Group', amount: 95.0, collectedAmount: 0, dueDate: '2026-07-01', status: 'Overdue' }
  ];

  const p2Payments: VendorPayment[] = [
    { id: 'pay-p2-1', vendorName: 'Jindal Steel & Power', amount: 50.0, paidAmount: 40.0, dueDate: '2026-06-22', status: 'Overdue' },
    { id: 'pay-p2-2', vendorName: 'Otis Elevators India', amount: 45.0, paidAmount: 45.0, dueDate: '2026-07-05', status: 'Paid' }
  ];

  const p2Transactions: BankTransaction[] = [
    { id: 'tx-p2-1', date: '2026-07-02', description: 'Quarterly Maintenance Collection', type: 'Deposit', amount: 22.5 },
    { id: 'tx-p2-2', date: '2026-07-05', description: 'Paid approval fee to Municipal Corp', type: 'Withdrawal', amount: 8.0 }
  ];

  const p2Budget: BudgetVsActualItem[] = [
    { category: 'Land Purchase', budgeted: 0, actual: 0 },
    { category: 'Construction Cost', budgeted: 55.0, actual: 52.5 },
    { category: 'Material Purchase', budgeted: 45.0, actual: 45.5 },
    { category: 'Labour Cost', budgeted: 22.0, actual: 21.7 },
    { category: 'Contractor Payment', budgeted: 33.0, actual: 33.2 }
  ];

  // Project 3: Zephyr Luxury Villas (Planning)
  const p3Periods: Period[] = [
    {
      id: 'per-p3-jan',
      name: 'Jan 2026',
      bankBalance: 120.0,
      cashInHand: 0.5,
      inflows: [
        { category: 'Booking Amount', budgeted: 15.0, actual: 0 },
        { category: 'Down Payment', budgeted: 0, actual: 0 },
        { category: 'Installment Collection', budgeted: 0, actual: 0 },
        { category: 'Customer Payments', budgeted: 0, actual: 0 },
        { category: 'Bank Loan Disbursement', budgeted: 0, actual: 0 },
        { category: 'Investor Funds', budgeted: 200.0, actual: 200.0 },
        { category: 'Rental Income', budgeted: 0, actual: 0 },
        { category: 'Other Income', budgeted: 0, actual: 0 }
      ],
      outflows: [
        { category: 'Land Purchase', budgeted: 100.0, actual: 98.0 },
        { category: 'Construction Cost', budgeted: 0, actual: 0 },
        { category: 'Material Purchase', budgeted: 0, actual: 0 },
        { category: 'Labour Cost', budgeted: 0, actual: 0 },
        { category: 'Contractor Payment', budgeted: 0, actual: 0 },
        { category: 'Consultant/Architect Fees', budgeted: 15.0, actual: 15.0 },
        { category: 'Marketing Expenses', budgeted: 5.0, actual: 4.8 },
        { category: 'Office Expenses', budgeted: 1.5, actual: 1.4 },
        { category: 'Salaries', budgeted: 5.0, actual: 5.0 },
        { category: 'Loan EMI', budgeted: 0, actual: 0 },
        { category: 'Interest', budgeted: 0, actual: 0 },
        { category: 'Government Fees (RERA, Approval, Stamp Duty)', budgeted: 10.0, actual: 10.5 },
        { category: 'Utility Bills', budgeted: 0.5, actual: 0.4 },
        { category: 'Miscellaneous Expenses', budgeted: 2.0, actual: 1.8 }
      ]
    }
  ];

  const p3Collections: CustomerCollection[] = [];
  const p3Payments: VendorPayment[] = [];
  const p3Transactions: BankTransaction[] = [];
  const p3Budget: BudgetVsActualItem[] = [
    { category: 'Land Purchase', budgeted: 100.0, actual: 98.0 },
    { category: 'Consultant/Architect Fees', budgeted: 15.0, actual: 15.0 }
  ];

  const rawProjects: Project[] = [
    {
      id: 'proj-1',
      name: 'Vanguard Heights Residence',
      company: 'SyncAI Consultancy Pvt. Ltd.',
      status: 'Ongoing',
      financialYear: 'FY 2026-27',
      periods: p1Periods,
      collections: p1Collections,
      payments: p1Payments,
      transactions: p1Transactions,
      budgetVsActual: p1Budget
    },
    {
      id: 'proj-2',
      name: 'Aurelia Commercial Plaza',
      company: 'Aurelia Group',
      status: 'Ongoing',
      financialYear: 'FY 2026-27',
      periods: p2Periods,
      collections: p2Collections,
      payments: p2Payments,
      transactions: p2Transactions,
      budgetVsActual: p2Budget
    },
    {
      id: 'proj-3',
      name: 'Zephyr Luxury Villas',
      company: 'Zephyr Estates',
      status: 'Planning',
      financialYear: 'FY 2026-27',
      periods: p3Periods,
      collections: p3Collections,
      payments: p3Payments,
      transactions: p3Transactions,
      budgetVsActual: p3Budget
    }
  ];

  return rawProjects.map(proj => ({
    ...proj,
    periods: proj.periods.map(per => ({
      ...per,
      bankBalance: per.bankBalance * 100000,
      cashInHand: per.cashInHand * 100000,
      inflows: per.inflows.map(inf => ({
        ...inf,
        budgeted: inf.budgeted * 100000,
        actual: inf.actual * 100000,
        department: getDepartmentByCategory(inf.category)
      })),
      outflows: per.outflows.map(out => ({
        ...out,
        budgeted: out.budgeted * 100000,
        actual: out.actual * 100000,
        department: getDepartmentByCategory(out.category)
      }))
    })),
    collections: proj.collections.map(col => ({
      ...col,
      amount: col.amount * 100000,
      collectedAmount: col.collectedAmount * 100000
    })),
    payments: proj.payments.map(pay => {
      let deptCat = 'Construction Cost';
      if (pay.vendorName.toLowerCase().includes('steel') || pay.vendorName.toLowerCase().includes('cement')) {
        deptCat = 'Material Purchase';
      } else if (pay.vendorName.toLowerCase().includes('architect') || pay.vendorName.toLowerCase().includes('consultant')) {
        deptCat = 'Consultant/Architect Fees';
      } else if (pay.vendorName.toLowerCase().includes('elevator')) {
        deptCat = 'Construction Cost';
      }
      return {
        ...pay,
        amount: pay.amount * 100000,
        paidAmount: pay.paidAmount * 100000,
        department: getDepartmentByCategory(deptCat)
      };
    }),
    transactions: proj.transactions.map(tx => ({
      ...tx,
      amount: tx.amount * 100000
    })),
    budgetVsActual: proj.budgetVsActual.map(b => ({
      ...b,
      budgeted: b.budgeted * 100000,
      actual: b.actual * 100000
    }))
  }));
};
