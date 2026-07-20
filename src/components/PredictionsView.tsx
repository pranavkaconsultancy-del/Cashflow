import React, { useMemo, useState, useEffect } from 'react';
import { Project } from '../types';
import { calculatePeriodTotals, formatCurrency } from '../utils/calculations';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { TrendingUp, AlertTriangle, CheckCircle, Sparkles, Sliders, Info, ListTodo } from 'lucide-react';

interface PredictionsViewProps {
  project: Project;
}

export default function PredictionsView({ project }: PredictionsViewProps) {
  // Live configurable safety buffer threshold (20 Lakhs literal: 2,000,000)
  const [threshold, setThreshold] = useState<number>(2000000);
  const [loading, setLoading] = useState<boolean>(false);
  const [aiData, setAiData] = useState<{
    recommendations: string[];
    growthTrend: string;
    shortageAlert: string | null;
    aiPowered: boolean;
  } | null>(null);

  // User checking checklist state
  const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>({});

  // Compute moving averages based on historical periods
  const forecast = useMemo(() => {
    if (project.periods.length === 0) {
      return {
        avgInflow: 0,
        avgOutflow: 0,
        currentBalance: 0,
        forecast30: { inflow: 0, outflow: 0, balance: 0 },
        forecast90: { inflow: 0, outflow: 0, balance: 0 }
      };
    }

    let totalInflow = 0;
    let totalOutflow = 0;

    project.periods.forEach((p) => {
      const totals = calculatePeriodTotals(p);
      totalInflow += totals.totalInflow;
      totalOutflow += totals.totalOutflow;
    });

    const count = project.periods.length;
    const avgInflow = totalInflow / count;
    const avgOutflow = totalOutflow / count;

    // Get current closing cash balance from last period
    const lastPeriod = project.periods[count - 1];
    const lastPeriodTotals = calculatePeriodTotals(lastPeriod);
    const currentBalance = lastPeriodTotals.closingBalance;

    // 30 Days Forecast (1 Month)
    const inflow30 = avgInflow;
    const outflow30 = avgOutflow;
    const balance30 = currentBalance + (inflow30 - outflow30);

    // 90 Days Forecast (3 Months)
    const inflow90 = avgInflow * 3;
    const outflow90 = avgOutflow * 3;
    const balance90 = currentBalance + (inflow90 - outflow90);

    return {
      avgInflow: Number(avgInflow.toFixed(2)),
      avgOutflow: Number(avgOutflow.toFixed(2)),
      currentBalance: Number(currentBalance.toFixed(2)),
      forecast30: {
        inflow: Number(inflow30.toFixed(2)),
        outflow: Number(outflow30.toFixed(2)),
        balance: Number(balance30.toFixed(2))
      },
      forecast90: {
        inflow: Number(inflow90.toFixed(2)),
        outflow: Number(outflow90.toFixed(2)),
        balance: Number(balance90.toFixed(2))
      }
    };
  }, [project.periods]);

  // Trigger Recommendations Fetch from Express backend
  useEffect(() => {
    let active = true;
    const fetchRecs = async () => {
      setLoading(true);
      setCheckedItems({}); // reset checklist on context change

      const count = project.periods.length;
      if (count === 0) {
        setLoading(false);
        return;
      }

      // Calculate active metrics to supply as grounding context
      let totalInflow = 0;
      let totalOutflow = 0;
      project.periods.forEach((p) => {
        const t = calculatePeriodTotals(p);
        totalInflow += t.totalInflow;
        totalOutflow += t.totalOutflow;
      });
      const avgInflow = totalInflow / count;
      const avgOutflow = totalOutflow / count;
      const closingBalance = project.periods[count - 1] ? calculatePeriodTotals(project.periods[count - 1]).closingBalance : 0;

      const forecast30 = { balance: closingBalance + (avgInflow - avgOutflow) };
      const forecast90 = { balance: closingBalance + (avgInflow * 3 - avgOutflow * 3) };

      const pendingCollections = project.collections
        .filter((c) => c.status !== 'Paid')
        .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);
      const overdueCollections = project.collections
        .filter((c) => c.status === 'Overdue')
        .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);

      const pendingPayables = project.payments
        .filter((p) => p.status !== 'Paid')
        .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
      const overduePayables = project.payments
        .filter((p) => p.status === 'Overdue')
        .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

      const context = {
        projectName: project.name,
        closingBalance,
        forecast30,
        forecast90,
        pendingCollections,
        overdueCollections,
        pendingPayables,
        overduePayables,
        budgetVsActual: project.budgetVsActual,
        periods: project.periods
      };

      try {
        const res = await fetch('/api/recommendations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context, threshold })
        });
        if (!res.ok) throw new Error('API down');
        const data = await res.json();
        if (active) {
          setAiData(data);
        }
      } catch (err) {
        console.warn('Fallback local recommendations triggered:', err);
        // Local client rule-based fallback
        if (active) {
          const localRecs: string[] = [];
          let localShortageAlert: string | null = null;
          let localGrowthTrend = "Steady and stable operational cash flow.";

          if (forecast30.balance < threshold) {
            localShortageAlert = `CRITICAL shortage risk! Cash reserve projected to fall to ${formatCurrency(forecast30.balance)} (below safety buffer ${formatCurrency(threshold)}) in next 30 days.`;
          } else if (forecast90.balance < threshold) {
            localShortageAlert = `WARNING: Cash reserve projected to fall to ${formatCurrency(forecast90.balance)} (below safety buffer ${formatCurrency(threshold)}) in 90 days.`;
          }

          if (project.periods.length >= 2) {
            const last = project.periods[project.periods.length - 1];
            const prev = project.periods[project.periods.length - 2];
            const lastNet = calculatePeriodTotals(last).netCashFlow;
            const prevNet = calculatePeriodTotals(prev).netCashFlow;
            if (lastNet > prevNet + 500000) {
              localGrowthTrend = `Accelerating: Net cash flow increased from ${formatCurrency(prevNet)} to ${formatCurrency(lastNet)}, showing rising sales velocity.`;
            } else if (lastNet < prevNet - 500000) {
              localGrowthTrend = `Declining: Spend velocity has exceeded income, dropping net cash flow from ${formatCurrency(prevNet)} to ${formatCurrency(lastNet)}. Action is recommended to curb expenses.`;
            } else {
              localGrowthTrend = `Steady: Balance fluctuations remain stable at around ${formatCurrency(lastNet)} net monthly.`;
            }
          }

          if (overdueCollections > 0) {
            localRecs.push(`Follow up with overdue customers immediately to retrieve ${formatCurrency(overdueCollections)} in outstanding receipts. This will raise your cash buffer.`);
          }
          if (overduePayables > 0) {
            localRecs.push(`Establish a structured pay-off program with partners for ${formatCurrency(overduePayables)} in overdue accounts payable to avoid interest penalties.`);
          }
          if (forecast30.balance < threshold) {
            localRecs.push(`Defer ${formatCurrency(1500000)} - ${formatCurrency(2000000)} of non-essential consultant, utility, or office overhead expenses to maintain liquidity next month.`);
          }
          if (localRecs.length < 3) {
            localRecs.push("Maintain a strict checking account reserve buffer of 20% to prevent unexpected subcontractor premium charges.");
            localRecs.push("Regularly update milestone collection cycles to sync contractor invoices with cash inflow dates.");
          }

          setAiData({
            recommendations: localRecs.slice(0, 4),
            growthTrend: localGrowthTrend,
            shortageAlert: localShortageAlert,
            aiPowered: false
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRecs();
    return () => { active = true; };
  }, [project, threshold]);

  // Data for Recharts comparison
  const chartData = useMemo(() => {
    return [
      {
        name: 'Current Month',
        Inflow: forecast.avgInflow,
        Outflow: forecast.avgOutflow,
        'Cash Position': forecast.currentBalance
      },
      {
        name: 'Next 30 Days (Proj)',
        Inflow: forecast.forecast30.inflow,
        Outflow: forecast.forecast30.outflow,
        'Cash Position': forecast.forecast30.balance
      },
      {
        name: 'Next 90 Days (Proj)',
        Inflow: forecast.forecast90.inflow,
        Outflow: forecast.forecast90.outflow,
        'Cash Position': forecast.forecast90.balance
      }
    ];
  }, [forecast]);

  const handleCheck = (index: number) => {
    setCheckedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="space-y-6">
      {/* Overview Block with Threshold Slider */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
              <TrendingUp className="h-4.5 w-4.5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900 font-display">Predictive Cash Flow Intelligence</h3>
              <p className="text-xs text-gray-500 font-medium font-sans">30-day and 90-day cash flow predictions using historical moving averages.</p>
            </div>
          </div>

          {/* safety buffer threshold slider */}
          <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl p-3.5 sm:w-80 shadow-xs">
            <Sliders className="h-4 w-4 text-gray-500 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] font-bold text-gray-600 font-mono">
                <span>SAFETY RESERVE BUFFER</span>
                <span className="text-blue-600">{formatCurrency(threshold)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="10000000"
                step="250000"
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
            </div>
          </div>
        </div>

        <p className="text-[11px] text-gray-500 italic border-t border-black/5 pt-2 flex items-center gap-1">
          <Info className="h-3.5 w-3.5 text-gray-400" />
          Moving Average Forecast: We average your actual construction outlays and booking collection trends over the past {project.periods.length} months to forecast future liquidity.
        </p>
      </div>

      {/* Grid of Projections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Next 30 Days */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">Next 30 Days Forecast</h4>
            <span className="text-[10px] bg-blue-50 text-blue-600 font-bold px-2 py-0.5 rounded-md font-mono">1 Month Model</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 p-2.5 rounded-lg">
              <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Expected Inflow</span>
              <span className="text-sm font-black text-emerald-600">{formatCurrency(forecast.forecast30.inflow)}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg">
              <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Expected Outflow</span>
              <span className="text-sm font-black text-rose-600 font-medium">{formatCurrency(forecast.forecast30.outflow)}</span>
            </div>
            <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
              <span className="block text-[9px] text-blue-800 font-mono uppercase tracking-wider font-bold">Projected Cash</span>
              <span className={`text-sm font-black ${forecast.forecast30.balance < threshold ? 'text-red-600' : 'text-blue-900'}`}>
                {formatCurrency(forecast.forecast30.balance)}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex items-start gap-2 text-xs">
            {forecast.forecast30.balance < threshold ? (
              <>
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h5 className="font-bold text-rose-950">Active Cash Shortage Alert</h5>
                  <p className="text-gray-600">Projected reserves fall below your {formatCurrency(threshold)} safety threshold. Immediate receivables follow-up or payment postponement is needed.</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-emerald-950">Healthy Reserve Buffer</h5>
                  <p className="text-gray-600">Project checking account will remain comfortably positive and above your {formatCurrency(threshold)} buffer over the next 30 days.</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Next 90 Days */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">Next 90 Days Forecast</h4>
            <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded-md font-mono">3 Month Model</span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-gray-50 p-2.5 rounded-lg">
              <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Expected Inflow</span>
              <span className="text-sm font-black text-emerald-600">{formatCurrency(forecast.forecast90.inflow)}</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg">
              <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Expected Outflow</span>
              <span className="text-sm font-black text-rose-600 font-medium">{formatCurrency(forecast.forecast90.outflow)}</span>
            </div>
            <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
              <span className="block text-[9px] text-blue-800 font-mono uppercase tracking-wider font-bold">Projected Cash</span>
              <span className={`text-sm font-black ${forecast.forecast90.balance < threshold ? 'text-amber-600 font-bold' : 'text-blue-900'}`}>
                {formatCurrency(forecast.forecast90.balance)}
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 border border-gray-200 rounded-xl flex items-start gap-2 text-xs">
            {forecast.forecast90.balance < threshold ? (
              <>
                <AlertTriangle className="h-4.5 w-4.5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-amber-950">90-Day Cash Flow Squeeze</h5>
                  <p className="text-gray-600">Long-term predictions show reserves sliding below your {formatCurrency(threshold)} threshold within 90 days. Slower construction cycles are advised.</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-emerald-950">Strong Long-term Runway</h5>
                  <p className="text-gray-600">Excellent 3-month forecast. Available checking balances are fully projected to hold strong over the {formatCurrency(threshold)} buffer.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Growth Trend Card & AI Recommendations Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Growth Trend Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">Growth Trend Analysis</h4>
              <span className="text-[10px] bg-sky-50 text-sky-700 font-bold px-2 py-0.5 rounded-md font-mono">Performance Readout</span>
            </div>

            {aiData ? (
              <div className="space-y-3 py-2">
                <div className="flex items-center gap-2">
                  <span className={`inline-flex h-3 w-3 rounded-full ${
                    aiData.growthTrend.toLowerCase().includes('accelerating')
                      ? 'bg-emerald-500 animate-pulse'
                      : aiData.growthTrend.toLowerCase().includes('declining')
                      ? 'bg-red-500'
                      : 'bg-blue-500'
                  }`} />
                  <span className="text-sm font-black text-gray-900 font-display">
                    {aiData.growthTrend.split(':')[0]}
                  </span>
                </div>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">
                  {aiData.growthTrend.includes(':') ? aiData.growthTrend.substring(aiData.growthTrend.indexOf(':') + 1) : aiData.growthTrend}
                </p>
              </div>
            ) : (
              <div className="h-20 flex items-center justify-center">
                <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3 mt-4 bg-gray-50 -mx-5 -mb-5 p-5 rounded-b-xl">
            <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono">Historical Fact</span>
            <p className="text-[11px] text-gray-500 leading-relaxed font-medium">
              Calculated using month-over-month variances of direct construction collections against operational payables. High velocity indicates accelerated homebuyer installment payments.
            </p>
          </div>
        </div>

        {/* AI Recommendations & Checklist Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div className="flex items-center gap-1.5">
              <Sparkles className="h-4.5 w-4.5 text-blue-600" />
              <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider font-mono">Actionable AI Recommendations</h4>
            </div>
            <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-md ${aiData?.aiPowered ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
              {aiData?.aiPowered ? 'GEMINI 3.5 ACTIVE' : 'RULE CORE FALLBACK'}
            </span>
          </div>

          {loading ? (
            <div className="space-y-3 py-6">
              <div className="h-4 bg-gray-100 rounded-md w-full animate-pulse" />
              <div className="h-4 bg-gray-100 rounded-md w-11/12 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded-md w-10/12 animate-pulse" />
            </div>
          ) : aiData && aiData.recommendations ? (
            <div className="space-y-3">
              <div className="flex items-center gap-1.5 text-[10px] text-blue-600 font-bold font-mono">
                <ListTodo className="h-3.5 w-3.5" />
                <span>INTERACTIVE ACTION PLAN CHECKLIST</span>
              </div>
              <div className="space-y-2.5">
                {aiData.recommendations.map((rec, idx) => (
                  <label
                    key={idx}
                    className={`flex items-start gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      checkedItems[idx]
                        ? 'bg-emerald-50/40 border-emerald-200 text-gray-400 line-through'
                        : 'bg-gray-50 border-gray-150 hover:bg-gray-100/50 text-gray-700'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={!!checkedItems[idx]}
                      onChange={() => handleCheck(idx)}
                      className="mt-0.5 h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded-sm cursor-pointer shrink-0"
                    />
                    <span className="text-xs font-medium leading-relaxed select-none">{rec}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-gray-400 py-6 text-center">Failed to load predictive recommendations.</p>
          )}
        </div>
      </div>

      {/* Projections Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono mb-4">Forecasting Cash Runway Chart</h4>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
              <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
              <YAxis fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip formatter={(value) => [formatCurrency(Number(value))]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Outflow" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cash Position" fill="#1a6e8e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
