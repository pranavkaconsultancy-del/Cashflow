import React, { useMemo } from 'react';
import { Period } from '../types';
import { calculateAllTotals } from '../utils/calculations';
import {
  Activity,
  Coins,
  Percent,
  TrendingUp,
  Calendar,
  Layers
} from 'lucide-react';

interface RatiosViewProps {
  periods: Period[];
  selectedPeriodId: string;
  onSelectPeriod: (id: string) => void;
}

export default function RatiosView({ periods, selectedPeriodId, onSelectPeriod }: RatiosViewProps) {
  const activePeriod = useMemo(() => {
    return periods.find((p) => p.id === selectedPeriodId) || periods[0];
  }, [periods, selectedPeriodId]);

  const ratioData = useMemo(() => {
    if (!activePeriod) return null;

    const totals = calculateAllTotals(activePeriod.sections);
    
    // Core aggregates
    const totalA = totals.totalA.actual; // Balances B/fd (Opening cash)
    const totalB = totals.totalB.actual; // Rent Receivables (Revenue)
    const totalC = totals.totalC.actual; // Debt service
    const totalD = totals.totalD.actual; // Operating expenses
    const totalE = totals.totalE.actual; // Other expenses
    const totalF = totals.totalF.actual; // Extra expenses (CapEx)

    const bankBalance = activePeriod.sections.A.items.find(
      (item) => item.name.toLowerCase().includes('bank')
    )?.actual || 0;

    // Assets & Liabilities
    const currentAssets = totalA + totalB;
    const currentLiabilities = totalC + totalD + totalE + totalF;
    const quickAssets = bankBalance + totalB;
    const cashAssets = totalA;

    // Operating Cash Flow & Free Cash Flow
    const operatingCashFlow = totalB - (totalD + totalE);
    const freeCashFlow = operatingCashFlow - totalF;

    // Ratio Helper (Safely divides and rounds)
    const safeRatio = (num: number, den: number): number | null => {
      if (!den || isNaN(num) || isNaN(den)) return null;
      return Math.round((num / den) * 100) / 100;
    };

    const safePercentage = (num: number, den: number): number | null => {
      if (!den || isNaN(num) || isNaN(den)) return null;
      return Math.round((num / den) * 1000) / 10;
    };

    // 1. Liquidity Ratios
    const currentRatio = safeRatio(currentAssets, currentLiabilities);
    const quickRatio = safeRatio(quickAssets, currentLiabilities);
    const cashRatio = safeRatio(cashAssets, currentLiabilities);

    // 2. Profitability Ratios
    const grossProfit = totalB - totalD;
    const grossProfitMargin = safePercentage(grossProfit, totalB);
    
    const netProfit = totalB - (totalC + totalD + totalE + totalF);
    const netProfitMargin = safePercentage(netProfit, totalB);

    // EBITDA = Net Profit + Interest (we exclude debt payments total C)
    const ebitda = totalB - (totalD + totalE + totalF);
    const ebitdaMargin = safePercentage(ebitda, totalB);

    // 3. Efficiency Ratios
    const assetTurnover = safeRatio(totalB, currentAssets);
    const workingCapital = currentAssets - currentLiabilities;
    const workingCapitalRatio = safeRatio(workingCapital, totalB);

    // 4. Cash Flow Ratios
    const operatingCashFlowRatio = safeRatio(operatingCashFlow, currentLiabilities);
    const cashCoverageRatio = safeRatio(operatingCashFlow, totalC);
    const freeCashFlowRatio = safePercentage(freeCashFlow, totalB);

    return {
      currentRatio,
      quickRatio,
      cashRatio,
      grossProfitMargin,
      netProfitMargin,
      ebitdaMargin,
      assetTurnover,
      workingCapitalRatio,
      operatingCashFlowRatio,
      cashCoverageRatio,
      freeCashFlowRatio,
      workingCapital
    };
  }, [activePeriod]);

  // Traffic light helpers based on numeric value
  const getTrafficLightColor = (ratioName: string, val: number | null): 'green' | 'orange' | 'red' => {
    if (val === null) return 'orange';

    switch (ratioName) {
      case 'currentRatio':
        return val >= 1.5 ? 'green' : val >= 1.0 ? 'orange' : 'red';
      case 'quickRatio':
        return val >= 1.2 ? 'green' : val >= 0.9 ? 'orange' : 'red';
      case 'cashRatio':
        return val >= 0.6 ? 'green' : val >= 0.3 ? 'orange' : 'red';
      case 'grossProfitMargin':
        return val >= 90 ? 'green' : val >= 75 ? 'orange' : 'red';
      case 'netProfitMargin':
        return val >= 20 ? 'green' : val >= 5 ? 'orange' : 'red';
      case 'ebitdaMargin':
        return val >= 35 ? 'green' : val >= 20 ? 'orange' : 'red';
      case 'assetTurnover':
        return val >= 0.4 ? 'green' : val >= 0.2 ? 'orange' : 'red';
      case 'workingCapitalRatio':
        return val >= 0.5 ? 'green' : val >= 0.1 ? 'orange' : 'red';
      case 'operatingCashFlowRatio':
        return val >= 0.8 ? 'green' : val >= 0.5 ? 'orange' : 'red';
      case 'cashCoverageRatio':
        return val >= 1.5 ? 'green' : val >= 1.1 ? 'orange' : 'red';
      case 'freeCashFlowRatio':
        return val >= 15 ? 'green' : val >= 5 ? 'orange' : 'red';
      default:
        return 'green';
    }
  };

  const getTrafficLightStyles = (color: 'green' | 'orange' | 'red') => {
    if (color === 'red') {
      return {
        dot: 'bg-rose-500 ring-rose-100',
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        text: 'Needs Attention'
      };
    }
    if (color === 'orange') {
      return {
        dot: 'bg-amber-500 ring-amber-100',
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        text: 'Satisfactory / Adequate'
      };
    }
    return {
      dot: 'bg-emerald-500 ring-emerald-100',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      text: 'Healthy / Strong'
    };
  };

  // Plain-English dynamic explanations
  const getExplanation = (ratioName: string, val: number | null): string => {
    if (val === null) return 'No data available to compute this metric.';
    const color = getTrafficLightColor(ratioName, val);
    const statusText = color === 'green' ? 'healthy' : color === 'orange' ? 'adequate' : 'tight and needs attention';
    const safetyText = color === 'green' ? 'strong safety buffer' : color === 'orange' ? 'standard backup safety level' : 'tight immediate cash reserves';

    switch (ratioName) {
      case 'currentRatio':
        return `You have ₹${val.toFixed(2)} for every ₹1 you owe right now — ${statusText}.`;
      case 'quickRatio':
        return `You have ₹${val.toFixed(2)} in immediate bank cash/receivables for every ₹1 of bills — ${safetyText}.`;
      case 'cashRatio':
        return `You have ₹${val.toFixed(2)} of pure brought-forward cash for every ₹1 of bills — ${color === 'green' ? 'very strong cash buffer' : color === 'orange' ? 'satisfactory backup' : 'tight immediate reserves'}.`;
      case 'grossProfitMargin':
        return `You keep ${val.toFixed(1)}% of your lease income after basic running expenses — ${color === 'green' ? 'excellent efficiency' : color === 'orange' ? 'standard efficiency' : 'below performance targets'}.`;
      case 'netProfitMargin':
        return `${val.toFixed(1)}% of revenue is left as profit after all loan EMIs and Capex — ${color === 'green' ? 'highly profitable operations' : color === 'orange' ? 'healthy net earnings' : 'narrow financial safety buffer'}.`;
      case 'ebitdaMargin':
        return `EBITDA represents ${val.toFixed(1)}% of your revenue — ${color === 'green' ? 'excellent asset returns' : color === 'orange' ? 'stable operational profitability' : 'tight operational profitability'}.`;
      case 'assetTurnover':
        return `You generate ₹${val.toFixed(2)} of rent for every ₹1 of total resources — ${color === 'green' ? 'optimal asset utilization' : color === 'orange' ? 'stable performance' : 'low asset utilization'}.`;
      case 'workingCapitalRatio':
        return `Working capital buffer represents ${val.toFixed(2)}x of revenue — ${color === 'green' ? 'very safe working capital buffer' : color === 'orange' ? 'standard safety margin' : 'tight working capital'}.`;
      case 'operatingCashFlowRatio':
        return `Your daily business generation covers ${val.toFixed(2)}x of total obligations — ${color === 'green' ? 'excellent operational cash coverage' : color === 'orange' ? 'standard cash generation' : 'cash flow is tight'}.`;
      case 'cashCoverageRatio':
        return `Net operational cash covers ${val.toFixed(2)}x of EMI obligations — ${color === 'green' ? 'highly secure EMI backing' : color === 'orange' ? 'adequate EMI backing' : 'high risk of default'}.`;
      case 'freeCashFlowRatio':
        return `${val.toFixed(1)}% of revenue is saved as free cash after capex — ${color === 'green' ? 'highly strong expansion capability' : color === 'orange' ? 'steady expansion capability' : 'limited expansion capacity'}.`;
      default:
        return '';
    }
  };

  if (!activePeriod || !ratioData) {
    return (
      <div className="py-12 text-center text-gray-500 bg-white border border-gray-200 rounded-xl p-6">
        No active period data loaded. Select or create a financial period to inspect metrics.
      </div>
    );
  }

  const {
    currentRatio,
    quickRatio,
    cashRatio,
    grossProfitMargin,
    netProfitMargin,
    ebitdaMargin,
    assetTurnover,
    workingCapitalRatio,
    operatingCashFlowRatio,
    cashCoverageRatio,
    freeCashFlowRatio
  } = ratioData;

  const categories = [
    {
      title: 'Liquidity Indicators',
      icon: <Coins className="h-5 w-5 text-blue-600" />,
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      description: 'Measures your capacity to meet current cash outflow obligations from liquid receipts.',
      ratios: [
        {
          key: 'currentRatio',
          name: 'Can We Pay Our Short-Term Bills?',
          techName: '(Current Ratio)',
          value: currentRatio !== null ? `${currentRatio}x` : 'N/A',
          formula: '(B/fd Cash + Rent Receivables) / (All Outflows)',
          rawVal: currentRatio
        },
        {
          key: 'quickRatio',
          name: 'Can We Pay Bills Without Selling Property?',
          techName: '(Quick Ratio)',
          value: quickRatio !== null ? `${quickRatio}x` : 'N/A',
          formula: '(Bank Balance + Rent Receivables) / (All Outflows)',
          rawVal: quickRatio
        },
        {
          key: 'cashRatio',
          name: 'Do We Have Enough Cash Right Now?',
          techName: '(Cash Ratio)',
          value: cashRatio !== null ? `${cashRatio}x` : 'N/A',
          formula: '(B/fd Balances) / (All Outflows)',
          rawVal: cashRatio
        }
      ]
    },
    {
      title: 'Profitability Indicators',
      icon: <Percent className="h-5 w-5 text-emerald-600" />,
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      description: 'Examines operational performance by matching lease receipts against direct and overhead expenditures.',
      ratios: [
        {
          key: 'grossProfitMargin',
          name: 'Profit Before Expenses (%)',
          techName: '(Gross Profit Margin)',
          value: grossProfitMargin !== null ? `${grossProfitMargin}%` : 'N/A',
          formula: '(Revenue - Direct Monthly Exps) / Revenue',
          rawVal: grossProfitMargin
        },
        {
          key: 'netProfitMargin',
          name: 'Actual Profit After Everything (%)',
          techName: '(Net Profit Margin)',
          value: netProfitMargin !== null ? `${netProfitMargin}%` : 'N/A',
          formula: '(Revenue - All Outflows) / Revenue',
          rawVal: netProfitMargin
        },
        {
          key: 'ebitdaMargin',
          name: 'Operating Surplus Before Capex (%)',
          techName: '(EBITDA Margin)',
          value: ebitdaMargin !== null ? `${ebitdaMargin}%` : 'N/A',
          formula: '(Revenue - Admin & Extra Exps) / Revenue',
          rawVal: ebitdaMargin
        }
      ]
    },
    {
      title: 'Asset & Working Capital Efficiency',
      icon: <Activity className="h-5 w-5 text-indigo-600" />,
      badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200',
      description: 'Assesses the productivity of capital allocation and cash working requirements relative to receipts.',
      ratios: [
        {
          key: 'assetTurnover',
          name: 'How Fast Are Assets Generating Revenue?',
          techName: '(Asset Turnover)',
          value: assetTurnover !== null ? `${assetTurnover}x` : 'N/A',
          formula: 'Rent Revenue / Total Receipts (B/fd + Rev)',
          rawVal: assetTurnover
        },
        {
          key: 'workingCapitalRatio',
          name: 'Working Capital Safety Ratio',
          techName: '(Working Capital Ratio)',
          value: workingCapitalRatio !== null ? `${workingCapitalRatio}x` : 'N/A',
          formula: 'Working Capital / Rent Revenue',
          rawVal: workingCapitalRatio
        }
      ]
    },
    {
      title: 'Cash Coverage & Growth',
      icon: <TrendingUp className="h-5 w-5 text-teal-600" />,
      badgeColor: 'bg-teal-50 text-teal-700 border-teal-200',
      description: 'Focuses strictly on operational cash generation, debt service capabilities, and capital reserve expansions.',
      ratios: [
        {
          key: 'operatingCashFlowRatio',
          name: 'Is Daily Business Generating Enough Cash?',
          techName: '(Operating Cash Flow Ratio)',
          value: operatingCashFlowRatio !== null ? `${operatingCashFlowRatio}x` : 'N/A',
          formula: '(Revenue - Run Exps) / (Current Liabilities)',
          rawVal: operatingCashFlowRatio
        },
        {
          key: 'cashCoverageRatio',
          name: 'Can We Comfortably Pay Our Loan EMIs?',
          techName: '(Cash Coverage Ratio)',
          value: cashCoverageRatio !== null ? `${cashCoverageRatio}x` : 'N/A',
          formula: '(Revenue - Run Exps) / (Debt Service Installments)',
          rawVal: cashCoverageRatio
        },
        {
          key: 'freeCashFlowRatio',
          name: 'Discretionary Cash Available For Growth (%)',
          techName: '(Free Cash Flow Ratio)',
          value: freeCashFlowRatio !== null ? `${freeCashFlowRatio}%` : 'N/A',
          formula: '(Operating Cash Flow - CapEx) / Revenue',
          rawVal: freeCashFlowRatio
        }
      ]
    }
  ];

  return (
    <div id="financial-ratios-section" className="space-y-8 animate-fade-in">
      {/* Header and Period selection */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-50 text-[#2563EB]">
            <Layers className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider block font-mono">
              Key Ratio Matrix
            </h2>
            <p className="text-xs text-gray-500">
              Analyses based on active ledger inputs. Auto-updates upon spreadsheet revisions.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-400" />
          <span className="text-xs font-semibold text-gray-600">Select period:</span>
          <select
            id="ratios-period-select"
            value={selectedPeriodId}
            onChange={(e) => onSelectPeriod(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-lg py-1 px-2.5 text-xs font-bold text-gray-800 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            {periods.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Ratios Grid */}
      <div className="space-y-8">
        {categories.map((cat, idx) => (
          <div key={idx} className="space-y-4">
            <div className="border-b border-gray-200 pb-2 flex items-center gap-2">
              {cat.icon}
              <h3 className="text-sm font-bold text-gray-950 uppercase tracking-wider font-display">
                {cat.title}
              </h3>
            </div>
            <p className="text-xs text-gray-500 -mt-2 leading-relaxed">
              {cat.description}
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {cat.ratios.map((ratio, rIdx) => {
                const color = getTrafficLightColor(ratio.key, ratio.rawVal);
                const styles = getTrafficLightStyles(color);

                return (
                  <div
                    key={rIdx}
                    className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs flex flex-col justify-between hover:border-gray-300 transition-all duration-150"
                  >
                    <div className="space-y-3">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-gray-900 tracking-tight leading-snug">
                            {ratio.name}
                          </h4>
                          <span className="text-[10px] text-gray-400 block mt-0.5">
                            {ratio.techName}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border shrink-0 ${styles.badge}`}
                        >
                          {styles.text}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5 pt-1">
                        <span className={`h-3 w-3 rounded-full ring-4 shrink-0 ${styles.dot}`} />
                        <span className="text-3xl font-extrabold font-mono text-gray-900 tracking-tight">
                          {ratio.value}
                        </span>
                      </div>

                      <div className="text-[9px] font-mono text-gray-400 bg-gray-50 p-1.5 rounded border border-gray-150 overflow-x-auto whitespace-nowrap">
                        Formula: {ratio.formula}
                      </div>
                    </div>

                    <div className="text-xs text-slate-700 font-medium mt-4 leading-relaxed border-t border-gray-100 pt-3">
                      {getExplanation(ratio.key, ratio.rawVal)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
