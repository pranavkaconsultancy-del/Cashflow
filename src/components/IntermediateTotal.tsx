import { ArrowRight, ArrowUpRight, ArrowDownRight, Wallet, CheckSquare } from 'lucide-react';

interface IntermediateTotalProps {
  label: string;
  formula: string;
  budgeted: number;
  actual: number;
  type: 'receipts' | 'payments' | 'balance' | 'net';
}

export default function IntermediateTotal({
  label,
  formula,
  budgeted,
  actual,
  type,
}: IntermediateTotalProps) {
  const variance = actual - budgeted;
  const isPositiveVariance = variance >= 0;

  // Revenue/balance vs payments variance styling
  const getVarianceColor = () => {
    if (variance === 0) return 'text-slate-500';
    
    if (type === 'payments') {
      // For payments, a higher actual is negative (red)
      return variance > 0 ? 'text-rose-600' : 'text-emerald-600';
    } else {
      // For receipts and balances, a higher actual is positive (green)
      return variance > 0 ? 'text-emerald-600' : 'text-rose-600';
    }
  };

  const getBgClasses = () => {
    switch (type) {
      case 'receipts':
        return 'bg-emerald-50/60 border-emerald-200 text-emerald-950';
      case 'payments':
        return 'bg-slate-50/80 border-slate-200 text-slate-950';
      case 'balance':
        return 'bg-blue-50/40 border-blue-150 text-blue-950';
      case 'net':
        return 'bg-blue-50 border-blue-200 text-blue-950';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'receipts':
        return <ArrowUpRight className="h-5 w-5 text-emerald-600" />;
      case 'payments':
        return <ArrowDownRight className="h-5 w-5 text-slate-500" />;
      case 'balance':
        return <Wallet className="h-5 w-5 text-blue-600" />;
      case 'net':
        return <CheckSquare className="h-5 w-5 text-blue-600" />;
    }
  };

  return (
    <div
      id={`intermediate-total-${type}`}
      className={`border rounded-xl p-4 mb-8 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all duration-200 ${getBgClasses()}`}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-white/60 shadow-2xs">
          {getIcon()}
        </div>
        <div>
          <h4 className="font-display font-bold text-sm md:text-base leading-tight">
            {label}
          </h4>
          <span className="text-xs opacity-75 font-mono">{formula}</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-6 md:gap-8 justify-between md:justify-end">
        {/* Budgeted column */}
        <div className="text-right">
          <span className="block text-[10px] uppercase tracking-wider opacity-60 font-medium">Budgeted</span>
          <span className="font-mono text-sm md:text-base font-semibold">
            ₹{' '}
            {budgeted.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            L
          </span>
        </div>

        {/* Actual column */}
        <div className="text-right">
          <span className="block text-[10px] uppercase tracking-wider opacity-60 font-medium">Actual</span>
          <span className="font-mono text-base md:text-lg font-bold">
            ₹{' '}
            {actual.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            L
          </span>
        </div>

        {/* Variance column */}
        <div className="text-right border-l pl-6 border-slate-200">
          <span className="block text-[10px] uppercase tracking-wider opacity-60 font-medium">Variance</span>
          <span className={`font-mono text-sm md:text-base ${getVarianceColor()}`}>
            {variance > 0 ? '+' : ''}
            {variance.toLocaleString('en-IN', {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{' '}
            L
          </span>
        </div>
      </div>
    </div>
  );
}
