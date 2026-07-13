import React, { useMemo } from 'react';
import { Project } from '../types';
import { calculatePeriodTotals } from '../utils/calculations';
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
import { TrendingUp, AlertTriangle, CheckCircle, Lightbulb } from 'lucide-react';

interface PredictionsViewProps {
  project: Project;
}

export default function PredictionsView({ project }: PredictionsViewProps) {
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

  return (
    <div className="space-y-6">
      {/* Overview Block */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
            <TrendingUp className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-display">Predictive Cash Flow Intelligence</h3>
            <p className="text-xs text-gray-500 font-medium">30-day and 3-month cash flow projections using historical moving averages.</p>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 italic mt-2 border-t border-black/5 pt-2">
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
              <span className="text-sm font-black text-emerald-600">Rs. {forecast.forecast30.inflow} L</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg">
              <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Expected Outflow</span>
              <span className="text-sm font-black text-rose-600 font-medium">Rs. {forecast.forecast30.outflow} L</span>
            </div>
            <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
              <span className="block text-[9px] text-blue-800 font-mono uppercase tracking-wider font-bold">Projected Cash</span>
              <span className="text-sm font-black text-blue-900">Rs. {forecast.forecast30.balance} L</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-start gap-2 text-xs">
            {forecast.forecast30.balance < 0 ? (
              <>
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-rose-950">Active Cash Deficit Risk</h5>
                  <p className="text-gray-600">The 30-day forecast is negative. Expedite customer receivables or defer contractor payments.</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-emerald-950">Stable Liquidity</h5>
                  <p className="text-gray-600">Project checking account will remain positive and funded through the upcoming 30 days.</p>
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
              <span className="text-sm font-black text-emerald-600">Rs. {forecast.forecast90.inflow} L</span>
            </div>
            <div className="bg-gray-50 p-2.5 rounded-lg">
              <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Expected Outflow</span>
              <span className="text-sm font-black text-rose-600 font-medium">Rs. {forecast.forecast90.outflow} L</span>
            </div>
            <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100">
              <span className="block text-[9px] text-blue-800 font-mono uppercase tracking-wider font-bold">Projected Cash</span>
              <span className="text-sm font-black text-blue-900">Rs. {forecast.forecast90.balance} L</span>
            </div>
          </div>

          <div className="p-3 bg-slate-50 border border-gray-200 rounded-xl flex items-start gap-2 text-xs">
            {forecast.forecast90.balance < 0 ? (
              <>
                <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-rose-950">90-Day Cash Flow Squeeze</h5>
                  <p className="text-gray-600">Outflows exceed inflows over a 90-day horizon. Capital infusion may be required to sustain construction pace.</p>
                </div>
              </>
            ) : (
              <>
                <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h5 className="font-bold text-emerald-950">Strong Capitalization</h5>
                  <p className="text-gray-600">Cash reserves are projected to remain fully healthy. Construction progress is sustainable.</p>
                </div>
              </>
            )}
          </div>
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
              <Tooltip formatter={(value) => [`Rs. ${Number(value).toFixed(2)} Lakhs`]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="Inflow" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Outflow" fill="#EF4444" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Cash Position" fill="#2563EB" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
