import React, { useMemo } from 'react';
import { Project } from '../types';
import { ArrowUpRight, ArrowDownRight, Percent, AlertCircle, Info } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface BudgetVsActualViewProps {
  project: Project;
}

export default function BudgetVsActualView({ project }: BudgetVsActualViewProps) {
  // Aggregate budgets and actuals per category across all periods
  const varianceData = useMemo(() => {
    const categoryMap: Record<string, { budgeted: number; actual: number }> = {};

    project.periods.forEach((p) => {
      p.outflows.forEach((o) => {
        if (!categoryMap[o.category]) {
          categoryMap[o.category] = { budgeted: 0, actual: 0 };
        }
        categoryMap[o.category].budgeted += o.budgeted;
        categoryMap[o.category].actual += o.actual;
      });
    });

    return Object.entries(categoryMap).map(([category, vals]) => {
      const variance = vals.budgeted - vals.actual;
      const isOverBudget = vals.actual > vals.budgeted;
      const percentUtilization = vals.budgeted > 0 ? (vals.actual / vals.budgeted) * 100 : 0;
      return {
        category,
        budgeted: Number(vals.budgeted.toFixed(2)),
        actual: Number(vals.actual.toFixed(2)),
        variance: Number(variance.toFixed(2)),
        isOverBudget,
        percentUtilization: Number(percentUtilization.toFixed(1))
      };
    });
  }, [project.periods]);

  return (
    <div className="space-y-6">
      {/* Header card with everyday definitions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 font-display uppercase">Outlay Budget Variance Audit</h3>
        <p className="text-xs text-gray-500 mt-1">
          Budget Variance tracking: Compares what you budgeted vs what you actually spent.
        </p>
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] text-gray-600 font-medium">
          <div className="flex items-center gap-2 p-2 bg-rose-50/50 rounded-lg text-rose-950">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>Over Budget (Red): You spent MORE cash than planned. Review vendor pricing or contracts.</span>
          </div>
          <div className="flex items-center gap-2 p-2 bg-emerald-50/50 rounded-lg text-emerald-950">
            <Info className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>Under Budget (Green): You spent LESS cash than planned. Great resource optimization!</span>
          </div>
        </div>
      </div>

      {/* Variance Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 text-gray-500 uppercase tracking-wider text-[10px] font-mono border-b border-gray-200">
                <th className="py-3 px-5 font-semibold">Expense Category</th>
                <th className="py-3 px-5 font-semibold">Aggregate Budgeted</th>
                <th className="py-3 px-5 font-semibold">Aggregate Actual Spent</th>
                <th className="py-3 px-5 font-semibold">Variance (Budget - Spent)</th>
                <th className="py-3 px-5 font-semibold">Budget Utilization</th>
                <th className="py-3 px-5 font-semibold text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {varianceData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400">
                    No expense or outflow records created for this project yet.
                  </td>
                </tr>
              ) : (
                varianceData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-3.5 px-5 font-bold text-gray-900">{row.category}</td>
                    <td className="py-3.5 px-5 font-medium">{formatCurrency(row.budgeted)}</td>
                    <td className="py-3.5 px-5 font-semibold text-gray-800">{formatCurrency(row.actual)}</td>
                    <td
                      className={`py-3.5 px-5 font-bold ${
                        row.isOverBudget ? 'text-rose-600' : row.variance > 0 ? 'text-emerald-600' : 'text-gray-800'
                      }`}
                    >
                      {row.isOverBudget ? '-' : '+'}{formatCurrency(Math.abs(row.variance))}
                    </td>
                    <td className="py-3.5 px-5 font-medium">
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-100 h-2 rounded-full overflow-hidden">
                          <div
                            style={{ width: `${Math.min(100, row.percentUtilization)}%` }}
                            className={`h-full rounded-full ${row.isOverBudget ? 'bg-rose-500' : 'bg-emerald-500'}`}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-gray-500">{row.percentUtilization}%</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-5 text-right">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          row.isOverBudget
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : row.variance > 0
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : 'bg-gray-50 text-gray-600 border border-gray-100'
                        }`}
                      >
                        {row.isOverBudget ? 'Over budget' : row.variance > 0 ? 'Savings' : 'Fully utilized'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
