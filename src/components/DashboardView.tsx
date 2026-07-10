import React, { useState, useMemo, useEffect } from 'react';
import { Period } from '../types';
import { calculateAllTotals, calculateSectionTotal } from '../utils/calculations';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Coins,
  DollarSign,
  Briefcase,
  Layers,
  Percent,
  Flame,
  Filter,
  Calendar,
  AlertCircle
} from 'lucide-react';

interface DashboardViewProps {
  periods: Period[];
}

export default function DashboardView({ periods }: DashboardViewProps) {
  // 1. Month-Range Filter State
  const [startPeriodId, setStartPeriodId] = useState<string>('');
  const [endPeriodId, setEndPeriodId] = useState<string>('');

  // Set default start/end periods on load
  useEffect(() => {
    if (periods.length > 0) {
      if (!startPeriodId) setStartPeriodId(periods[0].id);
      if (!endPeriodId) setEndPeriodId(periods[periods.length - 1].id);
    }
  }, [periods, startPeriodId, endPeriodId]);

  // Lookup indexes in periods list
  const startIdx = useMemo(() => {
    const idx = periods.findIndex((p) => p.id === startPeriodId);
    return idx !== -1 ? idx : 0;
  }, [periods, startPeriodId]);

  const endIdx = useMemo(() => {
    const idx = periods.findIndex((p) => p.id === endPeriodId);
    return idx !== -1 ? idx : periods.length - 1;
  }, [periods, endPeriodId]);

  // Ensure correct start/end slice
  const selectedPeriods = useMemo(() => {
    if (periods.length === 0) return [];
    const minIdx = Math.min(startIdx, endIdx);
    const maxIdx = Math.max(startIdx, endIdx);
    return periods.slice(minIdx, maxIdx + 1);
  }, [periods, startIdx, endIdx]);

  // Local state for Expense Distribution Pie Chart selected period
  const [piePeriodId, setPiePeriodId] = useState<string>('');

  // Sync pie period selection when active range updates
  useEffect(() => {
    if (selectedPeriods.length > 0) {
      // Default to the last period in the range
      setPiePeriodId(selectedPeriods[selectedPeriods.length - 1].id);
    }
  }, [selectedPeriods]);

  // 2. Calculations for active range
  const metrics = useMemo(() => {
    if (selectedPeriods.length === 0) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netCashFlow: 0,
        closingBalance: 0,
        growthRate: null,
        cashBurnRate: 0,
      };
    }

    let totalRevenue = 0;
    let totalExpenses = 0;

    selectedPeriods.forEach((p) => {
      const totals = calculateAllTotals(p.sections);
      totalRevenue += totals.totalB.actual;
      totalExpenses += (totals.totalC.actual + totals.totalD.actual + totals.totalE.actual + totals.totalF.actual);
    });

    const netCashFlow = totalRevenue - totalExpenses;

    // Closing Balance is the net available balance at the end of the last period in the range
    const lastPeriod = selectedPeriods[selectedPeriods.length - 1];
    const lastPeriodTotals = calculateAllTotals(lastPeriod.sections);
    const closingBalance = lastPeriodTotals.netBalanceAvailable.actual;

    // Monthly Growth %: Compare revenue of last period in range vs first period in range
    let growthRate: number | null = null;
    if (selectedPeriods.length > 1) {
      const firstPeriodRev = calculateSectionTotal(selectedPeriods[0].sections.B).actual;
      const lastPeriodRev = calculateSectionTotal(selectedPeriods[selectedPeriods.length - 1].sections.B).actual;
      if (firstPeriodRev > 0) {
        growthRate = ((lastPeriodRev - firstPeriodRev) / firstPeriodRev) * 100;
      }
    } else {
      // If only 1 period is selected, compare it to the immediately preceding period in full periods list if exists
      const currentIdx = periods.findIndex((p) => p.id === selectedPeriods[0].id);
      if (currentIdx > 0) {
        const prevPeriodRev = calculateSectionTotal(periods[currentIdx - 1].sections.B).actual;
        const currentPeriodRev = calculateSectionTotal(selectedPeriods[0].sections.B).actual;
        if (prevPeriodRev > 0) {
          growthRate = ((currentPeriodRev - prevPeriodRev) / prevPeriodRev) * 100;
        }
      }
    }

    // Cash Burn Rate: Average expenses per period in the range
    const cashBurnRate = selectedPeriods.length > 0 ? totalExpenses / selectedPeriods.length : 0;

    return {
      totalRevenue,
      totalExpenses,
      netCashFlow,
      closingBalance,
      growthRate,
      cashBurnRate,
    };
  }, [selectedPeriods, periods]);

  // 3. Prepare data for Recharts
  const chartData = useMemo(() => {
    return selectedPeriods.map((p) => {
      const totals = calculateAllTotals(p.sections);
      const inflow = totals.totalB.actual;
      const outflow = totals.totalC.actual + totals.totalD.actual + totals.totalE.actual + totals.totalF.actual;
      const net = inflow - outflow;
      const closing = totals.netBalanceAvailable.actual;

      return {
        name: p.name,
        Inflow: inflow,
        Outflow: outflow,
        Net: net,
        'Closing Balance': closing,
      };
    });
  }, [selectedPeriods]);

  // 4. Pie Chart Expense Distribution Data
  const pieChartData = useMemo(() => {
    const periodToAnalyze = selectedPeriods.find((p) => p.id === piePeriodId) || selectedPeriods[selectedPeriods.length - 1];
    if (!periodToAnalyze) return [];

    const totals = calculateAllTotals(periodToAnalyze.sections);

    const categories = [
      { name: 'Debt Service (C)', value: totals.totalC.actual, color: '#2563EB' },
      { name: 'Operating Exps (D)', value: totals.totalD.actual, color: '#0D9488' },
      { name: 'Admin/Other Exps (E)', value: totals.totalE.actual, color: '#D97706' },
      { name: 'Extraordinary (F)', value: totals.totalF.actual, color: '#E11D48' },
    ];

    // Filter out zero categories to prevent visual rendering glitches
    return categories.filter((cat) => cat.value > 0);
  }, [selectedPeriods, piePeriodId]);

  // Format numbers cleanly
  const formatLakhs = (val: number) => {
    return `Rs. ${Math.round((val + Number.EPSILON) * 100) / 100} L`;
  };

  const getGrowthIndicator = (rate: number | null) => {
    if (rate === null) return { text: 'N/A', icon: null, color: 'text-gray-500' };
    if (rate > 0) {
      return {
        text: `+${rate.toFixed(1)}%`,
        icon: <ArrowUpRight className="h-4 w-4" />,
        color: 'text-emerald-600 bg-emerald-50 border-emerald-100',
      };
    }
    if (rate < 0) {
      return {
        text: `${rate.toFixed(1)}%`,
        icon: <ArrowDownRight className="h-4 w-4" />,
        color: 'text-rose-600 bg-rose-50 border-rose-100',
      };
    }
    return {
      text: '0.0%',
      icon: null,
      color: 'text-gray-500 bg-gray-50 border-gray-150',
    };
  };

  if (periods.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500 bg-white border border-gray-200 rounded-xl p-6">
        No portfolio data available. Please load the system seed template first.
      </div>
    );
  }

  const growthIndicator = getGrowthIndicator(metrics.growthRate);

  return (
    <div id="financial-dashboard-screen" className="space-y-8 animate-fade-in">
      {/* 1. FILTER HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
        <div>
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider block font-mono">
            Analytical Workspace
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Aggregate portfolio performance and trend lines for the selected timeline.
          </p>
        </div>

        {/* Date / Month Range Picker */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-500 font-medium">
            <Filter className="h-3.5 w-3.5 text-[#2563EB]" />
            <span>Range:</span>
          </div>

          <div className="flex items-center gap-2">
            <select
              id="start-period-filter"
              value={startPeriodId}
              onChange={(e) => setStartPeriodId(e.target.value)}
              className="bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>

            <span className="text-gray-400 text-xs">to</span>

            <select
              id="end-period-filter"
              value={endPeriodId}
              onChange={(e) => setEndPeriodId(e.target.value)}
              className="bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-lg py-1.5 px-3 text-xs font-semibold text-gray-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/10"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 2. KPI GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Total Revenue */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider font-mono">
                Money Coming In
              </span>
              <div className="text-2xl font-extrabold text-[#1A1A1A] font-mono tracking-tight pt-1">
                {formatLakhs(metrics.totalRevenue)}
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-[#2563EB]">
              <Coins className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
            Sum of all lease rentals and other collections.
          </p>
          <div className="absolute top-0 left-0 w-1 h-full bg-[#2563EB]" />
        </div>

        {/* Total Expenses */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider font-mono">
                Money Going Out
              </span>
              <div className="text-2xl font-extrabold text-[#1A1A1A] font-mono tracking-tight pt-1">
                {formatLakhs(metrics.totalExpenses)}
              </div>
            </div>
            <div className="p-2 bg-gray-50 rounded-lg text-gray-600">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
            Total project, construction, loans, and extra costs.
          </p>
          <div className="absolute top-0 left-0 w-1 h-full bg-gray-300" />
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider font-mono">
                Money Left After Expenses
              </span>
              <div className={`text-2xl font-extrabold font-mono tracking-tight pt-1 ${
                metrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {formatLakhs(metrics.netCashFlow)}
              </div>
            </div>
            <div className={`p-2 rounded-lg ${
              metrics.netCashFlow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
            }`}>
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
            Inflow minus outflows (Money Left After Expenses) for this range.
          </p>
          <div className={`absolute top-0 left-0 w-1 h-full ${
            metrics.netCashFlow >= 0 ? 'bg-emerald-500' : 'bg-rose-500'
          }`} />
        </div>

        {/* Closing Balance */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider font-mono">
                Total Cash in Hand
              </span>
              <div className="text-2xl font-extrabold text-[#1A1A1A] font-mono tracking-tight pt-1">
                {formatLakhs(metrics.closingBalance)}
              </div>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg text-[#2563EB]">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
            Final available cash in hand at the end of the active timeline.
          </p>
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-600" />
        </div>

        {/* Monthly Growth % */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider font-mono">
                Growth Compared to Last Month
              </span>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-2xl font-extrabold text-[#1A1A1A] font-mono tracking-tight">
                  {metrics.growthRate !== null ? `${metrics.growthRate.toFixed(1)}%` : 'N/A'}
                </span>
                {metrics.growthRate !== null && (
                  <span className={`inline-flex items-center gap-0.5 text-[10px] font-bold border px-1.5 py-0.5 rounded-md ${growthIndicator.color}`}>
                    {growthIndicator.icon}
                    {growthIndicator.text}
                  </span>
                )}
              </div>
            </div>
            <div className="p-2 bg-[#2563EB]/5 rounded-lg text-[#2563EB]">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
            Rental/collection growth rate relative to previous periods.
          </p>
          <div className="absolute top-0 left-0 w-1 h-full bg-[#2563EB]/60" />
        </div>

        {/* Cash Burn Rate */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs relative overflow-hidden flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className="text-xs text-gray-500 uppercase font-bold tracking-wider font-mono">
                How Fast Money is Going Out
              </span>
              <div className="text-2xl font-extrabold text-orange-700 font-mono tracking-tight pt-1">
                {formatLakhs(metrics.cashBurnRate)}
              </div>
            </div>
            <div className="p-2 bg-orange-50 rounded-lg text-orange-600">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <p className="text-[11px] text-gray-400 mt-4 leading-relaxed">
            Average outflow (How Fast Money is Going Out) per period.
          </p>
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-500" />
        </div>
      </div>

      {/* 3. CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Cash Flow Trend */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-display">
              Money Trend Over Time
            </h3>
            <p className="text-[11px] text-gray-400">
              Overview tracing money coming in, money going out, and your remaining money left after expenses.
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1A1A1A' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Line type="monotone" dataKey="Inflow" stroke="#2563EB" strokeWidth={2.5} activeDot={{ r: 6 }} name="Money Coming In" />
                <Line type="monotone" dataKey="Outflow" stroke="#64748B" strokeWidth={2} name="Money Going Out" />
                <Line type="monotone" dataKey="Net" stroke="#0D9488" strokeWidth={2} strokeDasharray="5 5" name="Money Left After Expenses" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Grouped Inflow vs Outflow */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-display">
              Money Coming In vs Going Out
            </h3>
            <p className="text-[11px] text-gray-400">
              Direct comparison matching money coming in side-by-side against money going out.
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1A1A1A' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Legend iconSize={10} iconType="square" wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="Inflow" fill="#2563EB" radius={[4, 4, 0, 0]} name="Money Coming In" />
                <Bar dataKey="Outflow" fill="#64748B" radius={[4, 4, 0, 0]} name="Money Going Out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Revenue Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-display">
              Monthly Money Coming In
            </h3>
            <p className="text-[11px] text-gray-400">
              Bar progression of all money coming in across the specified range.
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1A1A1A' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Bar dataKey="Inflow" fill="#3B82F6" radius={[4, 4, 0, 0]} name="Money Coming In" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Expenses Bar Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-display">
              Monthly Money Going Out
            </h3>
            <p className="text-[11px] text-gray-400">
              Bar progression tracking all money going out across categories.
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1A1A1A' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Bar dataKey="Outflow" fill="#F97316" radius={[4, 4, 0, 0]} name="Money Going Out" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Running Cash Balance */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-display">
              Running Total Cash in Hand
            </h3>
            <p className="text-[11px] text-gray-400">
              reserves trajectory showing total cash in hand remaining at the end of each period.
            </p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px' }}
                  labelStyle={{ fontWeight: 'bold', fontSize: '11px', color: '#1A1A1A' }}
                  itemStyle={{ fontSize: '11px' }}
                />
                <Line type="monotone" dataKey="Closing Balance" stroke="#0D9488" strokeWidth={2.5} name="Total Cash in Hand" activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Distribution Pie Chart */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider font-display">
                Expense Distribution
              </h3>
              <p className="text-[11px] text-gray-400">
                Segmented breakdown of outlays across primary categories.
              </p>
            </div>

            {/* Select Period for Pie */}
            <select
              id="pie-chart-period-select"
              value={piePeriodId}
              onChange={(e) => setPiePeriodId(e.target.value)}
              className="bg-gray-50 border border-gray-200 rounded-lg py-1 px-2 text-[11px] font-semibold text-gray-700 cursor-pointer focus:outline-none"
            >
              {selectedPeriods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-64 flex flex-col sm:flex-row items-center justify-center gap-4">
            {pieChartData.length > 0 ? (
              <>
                <div className="w-full sm:w-1/2 h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {pieChartData.map((entry, idx) => (
                          <Cell key={`cell-${idx}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: any) => [`Rs. ${value} L`, 'Outflow']}
                        contentStyle={{ backgroundColor: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '11px' }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legend list */}
                <div className="w-full sm:w-1/2 flex flex-col gap-2.5">
                  {pieChartData.map((entry, idx) => {
                    const totalVal = pieChartData.reduce((acc, curr) => acc + curr.value, 0);
                    const pct = totalVal > 0 ? ((entry.value / totalVal) * 100).toFixed(1) : '0.0';
                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <div className="w-3 h-3 rounded-xs shrink-0" style={{ backgroundColor: entry.color }} />
                        <div className="flex-1 min-w-0">
                          <span className="text-gray-700 font-medium truncate block leading-none">
                            {entry.name}
                          </span>
                        </div>
                        <span className="text-gray-900 font-mono font-bold shrink-0">
                          {entry.value.toFixed(1)} L ({pct}%)
                        </span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="text-center text-gray-400 py-10 flex flex-col items-center justify-center gap-2">
                <AlertCircle className="h-8 w-8 text-gray-300" />
                <span className="text-xs">No outflows recorded in this timeline.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
