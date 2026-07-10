import { useState } from 'react';
import { Section, LineItem } from '../types';
import { Plus, Trash2, HelpCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { safeSum } from '../utils/calculations';

interface LineItemTableProps {
  section: Section;
  onUpdateItem: (letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F', itemId: string, fields: Partial<LineItem>) => void;
  onAddItem: (letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F') => void;
  onRemoveItem: (letter: 'A' | 'B' | 'C' | 'D' | 'E' | 'F', itemId: string) => void;
}

export default function LineItemTable({
  section,
  onUpdateItem,
  onAddItem,
  onRemoveItem,
}: LineItemTableProps) {
  const isSectionF = section.letter === 'F';
  const isRevenue = section.letter === 'A' || section.letter === 'B';

  // State to track raw input string values during user typing to avoid losing decimal point state
  const [editingCells, setEditingCells] = useState<Record<string, { budgeted: string; actual: string }>>({});

  const handleNumberChange = (
    itemId: string,
    field: 'budgeted' | 'actual',
    rawString: string
  ) => {
    // Save raw string in local state so the user can type decimal points ("15.", "15.0") smoothly
    setEditingCells((prev) => ({
      ...prev,
      [itemId]: {
        ...((prev[itemId] || { budgeted: '', actual: '' })),
        [field]: rawString,
      },
    }));

    // Parse and update parent state if it's a valid float
    const parsed = parseFloat(rawString);
    if (!isNaN(parsed)) {
      onUpdateItem(section.letter, itemId, { [field]: parsed });
    } else if (rawString === '') {
      onUpdateItem(section.letter, itemId, { [field]: 0 });
    }
  };

  const handleBlur = (itemId: string, field: 'budgeted' | 'actual', value: number) => {
    // Clear raw typing cache on blur so the cell renders the formatted numeric value from props
    setEditingCells((prev) => {
      const copy = { ...prev };
      delete copy[itemId];
      return copy;
    });
  };

  const getBudgetValue = (item: LineItem) => {
    if (editingCells[item.id] !== undefined && editingCells[item.id].budgeted !== undefined) {
      return editingCells[item.id].budgeted;
    }
    return item.budgeted === 0 ? '' : item.budgeted.toString();
  };

  const getActualValue = (item: LineItem) => {
    if (editingCells[item.id] !== undefined && editingCells[item.id].actual !== undefined) {
      return editingCells[item.id].actual;
    }
    return item.actual === 0 ? '' : item.actual.toString();
  };

  // Math totals
  const subtotalBudgeted = safeSum(section.items.map((i) => i.budgeted));
  const subtotalActual = safeSum(section.items.map((i) => i.actual));
  const subtotalVariance = subtotalActual - subtotalBudgeted;

  return (
    <div
      id={`section-table-${section.letter}`}
      className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden mb-8"
    >
      {/* Table Header Section */}
      <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-md bg-slate-200 text-xs font-bold text-slate-700 font-mono">
            {section.letter}
          </span>
          <h3 className="font-display font-semibold text-slate-850 text-sm md:text-base">
            {section.title}
          </h3>
        </div>
        <button
          id={`add-item-btn-${section.letter}`}
          type="button"
          onClick={() => onAddItem(section.letter)}
          className="inline-flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Line
        </button>
      </div>

      {/* Spreadsheet grid */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-500">
              <th className="py-2 px-3 text-center w-12 font-mono border-r border-slate-100">#</th>
              <th className="py-2 px-4 border-r border-slate-100">Particulars</th>
              <th className="py-2 px-4 text-right w-44 border-r border-slate-100">
                {isSectionF ? 'Approved Amt (Lakhs)' : 'Budgeted Amt (Lakhs)'}
              </th>
              <th className="py-2 px-4 text-right w-44 border-r border-slate-100">
                {isSectionF ? 'Actual Taken (Lakhs)' : 'Actual Amt (Lakhs)'}
              </th>
              <th className="py-2 px-4 text-right w-36 border-r border-slate-100">Variance (L)</th>
              <th className="py-2 px-3 text-center w-12">Actions</th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence initial={false}>
              {section.items.length === 0 ? (
                <tr className="border-b border-slate-150">
                  <td colSpan={6} className="py-8 px-4 text-center text-sm text-slate-400 italic">
                    No items in this section. Click "Add Line" above to insert a new row.
                  </td>
                </tr>
              ) : (
                section.items.map((item, index) => {
                  const variance = item.actual - item.budgeted;
                  // Color encoding for variance:
                  // Revenue: high actual is good (+green, -red)
                  // Expenses: high actual is bad (-green, +red)
                  const isGood = isRevenue ? variance >= 0 : variance <= 0;
                  const varianceColor =
                    variance === 0
                      ? 'text-slate-400'
                      : isGood
                      ? 'text-emerald-600 font-semibold'
                      : 'text-rose-600 font-semibold';

                  return (
                    <motion.tr
                      id={`row-${item.id}`}
                      key={item.id}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.15 }}
                      className="border-b border-slate-150 hover:bg-slate-50/50 group/row"
                    >
                      {/* S.No */}
                      <td className="py-2 px-3 text-center text-xs text-slate-400 font-mono border-r border-slate-100">
                        {index + 1}
                      </td>

                      {/* Particulars (Name) */}
                      <td className="py-1 px-2 border-r border-slate-100">
                        <input
                          id={`input-name-${item.id}`}
                          type="text"
                          value={item.name}
                          placeholder="Line item description"
                          onChange={(e) => onUpdateItem(section.letter, item.id, { name: e.target.value })}
                          className="w-full bg-transparent px-2 py-1 text-sm border border-transparent rounded-md transition-all focus:border-slate-300 focus:bg-white focus:shadow-xs focus:outline-none"
                        />
                      </td>

                      {/* Budgeted / Approved Amount */}
                      <td className="py-1 px-2 border-r border-slate-100">
                        <div className="relative flex items-center">
                          <input
                            id={`input-budgeted-${item.id}`}
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={getBudgetValue(item)}
                            onChange={(e) => handleNumberChange(item.id, 'budgeted', e.target.value)}
                            onBlur={() => handleBlur(item.id, 'budgeted', item.budgeted)}
                            className="w-full bg-transparent px-2 py-1 text-sm border border-transparent rounded-md transition-all focus:border-slate-300 focus:bg-white focus:shadow-xs focus:outline-none text-right font-mono"
                          />
                        </div>
                      </td>

                      {/* Actual Amount / Taken */}
                      <td className="py-1 px-2 border-r border-slate-100">
                        <div className="relative flex items-center">
                          <input
                            id={`input-actual-${item.id}`}
                            type="text"
                            inputMode="decimal"
                            placeholder="0.00"
                            value={getActualValue(item)}
                            onChange={(e) => handleNumberChange(item.id, 'actual', e.target.value)}
                            onBlur={() => handleBlur(item.id, 'actual', item.actual)}
                            className="w-full bg-transparent px-2 py-1 text-sm border border-transparent rounded-md transition-all focus:border-slate-300 focus:bg-white focus:shadow-xs focus:outline-none text-right font-mono"
                          />
                        </div>
                      </td>

                      {/* Variance */}
                      <td className="py-2 px-4 text-right font-mono text-sm border-r border-slate-100">
                        <span className={varianceColor}>
                          {variance > 0 ? '+' : ''}
                          {variance.toLocaleString('en-IN', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>

                      {/* Delete Action */}
                      <td className="py-2 px-3 text-center">
                        <button
                          id={`delete-row-btn-${item.id}`}
                          type="button"
                          onClick={() => onRemoveItem(section.letter, item.id)}
                          className="opacity-0 group-hover/row:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all cursor-pointer"
                          title="Delete row"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </motion.tr>
                  );
                })
              )}
            </AnimatePresence>
          </tbody>

          {/* Subtotals Row */}
          <tfoot>
            <tr className="bg-slate-50/80 border-t border-slate-200 font-semibold text-slate-800">
              <td className="py-3 px-3"></td>
              <td className="py-3 px-4 text-sm font-medium">
                Subtotal: Total - {section.letter}
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm border-r border-slate-100">
                ₹{' '}
                {subtotalBudgeted.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                L
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm border-r border-slate-100">
                ₹{' '}
                {subtotalActual.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                L
              </td>
              <td className="py-3 px-4 text-right font-mono text-sm border-r border-slate-100">
                <span
                  className={
                    subtotalVariance === 0
                      ? 'text-slate-500'
                      : (isRevenue ? subtotalVariance >= 0 : subtotalVariance <= 0)
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }
                >
                  {subtotalVariance > 0 ? '+' : ''}
                  {subtotalVariance.toLocaleString('en-IN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  L
                </span>
              </td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
