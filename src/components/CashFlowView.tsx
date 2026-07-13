import React, { useState, useMemo } from 'react';
import { Project, Period, PeriodInflow, PeriodOutflow } from '../types';
import { calculatePeriodTotals } from '../utils/calculations';
import { Plus, Trash2, HelpCircle, Save, RotateCcw, Calendar } from 'lucide-react';

interface CashFlowViewProps {
  project: Project;
  onUpdateProject: (id: string, updated: Partial<Project>) => void;
}

export default function CashFlowView({ project, onUpdateProject }: CashFlowViewProps) {
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(
    project.periods[0]?.id || ''
  );

  // Sync selected period if it becomes empty or project changes
  const activePeriod = useMemo(() => {
    let p = project.periods.find((p) => p.id === selectedPeriodId);
    if (!p && project.periods.length > 0) {
      p = project.periods[0];
    }
    return p;
  }, [project.periods, selectedPeriodId]);

  // Set default period if empty on load
  React.useEffect(() => {
    if (project.periods.length > 0 && !selectedPeriodId) {
      setSelectedPeriodId(project.periods[0].id);
    }
  }, [project, selectedPeriodId]);

  // Add a new period
  const [newPeriodName, setNewPeriodName] = useState('');
  const handleAddPeriod = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPeriodName.trim()) return;

    // Use values of the last period if any
    const lastPeriod = project.periods[project.periods.length - 1];
    const prevTotals = lastPeriod ? calculatePeriodTotals(lastPeriod) : null;
    const prevBank = prevTotals ? prevTotals.closingBalance : 15.0;

    const newPeriod: Period = {
      id: `per-${Math.random().toString(36).substring(2, 9)}`,
      name: newPeriodName.trim(),
      bankBalance: prevBank,
      cashInHand: lastPeriod ? lastPeriod.cashInHand : 2.0,
      inflows: (lastPeriod ? lastPeriod.inflows : []).map(i => ({ ...i, budgeted: 0, actual: 0 })),
      outflows: (lastPeriod ? lastPeriod.outflows : []).map(o => ({ ...o, budgeted: 0, actual: 0 }))
    };

    if (newPeriod.inflows.length === 0) {
      newPeriod.inflows = [
        { category: 'Booking Amount', budgeted: 0, actual: 0 },
        { category: 'Down Payment', budgeted: 0, actual: 0 },
        { category: 'Installment Collection', budgeted: 0, actual: 0 }
      ];
    }
    if (newPeriod.outflows.length === 0) {
      newPeriod.outflows = [
        { category: 'Construction Cost', budgeted: 0, actual: 0 },
        { category: 'Material Purchase', budgeted: 0, actual: 0 },
        { category: 'Labour Cost', budgeted: 0, actual: 0 }
      ];
    }

    const updatedPeriods = [...project.periods, newPeriod];
    onUpdateProject(project.id, { periods: updatedPeriods });
    setSelectedPeriodId(newPeriod.id);
    setNewPeriodName('');
  };

  // Helper to update specific period property
  const updateActivePeriod = (updatedFields: Partial<Period>) => {
    if (!activePeriod) return;
    const updatedPeriods = project.periods.map((p) => {
      if (p.id === activePeriod.id) {
        return { ...p, ...updatedFields };
      }
      return p;
    });
    onUpdateProject(project.id, { periods: updatedPeriods });
  };

  // Update opening balance
  const handleOpeningBalanceChange = (field: 'bankBalance' | 'cashInHand', val: string) => {
    const num = parseFloat(val) || 0;
    updateActivePeriod({ [field]: num });
  };

  // Update inflow items
  const handleInflowChange = (index: number, field: 'budgeted' | 'actual', val: string) => {
    if (!activePeriod) return;
    const num = parseFloat(val) || 0;
    const inflows = [...activePeriod.inflows];
    inflows[index] = { ...inflows[index], [field]: num };
    updateActivePeriod({ inflows });
  };

  // Update outflow items
  const handleOutflowChange = (index: number, field: 'budgeted' | 'actual', val: string) => {
    if (!activePeriod) return;
    const num = parseFloat(val) || 0;
    const outflows = [...activePeriod.outflows];
    outflows[index] = { ...outflows[index], [field]: num };
    updateActivePeriod({ outflows });
  };

  // Add custom inflow category
  const [newInflowCat, setNewInflowCat] = useState('');
  const handleAddInflowCategory = () => {
    if (!newInflowCat.trim() || !activePeriod) return;
    const inflows = [...activePeriod.inflows, { category: newInflowCat.trim(), budgeted: 0, actual: 0 }];
    updateActivePeriod({ inflows });
    setNewInflowCat('');
  };

  // Add custom outflow category
  const [newOutflowCat, setNewOutflowCat] = useState('');
  const handleAddOutflowCategory = () => {
    if (!newOutflowCat.trim() || !activePeriod) return;
    const outflows = [...activePeriod.outflows, { category: newOutflowCat.trim(), budgeted: 0, actual: 0 }];
    updateActivePeriod({ outflows });
    setNewOutflowCat('');
  };

  // Delete category
  const handleDeleteCategory = (type: 'inflow' | 'outflow', index: number) => {
    if (!activePeriod) return;
    if (type === 'inflow') {
      const inflows = activePeriod.inflows.filter((_, i) => i !== index);
      updateActivePeriod({ inflows });
    } else {
      const outflows = activePeriod.outflows.filter((_, i) => i !== index);
      updateActivePeriod({ outflows });
    }
  };

  // Calculations for current active period
  const totals = useMemo(() => {
    return activePeriod ? calculatePeriodTotals(activePeriod) : null;
  }, [activePeriod]);

  if (!activePeriod) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center max-w-md mx-auto mt-10">
        <h3 className="text-sm font-bold text-gray-900 mb-2">No Months/Periods Configured</h3>
        <p className="text-xs text-gray-500 mb-4">Please add a monthly period to begin ledger tracking for this project.</p>
        <form onSubmit={handleAddPeriod} className="flex gap-2">
          <input
            type="text"
            required
            placeholder="e.g. Jan 2026"
            value={newPeriodName}
            onChange={(e) => setNewPeriodName(e.target.value)}
            className="flex-1 bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs"
          />
          <button type="submit" className="bg-[#2563EB] text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer">
            Add
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector and Add period bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Calendar className="h-5 w-5 text-[#2563EB]" />
          <div>
            <label className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-semibold">
              Selected Period / Month
            </label>
            <select
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="bg-transparent text-sm font-bold text-gray-900 border-none outline-hidden focus:ring-0 p-0 cursor-pointer"
            >
              {project.periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleAddPeriod} className="flex items-center gap-2">
          <input
            type="text"
            required
            placeholder="Add Month (e.g. Jul 2026)"
            value={newPeriodName}
            onChange={(e) => setNewPeriodName(e.target.value)}
            className="bg-gray-50 border border-gray-250 rounded-lg px-3 py-1.5 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
          />
          <button
            type="submit"
            className="bg-[#2563EB] hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-xs cursor-pointer flex items-center gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Month</span>
          </button>
        </form>
      </div>

      {/* Opening Balance Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="mb-4">
          <h3 className="text-sm font-bold text-gray-900 font-display">Opening Cash Balance</h3>
          <p className="text-[11px] text-gray-500 italic mt-0.5">
            Opening Balance: The total liquid cash position of this project at the start of the month (= Bank Balance + Cash in Hand).
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Bank Balance (Rs. Lakhs)
            </label>
            <input
              type="number"
              step="any"
              value={activePeriod.bankBalance}
              onChange={(e) => handleOpeningBalanceChange('bankBalance', e.target.value)}
              className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
              Cash In Hand (Rs. Lakhs)
            </label>
            <input
              type="number"
              step="any"
              value={activePeriod.cashInHand}
              onChange={(e) => handleOpeningBalanceChange('cashInHand', e.target.value)}
              className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 font-medium"
            />
          </div>

          <div className="bg-blue-50/50 border border-blue-100 p-3 rounded-lg flex flex-col justify-center">
            <span className="text-[10px] text-blue-800 uppercase tracking-wider font-mono font-bold">Auto-Calculated Opening Balance</span>
            <span className="text-lg font-extrabold text-blue-900 mt-1">
              Rs. {totals ? totals.openingBalance.toFixed(2) : '0.00'} Lakhs
            </span>
          </div>
        </div>
      </div>

      {/* Cash Inflow Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-display">Cash Inflow Categories</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Cash Inflow: Real estate cash collections including down payments, booking amounts, and project sales.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New Category"
              value={newInflowCat}
              onChange={(e) => setNewInflowCat(e.target.value)}
              className="bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
            />
            <button
              onClick={handleAddInflowCategory}
              className="bg-blue-50 hover:bg-blue-100 text-[#2563EB] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border border-blue-100"
            >
              Add Category
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 text-gray-500 uppercase tracking-wider text-[10px] font-mono border-b border-gray-200">
                <th className="py-3 px-5 font-semibold">Category Name</th>
                <th className="py-3 px-5 font-semibold">Planned Budget (Rs. Lakhs)</th>
                <th className="py-3 px-5 font-semibold">Actual Collected (Rs. Lakhs)</th>
                <th className="py-3 px-5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {activePeriod.inflows.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-5 font-semibold text-gray-800">{item.category}</td>
                  <td className="py-2.5 px-5">
                    <input
                      type="number"
                      step="any"
                      value={item.budgeted}
                      onChange={(e) => handleInflowChange(idx, 'budgeted', e.target.value)}
                      className="bg-white border border-gray-200 rounded-md p-1.5 w-32 text-xs text-gray-700"
                    />
                  </td>
                  <td className="py-2.5 px-5">
                    <input
                      type="number"
                      step="any"
                      value={item.actual}
                      onChange={(e) => handleInflowChange(idx, 'actual', e.target.value)}
                      className="bg-white border border-gray-200 rounded-md p-1.5 w-32 text-xs text-gray-700 font-semibold text-blue-600"
                    />
                  </td>
                  <td className="py-2.5 px-5 text-right">
                    <button
                      onClick={() => handleDeleteCategory('inflow', idx)}
                      className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Cash Outflow Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-gray-150 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-display">Cash Outflow Categories</h3>
            <p className="text-[11px] text-gray-500 mt-0.5">
              Cash Outflow: Expenditures including brick/cement purchasing, contractor billing, labour, marketing, and taxes.
            </p>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New Category"
              value={newOutflowCat}
              onChange={(e) => setNewOutflowCat(e.target.value)}
              className="bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
            />
            <button
              onClick={handleAddOutflowCategory}
              className="bg-blue-50 hover:bg-blue-100 text-[#2563EB] px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer border border-blue-100"
            >
              Add Category
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 text-gray-500 uppercase tracking-wider text-[10px] font-mono border-b border-gray-200">
                <th className="py-3 px-5 font-semibold">Category Name</th>
                <th className="py-3 px-5 font-semibold">Planned Budget (Rs. Lakhs)</th>
                <th className="py-3 px-5 font-semibold">Actual Spent (Rs. Lakhs)</th>
                <th className="py-3 px-5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {activePeriod.outflows.map((item, idx) => (
                <tr key={idx} className="hover:bg-gray-50/50">
                  <td className="py-2.5 px-5 font-semibold text-gray-800">{item.category}</td>
                  <td className="py-2.5 px-5">
                    <input
                      type="number"
                      step="any"
                      value={item.budgeted}
                      onChange={(e) => handleOutflowChange(idx, 'budgeted', e.target.value)}
                      className="bg-white border border-gray-200 rounded-md p-1.5 w-32 text-xs text-gray-700"
                    />
                  </td>
                  <td className="py-2.5 px-5">
                    <input
                      type="number"
                      step="any"
                      value={item.actual}
                      onChange={(e) => handleOutflowChange(idx, 'actual', e.target.value)}
                      className="bg-white border border-gray-200 rounded-md p-1.5 w-32 text-xs text-gray-700 font-semibold text-rose-600"
                    />
                  </td>
                  <td className="py-2.5 px-5 text-right">
                    <button
                      onClick={() => handleDeleteCategory('outflow', idx)}
                      className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
