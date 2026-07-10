import { motion } from 'motion/react';
import { CashFlowTotals } from '../types';
import { ArrowUpRight, ArrowDownRight, Wallet, CheckCircle } from 'lucide-react';

interface SummaryStripProps {
  totals: CashFlowTotals;
}

export default function SummaryStrip({ totals }: SummaryStripProps) {
  const formatLakhs = (val: number) => {
    const rounded = Math.round((val + Number.EPSILON) * 100) / 100;
    const formatted = rounded.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `₹ ${formatted} L`;
  };

  const getCardClasses = (val: number, baseClass: string) => {
    if (val < 0) {
      return `${baseClass} border-red-200 bg-red-50/50 text-red-900`;
    }
    return `${baseClass} border-emerald-200 bg-emerald-50/50 text-emerald-900`;
  };

  const items = [
    {
      title: 'Money Coming In (A + B)',
      budgeted: totals.totalReceipts.budgeted,
      actual: totals.totalReceipts.actual,
      icon: <ArrowUpRight className="h-5 w-5 text-emerald-600" />,
      colorClass: 'border-slate-200 bg-white text-slate-900',
    },
    {
      title: 'Money Going Out (C + D + E)',
      budgeted: totals.totalPayments.budgeted,
      actual: totals.totalPayments.actual,
      icon: <ArrowDownRight className="h-5 w-5 text-rose-600" />,
      colorClass: 'border-slate-200 bg-white text-slate-900',
    },
    {
      title: 'Available Cash (After Loan EMI)',
      budgeted: totals.balanceAvailable.budgeted,
      actual: totals.balanceAvailable.actual,
      icon: <Wallet className="h-5 w-5 text-blue-600" />,
      isBalance: true,
    },
    {
      title: 'Total Cash in Hand',
      budgeted: totals.netBalanceAvailable.budgeted,
      actual: totals.netBalanceAvailable.actual,
      icon: <CheckCircle className="h-5 w-5 text-emerald-600" />,
      isBalance: true,
    },
  ];

  return (
    <div id="summary-strip-container" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
      {items.map((item, index) => {
        const isNegative = item.actual < 0;
        const cardStyle = item.isBalance
          ? getCardClasses(item.actual, 'border rounded-xl p-4 shadow-xs backdrop-blur-md transition-all duration-200')
          : `border rounded-xl p-4 shadow-xs bg-white transition-all duration-200 ${item.colorClass}`;

        const variance = item.actual - item.budgeted;
        const isPositiveVariance = variance >= 0;

        return (
          <motion.div
            id={`summary-card-${index}`}
            key={item.title}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className={cardStyle}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {item.title}
              </span>
              <div className="p-1 rounded-lg bg-slate-100/50">
                {item.icon}
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-bold font-mono tracking-tight">
                  {formatLakhs(item.actual)}
                </span>
                <span className="text-xs text-slate-400 font-medium">Actual</span>
              </div>
              
              <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                <span className="text-xs font-mono text-slate-500">
                  {formatLakhs(item.budgeted)}
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider">Budgeted</span>
              </div>

              {/* Variance display */}
              <div className="flex justify-between items-center text-[11px] pt-1 font-medium">
                <span className="text-slate-400">Variance:</span>
                <span
                  className={`font-mono ${
                    variance === 0
                      ? 'text-slate-500'
                      : isPositiveVariance
                      ? 'text-emerald-600'
                      : 'text-rose-600'
                  }`}
                >
                  {variance > 0 ? '+' : ''}
                  {variance.toFixed(2)} L
                </span>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
