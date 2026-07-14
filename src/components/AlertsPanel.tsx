import React, { useMemo, useState, useRef, useEffect } from 'react';
import { Project } from '../types';
import { calculatePeriodTotals } from '../utils/calculations';
import { Bell, AlertTriangle, ShieldCheck, TrendingDown, ArrowDownRight, Coins, AlertCircle } from 'lucide-react';

interface AlertsPanelProps {
  project: Project;
  threshold?: number; // Minimum cash reserve threshold
}

interface AlertItem {
  id: string;
  type: 'danger' | 'warning' | 'info';
  title: string;
  message: string;
  category: 'Negative Cash Flow' | 'Low Cash Balance' | 'High Expenses' | 'Revenue Drop' | 'Budget Exceeded' | 'Cash Reserve Warning';
  plainEnglish: string;
}

export default function AlertsPanel({ project, threshold = 20 }: AlertsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const alertsList = useMemo((): AlertItem[] => {
    const list: AlertItem[] = [];
    if (!project || project.periods.length === 0) return list;

    const count = project.periods.length;
    const latestPeriod = project.periods[count - 1];
    const latestTotals = calculatePeriodTotals(latestPeriod);

    // 1. Check: Low Cash Balance
    if (latestTotals.closingBalance <= 0) {
      list.push({
        id: 'cash-deficit',
        type: 'danger',
        category: 'Low Cash Balance',
        title: 'CRITICAL: Checking account overdraft',
        message: `Your closing cash position has dropped to Rs. ${latestTotals.closingBalance.toFixed(2)} Lakhs.`,
        plainEnglish: 'Plain-English helper: We have run completely out of cash in our bank accounts. Payments will bounce.'
      });
    } else if (latestTotals.closingBalance < threshold) {
      list.push({
        id: 'low-cash-buffer',
        type: 'warning',
        category: 'Low Cash Balance',
        title: 'Low Cash Safety Reserves',
        message: `Available cash Rs. ${latestTotals.closingBalance.toFixed(2)} L is below the configured Rs. ${threshold}.00 L buffer.`,
        plainEnglish: 'Plain-English helper: Our bank accounts are thin. We should pause non-essential spending to build a safety net.'
      });
    }

    // 2. Check: Negative Cash Flow in Latest Month
    if (latestTotals.netCashFlow < 0) {
      list.push({
        id: 'negative-cash-flow',
        type: 'warning',
        category: 'Negative Cash Flow',
        title: `Negative Net Cash Flow in ${latestPeriod.name}`,
        message: `Outflows exceeded inflows by Rs. ${Math.abs(latestTotals.netCashFlow).toFixed(2)} Lakhs this month.`,
        plainEnglish: `Plain-English helper: We spent more than we collected in ${latestPeriod.name}. This is unsustainable long-term.`
      });
    }

    // 3. Check: High Expenses (Outflow categories exceeded budget by >10% in latest month)
    latestPeriod.outflows.forEach((o) => {
      if (o.budgeted > 0 && o.actual > o.budgeted * 1.1) {
        const excess = o.actual - o.budgeted;
        const pct = ((o.actual - o.budgeted) / o.budgeted) * 100;
        list.push({
          id: `high-expense-${o.category}`,
          type: 'warning',
          category: 'High Expenses',
          title: `Overbudget: ${o.category}`,
          message: `Spent Rs. ${o.actual.toFixed(2)} L vs Rs. ${o.budgeted.toFixed(2)} L planned (+${pct.toFixed(1)}%).`,
          plainEnglish: `Plain-English helper: Spending on "${o.category}" went way over our planned budget this month.`
        });
      }
    });

    // 4. Check: Revenue Drop (Inflow in latest period lower than previous period)
    if (count >= 2) {
      const prevPeriod = project.periods[count - 2];
      const prevTotals = calculatePeriodTotals(prevPeriod);
      if (latestTotals.totalInflow < prevTotals.totalInflow * 0.9) {
        const dropPct = ((prevTotals.totalInflow - latestTotals.totalInflow) / prevTotals.totalInflow) * 100;
        list.push({
          id: 'revenue-drop',
          type: 'warning',
          category: 'Revenue Drop',
          title: `Revenue drop of ${dropPct.toFixed(1)}% MoM`,
          message: `Inflows dropped from Rs. ${prevTotals.totalInflow.toFixed(2)} L to Rs. ${latestTotals.totalInflow.toFixed(2)} L.`,
          plainEnglish: 'Plain-English helper: Sales and customer collections slowed down compared to last month.'
        });
      }
    }

    // 5. Check: Cumulative Budget Exceeded
    project.budgetVsActual.forEach((item) => {
      if (item.budgeted > 0 && item.actual > item.budgeted) {
        const diff = item.actual - item.budgeted;
        list.push({
          id: `budget-exceeded-${item.category}`,
          type: 'info',
          category: 'Budget Exceeded',
          title: `Cumulative Overrun: ${item.category}`,
          message: `Exceeded project-to-date budget by Rs. ${diff.toFixed(2)} Lakhs.`,
          plainEnglish: `Plain-English helper: Over the entire life of this project, we have spent more on "${item.category}" than allocated.`
        });
      }
    });

    // 6. Check: Cash Reserve Warning (Forecasted drop below threshold)
    let totalInflow = 0;
    let totalOutflow = 0;
    project.periods.forEach((p) => {
      const t = calculatePeriodTotals(p);
      totalInflow += t.totalInflow;
      totalOutflow += t.totalOutflow;
    });
    const avgInflow = totalInflow / count;
    const avgOutflow = totalOutflow / count;
    const currentBalance = latestTotals.closingBalance;

    const forecast30Balance = currentBalance + (avgInflow - avgOutflow);
    const forecast90Balance = currentBalance + (avgInflow * 3 - avgOutflow * 3);

    if (forecast30Balance < threshold) {
      list.push({
        id: 'forecast-shortage-30',
        type: 'danger',
        category: 'Cash Reserve Warning',
        title: 'High Risk: 30-Day Cash Deficit',
        message: `Moving average models predict reserves falling to Rs. ${forecast30Balance.toFixed(2)} L in 30 days.`,
        plainEnglish: 'Plain-English helper: If current spending and collecting habits continue, we will face a major cash shortage next month.'
      });
    } else if (forecast90Balance < threshold) {
      list.push({
        id: 'forecast-shortage-90',
        type: 'warning',
        category: 'Cash Reserve Warning',
        title: 'Risk: 90-Day Cash Crunch',
        message: `Long-term model predicts reserves falling to Rs. ${forecast90Balance.toFixed(2)} L in 90 days.`,
        plainEnglish: 'Plain-English helper: Three months out, we are on track to dip below our minimum cash threshold unless we collect faster.'
      });
    }

    return list;
  }, [project, threshold]);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 hover:text-blue-600 transition-colors cursor-pointer flex items-center justify-center shadow-xs"
        title="Diagnostic Alert Room"
      >
        <Bell className={`h-4.5 w-4.5 ${alertsList.length > 0 ? 'animate-bounce text-amber-500' : ''}`} />
        {alertsList.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[9px] h-4.5 w-4.5 rounded-full flex items-center justify-center leading-none border border-white">
            {alertsList.length}
          </span>
        )}
      </button>

      {/* Alerts Dropdown Drawer */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-4 bg-gray-50 border-b border-gray-150 flex items-center justify-between">
            <span className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">Active Financial Diagnostics</span>
            <span className="text-[10px] text-gray-500 font-bold font-mono">
              {alertsList.length} Active {alertsList.length === 1 ? 'Alert' : 'Alerts'}
            </span>
          </div>

          {/* Alert Cards Container */}
          <div className="max-h-96 overflow-y-auto divide-y divide-gray-100 p-2 space-y-2 bg-gray-50/50">
            {alertsList.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="inline-flex p-3 rounded-full bg-emerald-50 text-emerald-600">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h4 className="text-xs font-bold text-gray-800">Perfect Diagnostic Report!</h4>
                <p className="text-[11px] text-gray-500">Zero cash reserve squeezes, budget overruns, or operational risk items detected.</p>
              </div>
            ) : (
              alertsList.map((alert) => (
                <div
                  key={alert.id}
                  className={`p-3 rounded-lg border text-xs space-y-1.5 shadow-xs bg-white ${
                    alert.type === 'danger'
                      ? 'border-l-4 border-l-rose-500 border-gray-200'
                      : alert.type === 'warning'
                      ? 'border-l-4 border-l-amber-500 border-gray-200'
                      : 'border-l-4 border-l-blue-500 border-gray-200'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                      alert.type === 'danger'
                        ? 'bg-rose-50 text-rose-700'
                        : alert.type === 'warning'
                        ? 'bg-amber-50 text-amber-700'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {alert.category}
                    </span>
                    <div className="shrink-0">
                      {alert.type === 'danger' && <AlertCircle className="h-4 w-4 text-rose-500" />}
                      {alert.type === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                      {alert.type === 'info' && <AlertCircle className="h-4 w-4 text-blue-500" />}
                    </div>
                  </div>

                  <h5 className="font-bold text-gray-900 text-xs">{alert.title}</h5>
                  <p className="text-gray-600 font-medium leading-relaxed">{alert.message}</p>
                  
                  <div className="border-t border-black/5 pt-1.5 mt-1">
                    <p className="text-[10px] text-gray-500 italic leading-snug">{alert.plainEnglish}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
