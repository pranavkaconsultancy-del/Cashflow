import React, { useState, useMemo, useEffect } from 'react';
import { Period } from '../types';
import { calculateAllTotals } from '../utils/calculations';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle,
  HelpCircle,
  Settings,
  ArrowRight,
  ShieldAlert,
  Coins,
  Wallet,
  Activity,
  Flame,
  LineChart as ChartIcon
} from 'lucide-react';

interface PredictionsViewProps {
  periods: Period[];
}

export default function PredictionsView({ periods }: PredictionsViewProps) {
  // 1. Minimum Reserve Threshold State (Persistent in Local Storage)
  const [minReserve, setMinReserve] = useState<number>(() => {
    const saved = localStorage.getItem('vanguard_min_reserve_threshold');
    return saved ? parseFloat(saved) : 15.0; // Default Rs. 15.0 Lakhs
  });

  // Save to local storage when changed
  useEffect(() => {
    localStorage.setItem('vanguard_min_reserve_threshold', minReserve.toString());
  }, [minReserve]);

  // 2. Forecast Method Selector (Linear Regression, Moving Average, Blended)
  const [forecastMethod, setForecastMethod] = useState<'regression' | 'moving_average' | 'blended'>('blended');

  // 3. Process historical data
  const historicalData = useMemo(() => {
    return periods.map((p) => {
      const totals = calculateAllTotals(p.sections);
      const inflow = totals.totalB.actual;
      const outflow =
        totals.totalC.actual +
        totals.totalD.actual +
        totals.totalE.actual +
        totals.totalF.actual;
      const net = inflow - outflow;
      const closing = totals.netBalanceAvailable.actual;

      return {
        name: p.name,
        inflow,
        outflow,
        net,
        closing,
        sections: p.sections
      };
    });
  }, [periods]);

  // 4. Mathematical Forecasting Engine
  const forecastResults = useMemo(() => {
    const k = historicalData.length;
    if (k === 0) return { forecastPoints: [], breachPeriod: null, actions: [] };

    const nets = historicalData.map((d) => d.net);
    const closings = historicalData.map((d) => d.closing);

    // Helpers
    const runRegression = (y: number[], count = 3): number[] => {
      if (y.length === 0) return Array(count).fill(0);
      if (y.length === 1) return Array(count).fill(y[0]);

      const n = y.length;
      const sumX = (n * (n - 1)) / 2;
      const sumY = y.reduce((acc, curr) => acc + curr, 0);
      let sumXY = 0;
      let sumX2 = 0;
      for (let i = 0; i < n; i++) {
        sumXY += i * y[i];
        sumX2 += i * i;
      }

      const denom = n * sumX2 - sumX * sumX;
      if (denom === 0) return Array(count).fill(sumY / n);

      const m = (n * sumXY - sumX * sumY) / denom;
      const c = (sumY - m * sumX) / n;

      const result: number[] = [];
      for (let i = 0; i < count; i++) {
        result.push(m * (n + i) + c);
      }
      return result;
    };

    const runMovingAverage = (y: number[], count = 3, window = 3): number[] => {
      if (y.length === 0) return Array(count).fill(0);
      const temp = [...y];
      const result: number[] = [];
      for (let i = 0; i < count; i++) {
        const activeWindow = temp.slice(-window);
        const avg = activeWindow.reduce((acc, curr) => acc + curr, 0) / activeWindow.length;
        result.push(avg);
        temp.push(avg);
      }
      return result;
    };

    // Calculate forecasts for Net Cash Flow
    const netRegression = runRegression(nets, 3);
    const netMA = runMovingAverage(nets, 3, 3);

    const projectedNets: number[] = [];
    for (let i = 0; i < 3; i++) {
      if (forecastMethod === 'regression') {
        projectedNets.push(netRegression[i]);
      } else if (forecastMethod === 'moving_average') {
        projectedNets.push(netMA[i]);
      } else {
        projectedNets.push((netRegression[i] + netMA[i]) / 2);
      }
    }

    // Accumulate Closing Balances sequentially from the last historical closing balance
    const lastClosing = closings[k - 1];
    const projectedClosings: number[] = [];
    let currentCB = lastClosing;
    for (let i = 0; i < 3; i++) {
      currentCB += projectedNets[i];
      projectedClosings.push(currentCB);
    }

    // Generate forecast names
    const lastPeriodName = periods[k - 1]?.name || 'Period';
    const quarters = ['Jan-Mar', 'Apr-Jun', 'Jul-Sep', 'Oct-Dec'];
    const qs = ['Q1', 'Q2', 'Q3', 'Q4'];

    const getForecastPeriodNames = (name: string, count = 3): string[] => {
      let match = name.match(/^(Jan-Mar|Apr-Jun|Jul-Sep|Oct-Dec)\s+(\d{4})$/i);
      if (match) {
        let q = match[1];
        let y = parseInt(match[2]);
        let qIdx = quarters.findIndex((item) => item.toLowerCase() === q.toLowerCase());
        const result: string[] = [];
        for (let i = 1; i <= count; i++) {
          qIdx++;
          if (qIdx >= 4) {
            qIdx = 0;
            y++;
          }
          result.push(`${quarters[qIdx]} ${y}`);
        }
        return result;
      }

      match = name.match(/^(Q[1-4])\s+(\d{4})$/i);
      if (match) {
        let q = match[1].toUpperCase();
        let y = parseInt(match[2]);
        let qIdx = qs.indexOf(q);
        const result: string[] = [];
        for (let i = 1; i <= count; i++) {
          qIdx++;
          if (qIdx >= 4) {
            qIdx = 0;
            y++;
          }
          result.push(`${qs[qIdx]} ${y}`);
        }
        return result;
      }

      const result: string[] = [];
      for (let i = 1; i <= count; i++) {
        result.push(`${name} +${i}P`);
      }
      return result;
    };

    const forecastNames = getForecastPeriodNames(lastPeriodName, 3);

    const forecastPoints = forecastNames.map((name, index) => {
      return {
        name,
        net: projectedNets[index],
        closing: projectedClosings[index],
        isForecast: true
      };
    });

    // Determine reserve breaches
    let breachPeriod: string | null = null;
    for (let i = 0; i < forecastPoints.length; i++) {
      if (forecastPoints[i].closing < minReserve) {
        breachPeriod = forecastPoints[i].name;
        break;
      }
    }

    // Dynamic suggestions conditions
    const actions: { id: string; title: string; desc: string; type: 'warning' | 'info' | 'success' }[] = [];

    // Evaluate recent historical variables
    const averageExpenses =
      historicalData.reduce((acc, curr) => acc + curr.outflow, 0) / k;
    const averageAdminExpenses =
      historicalData.reduce((acc, curr) => {
        const adminTotal = curr.sections.E.items.reduce((sum, item) => sum + item.actual, 0);
        return acc + adminTotal;
      }, 0) / k;
    const lastPeriodExtraExpenses =
      historicalData[k - 1]?.sections.F.items.reduce((sum, item) => sum + item.actual, 0) || 0;

    const isReserveLow = breachPeriod !== null || lastClosing < minReserve;

    if (isReserveLow) {
      // 1. Suggest discretionary expense reductions if admin expenses are high or represent a large share
      if (averageAdminExpenses > 5.0) {
        actions.push({
          id: 'reduce-discretionary',
          title: 'Reduce Discretionary Expenses',
          desc: `Professional consultant fees, renovations, and office travel average Rs. ${averageAdminExpenses.toFixed(1)} L per period. Cutting or delaying non-essential administrative allocations can immediately conserve cash.`,
          type: 'warning'
        });
      }

      // 2. Suggest improving receivables
      actions.push({
        id: 'improve-receivables',
        title: 'Improve Receivables Collection',
        desc: 'Review lease agreements for Atlas Copco, BITS Pilani, or HDFC Bank. Enforce stringent payment cycles, implement direct-debit schedules, or offer modest discounts for early settlement to speed up cash inflows.',
        type: 'warning'
      });

      // 3. Suggest delaying capex if extraordinary expenses exist or reserve is breached
      if (lastPeriodExtraExpenses > 0 || breachPeriod !== null) {
        actions.push({
          id: 'delay-capex',
          title: 'Delay Non-Critical CapEx',
          desc: `Postpone planned extraordinary capital outlays (such as the recent Rs. ${lastPeriodExtraExpenses.toFixed(1)} L extraordinary expenditures or upcoming renovations) until bank balance projections remain securely above the Rs. ${minReserve.toFixed(1)} L minimum threshold.`,
          type: 'warning'
        });
      }
    } else {
      actions.push({
        id: 'healthy-reserves',
        title: 'Sustain Current Allocation Matrix',
        desc: 'Projected closing balances remain comfortably above your threshold. You may safely deploy excess cash into strategic CapEx or pre-pay financial obligations.',
        type: 'success'
      });
    }

    return { forecastPoints, breachPeriod, actions };
  }, [historicalData, periods, minReserve, forecastMethod]);

  // 5. Combine data for Recharts display
  const combinedChartData = useMemo(() => {
    if (historicalData.length === 0) return [];

    const lastHist = historicalData[historicalData.length - 1];

    const histPoints = historicalData.map((d) => ({
      name: d.name,
      'Money Left After Expenses (Actual)': d.net,
      'Total Cash in Hand (Actual)': d.closing,
      isForecast: false
    }));

    // First forecast point connects to the last historical point for line continuity
    const fctPoints = forecastResults.forecastPoints.map((d, idx) => {
      return {
        name: d.name,
        'Money Left After Expenses (Actual)': idx === 0 ? lastHist.net : undefined,
        'Total Cash in Hand (Actual)': idx === 0 ? lastHist.closing : undefined,
        'Money Left After Expenses (Forecast)': d.net,
        'Total Cash in Hand (Forecast)': d.closing,
        isForecast: true
      };
    });

    return [...histPoints, ...fctPoints];
  }, [historicalData, forecastResults]);

  if (periods.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500 bg-white border border-gray-200 rounded-xl p-6">
        No portfolio data available to forecast.
      </div>
    );
  }

  const formatLakhs = (val: number) => `Rs. ${val.toFixed(2)} L`;

  return (
    <div id="predictive-analysis-screen" className="space-y-8 animate-fade-in">
      {/* 1. SECTOR CONTROLS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Settings Column */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <Settings className="h-4 w-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 font-mono">
              Prediction Parameters
            </h3>
          </div>

          {/* User-set Minimum Reserve Threshold */}
          <div className="space-y-2">
            <label htmlFor="min-reserve-input" className="block text-xs font-semibold text-gray-600">
              Minimum Reserve Threshold (Rs. Lakhs)
            </label>
            <div className="relative rounded-lg shadow-2xs">
              <input
                id="min-reserve-input"
                type="number"
                step="1"
                min="0"
                value={minReserve}
                onChange={(e) => setMinReserve(Math.max(0, parseFloat(e.target.value) || 0))}
                className="block w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/15 focus:bg-white"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-xs text-gray-400 font-mono">
                Lakhs
              </div>
            </div>
            <p className="text-[10px] text-gray-400 leading-normal">
              Used to monitor liquid reserves. Alerts flag when projected cash drops below this floor.
            </p>
          </div>

          {/* Forecast Methodology Picker */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-600">
              Forecasting Methodology
            </label>
            <div className="grid grid-cols-1 gap-1">
              {[
                {
                  id: 'regression',
                  label: 'Linear Regression',
                  desc: 'Extrapolates linear trend lines ($y = mx + c$).'
                },
                {
                  id: 'moving_average',
                  label: 'Moving Average (3p)',
                  desc: 'Computes averages from the last 3 active quarters.'
                },
                {
                  id: 'blended',
                  label: 'Blended Model (Averaged)',
                  desc: 'Equal-weighted combine of regression and MA.'
                }
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setForecastMethod(m.id as any)}
                  className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all cursor-pointer ${
                    forecastMethod === m.id
                      ? 'border-[#2563EB] bg-blue-50/50 text-[#2563EB] font-semibold shadow-2xs'
                      : 'border-gray-150 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="block">{m.label}</span>
                  <span className="block text-[10px] text-gray-400 font-normal mt-0.5">
                    {m.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 3-Month Forecast Summary Table */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs lg:col-span-2 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 font-mono">
                  3-Month Forward Projections
                </h3>
              </div>
              <span className="text-[10px] font-semibold text-gray-400 font-mono bg-gray-50 border border-gray-150 px-2 py-0.5 rounded">
                Unit: Rs. Lakhs
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-150 text-gray-400 font-mono uppercase text-[10px] tracking-wider">
                    <th className="py-2.5 font-bold">Forecast Horizon</th>
                    <th className="py-2.5 font-bold text-right">Projected Money Left After Expenses</th>
                    <th className="py-2.5 font-bold text-right">Projected Total Cash in Hand</th>
                    <th className="py-2.5 font-bold text-center">Status vs Threshold</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-medium">
                  {forecastResults.forecastPoints.map((item, idx) => {
                    const isBelow = item.closing < minReserve;
                    return (
                      <tr key={idx} className="hover:bg-gray-50/50">
                        <td className="py-3 text-gray-900 font-semibold">{item.name}</td>
                        <td className={`py-3 text-right font-mono ${
                          item.net >= 0 ? 'text-emerald-700' : 'text-rose-700'
                        }`}>
                          {item.net >= 0 ? '+' : ''}{item.net.toFixed(2)} L
                        </td>
                        <td className="py-3 text-right font-mono font-bold text-gray-900">
                          {item.closing.toFixed(2)} L
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-flex items-center gap-1 text-[10px] font-bold border px-2 py-0.5 rounded-full ${
                            isBelow
                              ? 'bg-rose-50 border-rose-150 text-rose-700'
                              : 'bg-emerald-50 border-emerald-150 text-emerald-700'
                          }`}>
                            {isBelow ? 'Breach' : 'Secure'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-3 border border-gray-150 text-[11px] text-gray-500 leading-relaxed mt-4">
            <strong>Calculation Insight</strong>: Money Left After Expenses forecasts are evaluated from historical trends. Total cash in hand balances accumulate sequentially from the last recorded balance of <span className="font-semibold text-gray-700 font-mono">{periods[periods.length - 1]?.name}</span> ({formatLakhs(historicalData[historicalData.length - 1]?.closing)}).
          </div>
        </div>
      </div>

      {/* 2. TREND CHART EXPENDITURE */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-display flex items-center gap-2">
            <ChartIcon className="h-4 w-4 text-[#2563EB]" />
            Extended Money Projections (Historical + Forecast)
          </h3>
          <p className="text-[11px] text-gray-400">
            Dashed segments represent the 3-month forward projection envelope under the active forecasting model.
          </p>
        </div>

        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={combinedChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1A1A1A' }}
                itemStyle={{ fontSize: '11px' }}
              />
              <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              
              {/* Reference Line for Minimum Reserve */}
              <ReferenceLine y={minReserve} stroke="#EF4444" strokeDasharray="3 3" label={{ value: `Reserve Limit: ${minReserve} L`, fill: '#EF4444', fontSize: 10, position: 'top' }} />

              {/* Historical Curves */}
              <Line
                type="monotone"
                dataKey="Money Left After Expenses (Actual)"
                stroke="#0D9488"
                strokeWidth={2.5}
                activeDot={{ r: 6 }}
                name="Money Left After Expenses"
              />
              <Line
                type="monotone"
                dataKey="Total Cash in Hand (Actual)"
                stroke="#2563EB"
                strokeWidth={2.5}
                activeDot={{ r: 6 }}
                name="Total Cash in Hand"
              />

              {/* Forecast Curves (Dashed) */}
              <Line
                type="monotone"
                dataKey="Money Left After Expenses (Forecast)"
                stroke="#0D9488"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                name="Money Left After Expenses (Forecast)"
                dot={{ strokeWidth: 1, r: 3 }}
              />
              <Line
                type="monotone"
                dataKey="Total Cash in Hand (Forecast)"
                stroke="#2563EB"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                name="Total Cash in Hand (Forecast)"
                dot={{ strokeWidth: 1, r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. INSIGHTS PANEL */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-amber-600" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-900 font-display">
              Strategic Insights & Recommendations
            </h3>
          </div>

          <span className="text-[10px] font-bold font-mono tracking-wider uppercase text-gray-500">
            Rule-Based Expert Panel
          </span>
        </div>

        {/* Reserve breach flag alert */}
        {forecastResults.breachPeriod ? (
          <div className="bg-rose-50/50 border border-rose-200 rounded-xl p-4 flex gap-3.5">
            <div className="p-1.5 rounded-lg bg-rose-100 text-rose-700 shrink-0 self-start">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-950 font-display">
                Liquidity Breach Warned in {forecastResults.breachPeriod}
              </h4>
              <p className="text-[11px] text-rose-800 mt-1 leading-relaxed max-w-3xl">
                Under the current forecast ({forecastMethod}), liquid assets are projected to violate your set minimum safety buffer of <strong>Rs. {minReserve.toFixed(2)} L</strong>. Active cash management intervention is highly advised to avoid negative working capital bottlenecks.
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-emerald-50/40 border border-emerald-150 rounded-xl p-4 flex gap-3.5">
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 self-start">
              <CheckCircle className="h-5 w-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-emerald-950 font-display">
                Liquidity Reserves Secure
              </h4>
              <p className="text-[11px] text-emerald-800 mt-1 leading-relaxed max-w-3xl">
                All 3-month forward closing balance projections remain safely above your limit of <strong>Rs. {minReserve.toFixed(2)} L</strong>. Operational inflows are sufficient to meet budgeted liabilities.
              </p>
            </div>
          </div>
        )}

        {/* Dynamic actions checklist */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
          {forecastResults.actions.map((act) => (
            <div
              key={act.id}
              className={`p-4 rounded-xl border flex flex-col justify-between ${
                act.type === 'warning'
                  ? 'bg-amber-50/30 border-amber-200 text-slate-800'
                  : 'bg-emerald-50/30 border-emerald-150 text-slate-800'
              }`}
            >
              <div className="space-y-1.5">
                <span className={`inline-block text-[9px] font-extrabold uppercase tracking-wider border rounded px-1.5 py-0.5 leading-none ${
                  act.type === 'warning'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                }`}>
                  {act.type === 'warning' ? 'Required Action' : 'Stable'}
                </span>
                <h5 className="text-xs font-bold text-gray-900 font-display pt-1">{act.title}</h5>
                <p className="text-[11px] text-gray-500 leading-relaxed">{act.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
