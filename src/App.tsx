/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Period, PeriodSections, LineItem, CashFlowTotals } from './types';
import { getSeedPeriods, createEmptyPeriod, copyPeriodStructure, createDefaultPeriodSections } from './initialData';
import { calculateAllTotals } from './utils/calculations';
import SummaryStrip from './components/SummaryStrip';
import PeriodSelector from './components/PeriodSelector';
import LineItemTable from './components/LineItemTable';
import IntermediateTotal from './components/IntermediateTotal';
import Sidebar from './components/Sidebar';
import DashboardView from './components/DashboardView';
import RatiosView from './components/RatiosView';
import PredictionsView from './components/PredictionsView';
import ReportsView from './components/ReportsView';
import {
  FileDown,
  FileUp,
  RefreshCw,
  Search,
  Building2,
  HelpCircle,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  X,
  Plus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import * as XLSX from 'xlsx';

const STORAGE_KEY = 'real_estate_cash_flow_periods_v1';
const SELECTED_PERIOD_KEY = 'real_estate_cash_flow_selected_period_v1';

export default function App() {
  // 1. Core State
  const [currentTab, setCurrentTab] = useState('dashboard');

  // Excel Row Preview Type & States
  interface ExcelRowPreview {
    month: string;
    year: string;
    category: string;
    type: 'Inflow' | 'Outflow';
    amount: number;
    notes: string;
    isValid: boolean;
    mappedSection: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  }
  const [previewRows, setPreviewRows] = useState<ExcelRowPreview[]>([]);
  const [importStats, setImportStats] = useState<{ skipped: number; parsed: number } | null>(null);

  // Helper to find key case-insensitively
  const findVal = (row: any, keys: string[]) => {
    for (const k of Object.keys(row)) {
      if (keys.includes(k.toLowerCase().trim())) {
        return row[k];
      }
    }
    return undefined;
  };

  const mapCategoryToSection = (category: string, isOutflow: boolean): 'A' | 'B' | 'C' | 'D' | 'E' | 'F' => {
    const catLower = category.toLowerCase();
    if (!isOutflow) {
      if (
        catLower.includes('opening') ||
        catLower.includes('brought forward') ||
        catLower.includes('promoter') ||
        catLower.includes('funding support') ||
        catLower.includes('icd balance') ||
        catLower.includes('b/fd')
      ) {
        return 'A';
      }
      return 'B';
    } else {
      if (
        catLower.includes('emi') ||
        catLower.includes('loan emi') ||
        catLower.includes('interest paid') ||
        catLower.includes('installment paid') ||
        catLower.includes('repayment')
      ) {
        return 'C';
      }
      if (
        catLower.includes('land') ||
        catLower.includes('construction') ||
        catLower.includes('contractor') ||
        catLower.includes('material') ||
        catLower.includes('builder')
      ) {
        return 'D';
      }
      if (
        catLower.includes('architect') ||
        catLower.includes('consultant') ||
        catLower.includes('broker') ||
        catLower.includes('commission') ||
        catLower.includes('legal') ||
        catLower.includes('tax') ||
        catLower.includes('society') ||
        catLower.includes('marketing') ||
        catLower.includes('advertising') ||
        catLower.includes('salary') ||
        catLower.includes('salaries') ||
        catLower.includes('staff') ||
        catLower.includes('utility') ||
        catLower.includes('electricity') ||
        catLower.includes('water')
      ) {
        return 'E';
      }
      return 'F';
    }
  };

  const downloadSampleTemplate = () => {
    const sampleData = [
      {
        "Month": "Jan",
        "Year": "2026",
        "Category": "Rental Income",
        "Type": "Inflow",
        "Amount": 45.0,
        "Notes": "Commercial space rental BITS Pilani"
      },
      {
        "Month": "Jan",
        "Year": "2026",
        "Category": "Construction Cost",
        "Type": "Outflow",
        "Amount": 12.5,
        "Notes": "Cement and steel procurement"
      },
      {
        "Month": "Jan",
        "Year": "2026",
        "Category": "Staff Salaries",
        "Type": "Outflow",
        "Amount": 10.0,
        "Notes": "January payroll"
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Template");
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'Vanguard_CashFlow_Template.xlsx';
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        let skipped = 0;
        const parsedRows: ExcelRowPreview[] = [];

        data.forEach((row: any) => {
          const mVal = findVal(row, ['month', 'mth']);
          const yVal = findVal(row, ['year', 'yr']);
          const catVal = findVal(row, ['category', 'cat', 'particular', 'particulars']);
          const typeVal = findVal(row, ['type', 'inflow/outflow', 'flow', 'transaction type']);
          const amtVal = findVal(row, ['amount', 'amt', 'value', 'rupees']);
          const noteVal = findVal(row, ['notes', 'note', 'comment', 'description', 'particulars']) || '';

          const amountNum = parseFloat(amtVal);

          if (!mVal || !yVal || isNaN(amountNum) || amtVal === undefined || amtVal === null) {
            skipped++;
            return;
          }

          const mStr = String(mVal).trim();
          const yStr = String(yVal).trim();
          const category = String(catVal || 'Uncategorized').trim();
          const rawType = String(typeVal || 'Outflow').trim().toLowerCase();
          const isOutflow = rawType.includes('out') || rawType.includes('payment') || rawType.includes('expense') || rawType.includes('-') || rawType.startsWith('dr');
          const finalType = isOutflow ? 'Outflow' : 'Inflow';

          const letter = mapCategoryToSection(category, isOutflow);

          parsedRows.push({
            month: mStr,
            year: yStr,
            category,
            type: finalType,
            amount: amountNum,
            notes: String(noteVal),
            isValid: true,
            mappedSection: letter
          });
        });

        setPreviewRows(parsedRows);
        setImportStats({
          parsed: parsedRows.length,
          skipped: skipped
        });
      } catch (err: any) {
        console.error('Failed to parse Excel file:', err);
        setNotification({
          message: `Excel parsing failed: ${err.message || 'Check column layout'}`,
          type: 'error'
        });
      }
    };

    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  const handleExecuteImport = () => {
    if (previewRows.length === 0) return;

    let targetPeriodIdToSelect = selectedPeriodId;

    setPeriods((prevPeriods) => {
      let updatedPeriods = JSON.parse(JSON.stringify(prevPeriods)) as Period[];

      previewRows.forEach((row) => {
        if (!row.isValid) return;

        const mStr = row.month;
        const yStr = row.year;
        const categoryName = row.category;
        const amount = row.amount;
        const letter = row.mappedSection;

        // 1. Find or create matching period
        let period = updatedPeriods.find(p => p.name.toLowerCase() === `${mStr} ${yStr}`.toLowerCase() || p.name.toLowerCase() === `${mStr}-${yStr}`.toLowerCase());
        if (!period) {
          // Loose match (e.g. "Apr-Jun 2026" contains "Apr" and "2026")
          period = updatedPeriods.find(p => p.name.toLowerCase().includes(mStr.toLowerCase()) && p.name.includes(yStr));
        }

        if (!period) {
          // Create a new period
          const newId = `period-${Math.random().toString(36).substring(2, 9)}`;
          const periodName = `${mStr} ${yStr}`;
          period = createEmptyPeriod(newId, periodName);
          updatedPeriods.push(period);
        }

        targetPeriodIdToSelect = period.id;

        // 2. Find or create the item inside the section of the period
        const section = period.sections[letter];
        let item = section.items.find(i => i.name.toLowerCase().trim() === categoryName.toLowerCase().trim());
        if (item) {
          item.actual = Number((item.actual + amount).toFixed(2));
          item.budgeted = Number((item.budgeted + amount).toFixed(2));
        } else {
          const newItem: LineItem = {
            id: `item-${Math.random().toString(36).substring(2, 9)}`,
            name: categoryName,
            budgeted: amount,
            actual: amount
          };
          section.items.push(newItem);
        }
      });

      return updatedPeriods;
    });

    if (targetPeriodIdToSelect) {
      setSelectedPeriodId(targetPeriodIdToSelect);
    }

    setNotification({
      message: `Successfully imported ${previewRows.filter(r => r.isValid).length} cash flow records!`,
      type: 'success'
    });

    setPreviewRows([]);
    setImportStats(null);
  };
  const [periods, setPeriods] = useState<Period[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved periods', e);
      }
    }
    return getSeedPeriods();
  });

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(() => {
    const saved = localStorage.getItem(SELECTED_PERIOD_KEY);
    if (saved && periods.some((p) => p.id === saved)) {
      return saved;
    }
    return periods[0]?.id || '';
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(periods));
  }, [periods]);

  useEffect(() => {
    localStorage.setItem(SELECTED_PERIOD_KEY, selectedPeriodId);
  }, [selectedPeriodId]);

  // Toast notification auto-dismiss
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // 2. Active Period Lookup
  const activePeriod = useMemo(() => {
    return periods.find((p) => p.id === selectedPeriodId) || periods[0];
  }, [periods, selectedPeriodId]);

  // 3. Dynamic Calculation Engine
  const totals = useMemo(() => {
    if (!activePeriod) {
      return {
        totalA: { budgeted: 0, actual: 0 },
        totalB: { budgeted: 0, actual: 0 },
        totalReceipts: { budgeted: 0, actual: 0 },
        totalC: { budgeted: 0, actual: 0 },
        totalD: { budgeted: 0, actual: 0 },
        totalE: { budgeted: 0, actual: 0 },
        totalPayments: { budgeted: 0, actual: 0 },
        balanceAvailable: { budgeted: 0, actual: 0 },
        totalF: { budgeted: 0, actual: 0 },
        netBalanceAvailable: { budgeted: 0, actual: 0 },
      };
    }
    return calculateAllTotals(activePeriod.sections);
  }, [activePeriod]);

  // 4. Line Item Actions
  const handleUpdateItem = (
    letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F',
    itemId: string,
    fields: Partial<LineItem>
  ) => {
    setPeriods((prevPeriods) =>
      prevPeriods.map((p) => {
        if (p.id !== selectedPeriodId) return p;

        const updatedSections = { ...p.sections };
        const updatedSection = { ...updatedSections[letter] };
        
        updatedSection.items = updatedSection.items.map((item) => {
          if (item.id === itemId) {
            return { ...item, ...fields };
          }
          return item;
        });

        updatedSections[letter] = updatedSection;
        return { ...p, sections: updatedSections };
      })
    );
  };

  const handleAddItem = (letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F') => {
    const newItem: LineItem = {
      id: Math.random().toString(36).substring(2, 9),
      name: '',
      budgeted: 0,
      actual: 0,
    };

    setPeriods((prevPeriods) =>
      prevPeriods.map((p) => {
        if (p.id !== selectedPeriodId) return p;

        const updatedSections = { ...p.sections };
        const updatedSection = { ...updatedSections[letter] };
        
        updatedSection.items = [...updatedSection.items, newItem];
        updatedSections[letter] = updatedSection;

        return { ...p, sections: updatedSections };
      })
    );
  };

  const handleRemoveItem = (letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F', itemId: string) => {
    setPeriods((prevPeriods) =>
      prevPeriods.map((p) => {
        if (p.id !== selectedPeriodId) return p;

        const updatedSections = { ...p.sections };
        const updatedSection = { ...updatedSections[letter] };
        
        updatedSection.items = updatedSection.items.filter((item) => item.id !== itemId);
        updatedSections[letter] = updatedSection;

        return { ...p, sections: updatedSections };
      })
    );
  };

  // 5. Period Management Actions
  const handleCreatePeriod = (name: string, sourceId: string | null) => {
    const newId = `period-${Math.random().toString(36).substring(2, 9)}`;
    let newPeriod: Period;

    if (sourceId) {
      const source = periods.find((p) => p.id === sourceId);
      if (source) {
        newPeriod = copyPeriodStructure(newId, name, source.sections);
      } else {
        newPeriod = createEmptyPeriod(newId, name);
      }
    } else {
      newPeriod = createEmptyPeriod(newId, name);
    }

    setPeriods((prev) => [...prev, newPeriod]);
    setSelectedPeriodId(newId);
    setNotification({
      message: `Successfully created period "${name}".`,
      type: 'success',
    });
  };

  const handleDeletePeriod = (id: string) => {
    if (periods.length <= 1) return;
    const remaining = periods.filter((p) => p.id !== id);
    setPeriods(remaining);
    setSelectedPeriodId(remaining[0].id);
    setNotification({
      message: 'Financial period deleted successfully.',
      type: 'success',
    });
  };

  const handleClearPeriodValues = () => {
    if (
      !window.confirm(
        'Are you sure you want to CLEAR all values (set to 0) for the current period? The line items structure will remain intact.'
      )
    ) {
      return;
    }

    setPeriods((prevPeriods) =>
      prevPeriods.map((p) => {
        if (p.id !== selectedPeriodId) return p;

        const clearedSections = { ...p.sections };
        Object.keys(clearedSections).forEach((key) => {
          const letter = key as keyof PeriodSections;
          clearedSections[letter] = {
            ...clearedSections[letter],
            items: clearedSections[letter].items.map((item) => ({
              ...item,
              budgeted: 0,
              actual: 0,
            })),
          };
        });

        return { ...p, sections: clearedSections };
      })
    );

    setNotification({
      message: 'All budgeted and actual amounts cleared.',
      type: 'success',
    });
  };

  const handleResetToSystemTemplate = () => {
    if (
      !window.confirm(
        'Are you sure you want to RESET this period entirely to the default system template? Any custom line items you have added will be lost.'
      )
    ) {
      return;
    }

    setPeriods((prevPeriods) =>
      prevPeriods.map((p) => {
        if (p.id !== selectedPeriodId) return p;
        return {
          ...p,
          sections: createDefaultPeriodSections(false),
        };
      })
    );

    setNotification({
      message: 'Period reset to default holding company template.',
      type: 'success',
    });
  };

  // 6. JSON Export & Import
  const handleExportCurrentPeriod = () => {
    if (!activePeriod) return;

    // Package current period data nicely for consumption by ratio/forecasting engines
    const exportData = {
      exportedAt: new Date().toISOString(),
      currency: 'Rs. Lakhs',
      periodId: activePeriod.id,
      periodName: activePeriod.name,
      totals: totals,
      data: activePeriod.sections,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `cash_flow_${activePeriod.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setNotification({
      message: `Exported current period "${activePeriod.name}" as JSON file.`,
      type: 'success',
    });
  };

  const handleExportFullState = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      type: 'FULL_STATE_BACKUP',
      periods: periods,
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(exportData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `cash_flow_full_backup_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();

    setNotification({
      message: 'Exported complete database backup.',
      type: 'success',
    });
  };

  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result;
        if (typeof raw !== 'string') throw new Error('Could not read file as string');
        const parsed = JSON.parse(raw);

        // Standard validation check: Is this a full backup or a single period?
        if (parsed.type === 'FULL_STATE_BACKUP' && Array.isArray(parsed.periods)) {
          setPeriods(parsed.periods);
          if (parsed.periods.length > 0) {
            setSelectedPeriodId(parsed.periods[0].id);
          }
          setNotification({
            message: 'Complete cash flow backup imported successfully.',
            type: 'success',
          });
        } else if (parsed.periodName && parsed.data) {
          // It's a single period import. Let's merge it in!
          const newId = `imported-${Math.random().toString(36).substring(2, 9)}`;
          const newPeriod: Period = {
            id: newId,
            name: `${parsed.periodName} (Imported)`,
            sections: parsed.data,
          };

          setPeriods((prev) => [...prev, newPeriod]);
          setSelectedPeriodId(newId);
          setNotification({
            message: `Imported period "${parsed.periodName}" as separate tab.`,
            type: 'success',
          });
        } else {
          throw new Error('JSON structure does not match expected cash flow schema.');
        }
      } catch (err: any) {
        console.error(err);
        setNotification({
          message: `Import failed: ${err.message || 'Invalid file structure'}`,
          type: 'error',
        });
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be imported again if needed
    e.target.value = '';
  };

  // 7. Filtering Line Items by Search Particulars
  // In order to keep formulas correct (totals always reflecting all items), we filter items visually
  // but keep calculations operating on the raw activePeriod. This matches Excel where filtered rows don't break the summary block!
  const filteredSections = useMemo((): PeriodSections | null => {
    if (!activePeriod) return null;
    if (!searchQuery.trim()) return activePeriod.sections;

    const query = searchQuery.toLowerCase();
    const copy: PeriodSections = JSON.parse(JSON.stringify(activePeriod.sections));

    Object.keys(copy).forEach((key) => {
      const letter = key as keyof PeriodSections;
      copy[letter].items = copy[letter].items.filter(
        (item) => item.name.toLowerCase().includes(query)
      );
    });

    return copy;
  }, [activePeriod, searchQuery]);

  if (!activePeriod) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <AlertCircle className="h-10 w-10 text-rose-500 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-900">Database Empty</h2>
          <p className="text-sm text-slate-500 mt-2">
            No financial periods are loaded. Click below to load the defaults.
          </p>
          <button
            onClick={() => setPeriods(getSeedPeriods())}
            className="mt-4 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer"
          >
            Load Sample Template
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F9FA] text-[#1A1A1A] font-sans antialiased">
      {/* Toast Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            id="toast-notification"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg ${
              notification.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-600" />
            )}
            <span className="text-sm font-medium">{notification.message}</span>
            <button
              onClick={() => setNotification(null)}
              className="p-1 rounded-md hover:bg-black/5"
            >
              <X className="h-4 w-4 opacity-60" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Responsive Sidebar */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#F8F9FA]">
        {/* Universal Header on Top */}
        <header className="sticky top-0 z-20 bg-white border-b border-gray-250 py-3 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold font-display tracking-tight text-gray-900">
              {currentTab === 'dashboard' && 'Dashboard Overview'}
              {currentTab === 'cashflow' && 'Portfolio Cash Flow Sheet'}
              {currentTab === 'ratios' && 'Financial Ratio Analysis'}
              {currentTab === 'predictions' && 'Predictive Modeling & Forecasts'}
              {currentTab === 'reports' && 'Portfolio Financial Report Room'}
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {currentTab === 'dashboard' && 'Visual trends and aggregate metrics across portfolio operations.'}
              {currentTab === 'cashflow' && 'Manage brought-forward balances, lease receipts, and cash outlays.'}
              {currentTab === 'ratios' && 'Liquidity, profitability, efficiency, and debt service coverages.'}
              {currentTab === 'predictions' && 'Quarterly forward cash-flow models and minimum reserve breach monitoring.'}
              {currentTab === 'reports' && 'Generate and download high-quality executive financial PDF portfolios.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Import / Export JSON buttons */}
            <button
              id="export-full-db-btn"
              onClick={handleExportFullState}
              title="Export complete database backup to JSON"
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FileDown className="h-4 w-4 text-gray-500" />
              <span className="hidden sm:inline">Export DB Backup</span>
            </button>

            <label
              htmlFor="import-db-header"
              title="Import JSON Backup file"
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
            >
              <FileUp className="h-4 w-4 text-gray-500" />
              <span className="hidden sm:inline">Import DB Backup</span>
            </label>
            <input
              id="import-db-header"
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </div>
        </header>

        {/* Content Pane */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">

        {/* VIEW CONDITIONAL RENDERING */}
        {currentTab === 'dashboard' && <DashboardView periods={periods} />}

        {currentTab === 'predictions' && <PredictionsView periods={periods} />}

        {currentTab === 'reports' && <ReportsView periods={periods} />}

        {currentTab === 'ratios' && (
          <RatiosView
            periods={periods}
            selectedPeriodId={selectedPeriodId}
            onSelectPeriod={setSelectedPeriodId}
          />
        )}

        {currentTab === 'cashflow' && (
          <div className="space-y-6">

        {/* Action Controls Section */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div className="flex-1">
            <PeriodSelector
              periods={periods}
              selectedPeriodId={selectedPeriodId}
              onSelectPeriod={setSelectedPeriodId}
              onCreatePeriod={handleCreatePeriod}
              onDeletePeriod={handleDeletePeriod}
            />
          </div>

          {/* Search Particulars Bar */}
          <div className="w-full md:w-80 flex flex-col justify-end">
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
              Filter Particulars
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400 pointer-events-none">
                <Search className="h-4 w-4" />
              </span>
              <input
                id="search-filter-input"
                type="text"
                placeholder="Search line item description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-8 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Live Metrics Panel */}
        <SummaryStrip totals={totals} />

        {/* EXCEL IMPORT INTERFACE */}
        <div id="excel-import-workspace" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileUp className="h-4 w-4 text-blue-600 animate-pulse" />
                Import Portfolio Records from Excel
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Automatically upload and merge multi-period transactions directly into active or new sheets.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="download-sample-template-btn"
                type="button"
                onClick={downloadSampleTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <FileDown className="h-3.5 w-3.5" />
                Download Sample Template
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-250 rounded-xl p-5 bg-slate-50/50 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors">
                <FileUp className="h-8 w-8 text-slate-400 mb-2" />
                <span className="text-xs font-semibold text-slate-700">Choose `.xlsx` or `.xls` spreadsheet file</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Columns: Month, Year, Category, Type, Amount, Notes</span>
                <label className="mt-3 inline-flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs shadow-xs transition-colors cursor-pointer">
                  Select Excel File
                  <input
                    id="excel-file-uploader-input"
                    type="file"
                    accept=".xlsx, .xls"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                </label>
              </div>

              {importStats && (
                <div className="text-xs space-y-1 bg-slate-50 border border-slate-200 p-3 rounded-lg">
                  <div className="font-semibold text-slate-800">File Analysis Result:</div>
                  <div className="flex flex-col gap-1 mt-1">
                    <span className="text-emerald-600 font-bold flex items-center gap-1">
                      ● {importStats.parsed} rows ready to import
                    </span>
                    {importStats.skipped > 0 && (
                      <span className="text-amber-600 font-bold flex items-center gap-1">
                        ● {importStats.skipped} rows skipped — missing required fields (Month, Year, or Amount).
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="text-xs text-slate-500 leading-relaxed space-y-2 bg-slate-50/50 border border-slate-150 p-4 rounded-xl">
              <div className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">How Excel Import Works:</div>
              <ul className="list-disc pl-4 space-y-1.5 text-[11px]">
                <li><strong>Auto-Period Match</strong>: Data with matching Months and Years (e.g. "Jan 2026") are mapped directly to corresponding sheets.</li>
                <li><strong>Auto-Categorization</strong>: Inflows go to section B. Outflows map to section C (EMI), D (Construction), E (Professional/Admin), or F (Extraordinary) based on keywords.</li>
                <li><strong>Unrecognized Categories</strong>: Added dynamically as new custom items so you never lose any data details.</li>
                <li><strong>Auto-Merge/Sum</strong>: Multiple rows for the same category in the same month/period are merged and summed.</li>
              </ul>
            </div>
          </div>

          {previewRows.length > 0 && (
            <div className="mt-6 border-t border-slate-100 pt-5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">
                  Excel Rows Preview ({previewRows.length} items)
                </h4>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setPreviewRows([]);
                      setImportStats(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white cursor-pointer hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    id="confirm-excel-import-btn"
                    onClick={handleExecuteImport}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-4 py-1.5 rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    Import {previewRows.length} Records Now
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto border border-slate-150 rounded-lg max-h-64">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-500 font-mono text-[9px] uppercase">
                    <tr>
                      <th className="p-2">Period</th>
                      <th className="p-2">Category</th>
                      <th className="p-2">Type</th>
                      <th className="p-2 text-right">Amount (Lakhs)</th>
                      <th className="p-2">Mapped Section</th>
                      <th className="p-2">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 font-medium text-slate-700 bg-white">
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="p-2 font-mono text-[10px]">{row.month} {row.year}</td>
                        <td className="p-2 font-semibold text-slate-800">{row.category}</td>
                        <td className="p-2">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            row.type === 'Inflow' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            {row.type}
                          </span>
                        </td>
                        <td className="p-2 text-right font-mono text-slate-900 font-bold">{row.amount.toFixed(2)} L</td>
                        <td className="p-2 text-slate-500 font-mono text-[10px]">
                          Section {row.mappedSection}
                        </td>
                        <td className="p-2 text-slate-400 text-[10px] truncate max-w-[150px]">{row.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Action Bar for clearing values or resetting */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-mono">
            <span>Period ID:</span>
            <span className="font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-slate-700">
              {activePeriod.id}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="clear-period-values-btn"
              onClick={handleClearPeriodValues}
              className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600 hover:text-rose-700 border border-rose-100 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Clear Current Values
            </button>

            <button
              id="reset-template-btn"
              onClick={handleResetToSystemTemplate}
              className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-700 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reset to holding template
            </button>
          </div>
        </div>

        {/* -------------------- SPREADSHEET FLOW -------------------- */}
        {filteredSections ? (
          <div>
            {/* SEARCHING WATERMARK */}
            {searchQuery && (
              <div id="search-active-alert" className="mb-4 text-xs text-amber-600 font-medium bg-amber-50 p-2.5 border border-amber-100 rounded-lg flex items-center justify-between">
                <span>
                  Filtering active. Rows shown are limited to matches. But totals/subtotals still reflect complete,
                  unfiltered holding company aggregates.
                </span>
                <button onClick={() => setSearchQuery('')} className="underline text-amber-700 hover:text-amber-800 font-bold ml-2">
                  Clear filter
                </button>
              </div>
            )}

            {/* SECTION A & B: RECEIPTS */}
            <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-4 font-mono">
              Money Coming In Section
            </h2>

            <LineItemTable
              section={filteredSections.A}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />

            <LineItemTable
              section={filteredSections.B}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />

            {/* INTERMEDIATE SUB-SUM: TOTAL RECEIPTS */}
            <IntermediateTotal
              label="Total Money Coming In"
              formula="Balances Brought Forward (A) + Rental Income (B)"
              budgeted={totals.totalReceipts.budgeted}
              actual={totals.totalReceipts.actual}
              type="receipts"
            />

            {/* SECTION C, D & E: PAYMENTS */}
            <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-4 font-mono mt-12">
              Money Going Out Section
            </h2>

            <LineItemTable
              section={filteredSections.C}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />

            <LineItemTable
              section={filteredSections.D}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />

            <LineItemTable
              section={filteredSections.E}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />

            {/* INTERMEDIATE SUB-SUM: TOTAL PAYMENTS */}
            <IntermediateTotal
              label="Total Money Going Out"
              formula="Loan Interest (C) + Operating Expenses (D) + Administration (E)"
              budgeted={totals.totalPayments.budgeted}
              actual={totals.totalPayments.actual}
              type="payments"
            />

            {/* INTERMEDIATE SUB-SUM: BALANCE AVAILABLE */}
            <IntermediateTotal
              label="Available Cash (After Loan EMI)"
              formula="Total Money Coming In - Total Money Going Out"
              budgeted={totals.balanceAvailable.budgeted}
              actual={totals.balanceAvailable.actual}
              type="balance"
            />

            {/* SECTION F: EXTRA EXPENSES */}
            <h2 className="text-xs uppercase font-bold tracking-widest text-slate-400 mb-4 font-mono mt-12">
              Extraordinary Allocations
            </h2>

            <LineItemTable
              section={filteredSections.F}
              onUpdateItem={handleUpdateItem}
              onAddItem={handleAddItem}
              onRemoveItem={handleRemoveItem}
            />

            {/* FINAL NET SUM */}
            <IntermediateTotal
              label="Total Cash in Hand"
              formula="Available Cash - Extraordinary CapEx (F)"
              budgeted={totals.netBalanceAvailable.budgeted}
              actual={totals.netBalanceAvailable.actual}
              type="net"
            />
          </div>
        ) : (
          <div className="py-20 text-center text-slate-400">Loading spreadsheet layout...</div>
        )}

        {/* Database backup tools */}
        <div className="mt-20 pt-8 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400 font-mono">
          <div>
            <span>Vanguard Cash Flow Engine v1.0.0 (Offline Native)</span>
          </div>
          <div className="flex gap-4">
            <button
              onClick={handleExportFullState}
              className="hover:text-slate-600 underline transition-colors cursor-pointer"
            >
              Export DB Backup
            </button>
            <span>•</span>
            <label
              htmlFor="import-db-upload"
              className="hover:text-slate-600 underline cursor-pointer transition-colors"
            >
              Import DB Backup
            </label>
            <input
              id="import-db-upload"
              type="file"
              accept=".json"
              onChange={handleImportJSON}
              className="hidden"
            />
          </div>
        </div>
        </div>
        )}
      </main>
    </div>
  </div>
  );
}
