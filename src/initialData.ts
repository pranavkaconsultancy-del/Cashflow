import { Period, PeriodSections, LineItem } from './types';

// Helper to generate IDs
const generateId = () => Math.random().toString(36).substring(2, 9);

export const createDefaultPeriodSections = (emptyValues = false): PeriodSections => {
  return {
    A: {
      id: 'sec-A',
      letter: 'A',
      title: 'Brought Forward Balances (Opening Cash)',
      items: [
        { id: generateId(), name: 'Opening Bank Balance', budgeted: emptyValues ? 0 : 15.5, actual: emptyValues ? 0 : 15.5 },
        { id: generateId(), name: 'Promoter Group Funding Support', budgeted: emptyValues ? 0 : 25.0, actual: emptyValues ? 0 : 25.0 },
        { id: generateId(), name: 'Associate Company ICD Balance', budgeted: emptyValues ? 0 : 10.0, actual: emptyValues ? 0 : 8.0 }
      ]
    },
    B: {
      id: 'sec-B',
      letter: 'B',
      title: 'Money Coming In (Inflows)',
      items: [
        { id: generateId(), name: 'Booking Amount Received', budgeted: emptyValues ? 0 : 15.0, actual: emptyValues ? 0 : 18.0 },
        { id: generateId(), name: 'Sale Agreement / Registration Amount', budgeted: emptyValues ? 0 : 25.0, actual: emptyValues ? 0 : 24.5 },
        { id: generateId(), name: 'Installment from Buyers', budgeted: emptyValues ? 0 : 90.0, actual: emptyValues ? 0 : 88.0 },
        { id: generateId(), name: 'Rental Income', budgeted: emptyValues ? 0 : 45.0, actual: emptyValues ? 0 : 45.0 },
        { id: generateId(), name: 'Maintenance Charges Collected (from tenants/owners)', budgeted: emptyValues ? 0 : 12.0, actual: emptyValues ? 0 : 11.5 },
        { id: generateId(), name: 'Parking Charges Collected', budgeted: emptyValues ? 0 : 5.0, actual: emptyValues ? 0 : 4.8 },
        { id: generateId(), name: 'Society Transfer/NOC Charges Collected', budgeted: emptyValues ? 0 : 2.0, actual: emptyValues ? 0 : 2.2 },
        { id: generateId(), name: 'Loan/Funding Received', budgeted: emptyValues ? 0 : 10.0, actual: emptyValues ? 0 : 10.0 },
        { id: generateId(), name: 'Interest Income', budgeted: emptyValues ? 0 : 1.5, actual: emptyValues ? 0 : 1.5 },
        { id: generateId(), name: 'Other Income', budgeted: emptyValues ? 0 : 5.0, actual: emptyValues ? 0 : 3.0 }
      ]
    },
    C: {
      id: 'sec-C',
      letter: 'C',
      title: 'Financing & Loan Obligations (Outflows)',
      items: [
        { id: generateId(), name: 'Loan EMI / Interest Paid', budgeted: emptyValues ? 0 : 160.0, actual: emptyValues ? 0 : 160.0 }
      ]
    },
    D: {
      id: 'sec-D',
      letter: 'D',
      title: 'Direct Project & Construction Outflows (Outflows)',
      items: [
        { id: generateId(), name: 'Land / Property Purchase Cost', budgeted: emptyValues ? 0 : 0.0, actual: emptyValues ? 0 : 0.0 },
        { id: generateId(), name: 'Construction Cost', budgeted: emptyValues ? 0 : 45.0, actual: emptyValues ? 0 : 47.0 },
        { id: generateId(), name: 'Contractor Payments', budgeted: emptyValues ? 0 : 20.0, actual: emptyValues ? 0 : 21.2 }
      ]
    },
    E: {
      id: 'sec-E',
      letter: 'E',
      title: 'Professional, Sales & Administrative Outflows (Outflows)',
      items: [
        { id: generateId(), name: 'Architect & Consultant Fees', budgeted: emptyValues ? 0 : 4.5, actual: emptyValues ? 0 : 4.0 },
        { id: generateId(), name: 'Brokerage / Commission Paid', budgeted: emptyValues ? 0 : 3.0, actual: emptyValues ? 0 : 3.5 },
        { id: generateId(), name: 'Legal & Registration Charges', budgeted: emptyValues ? 0 : 2.0, actual: emptyValues ? 0 : 1.8 },
        { id: generateId(), name: 'Property Tax', budgeted: emptyValues ? 0 : 2.2, actual: emptyValues ? 0 : 2.2 },
        { id: generateId(), name: 'Society Maintenance Expenses', budgeted: emptyValues ? 0 : 1.5, actual: emptyValues ? 0 : 1.5 },
        { id: generateId(), name: 'Marketing & Advertising Expenses', budgeted: emptyValues ? 0 : 5.0, actual: emptyValues ? 0 : 4.8 },
        { id: generateId(), name: 'Staff Salaries', budgeted: emptyValues ? 0 : 10.0, actual: emptyValues ? 0 : 10.0 },
        { id: generateId(), name: 'Utility Bills (electricity, water, etc.)', budgeted: emptyValues ? 0 : 1.8, actual: emptyValues ? 0 : 2.0 }
      ]
    },
    F: {
      id: 'sec-F',
      letter: 'F',
      title: 'Extraordinary & Capital Outlays (Outflows)',
      items: [
        { id: generateId(), name: 'Miscellaneous Expenses', budgeted: emptyValues ? 0 : 15.0, actual: emptyValues ? 0 : 12.5 }
      ]
    }
  };
};

export const getSeedPeriods = (): Period[] => {
  return [
    {
      id: 'period-1',
      name: 'Apr-Jun 2026',
      sections: createDefaultPeriodSections(false)
    },
    {
      id: 'period-2',
      name: 'Jul-Sep 2026',
      sections: createDefaultPeriodSections(true) // Start with empty values but the structure preloaded
    }
  ];
};

export const createEmptyPeriod = (id: string, name: string): Period => {
  return {
    id,
    name,
    sections: createDefaultPeriodSections(true)
  };
};

export const copyPeriodStructure = (newId: string, newName: string, sourceSections: PeriodSections): Period => {
  const deepCopySections: PeriodSections = JSON.parse(JSON.stringify(sourceSections));
  
  // Set all values to 0 for a clean budget slate, while keeping the structural rows intact
  Object.keys(deepCopySections).forEach((key) => {
    const secKey = key as keyof PeriodSections;
    deepCopySections[secKey].items.forEach((item: LineItem) => {
      item.budgeted = 0;
      item.actual = 0;
    });
  });

  return {
    id: newId,
    name: newName,
    sections: deepCopySections
  };
};
