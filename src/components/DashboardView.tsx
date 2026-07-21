import React, { useMemo } from 'react';
import { Project } from '../types';
import { calculatePeriodTotals, formatCurrency } from '../utils/calculations';
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
  Cell,
  AreaChart,
  Area
} from 'recharts';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  Coins,
  CheckCircle,
  AlertCircle,
  Clock,
  HelpCircle
} from 'lucide-react';
import CopilotPanel from './CopilotPanel';

interface DashboardViewProps {
  project: Project;
  projects: Project[];
}

const COLORS = ['#0EA5B7', '#142A4D', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#38BDF8', '#14B8A6'];

const formatPlainNumber = (v: any) => {
  const num = Number(v);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
};

export default function DashboardView({ project, projects }: DashboardViewProps) {
  
  // 1. Calculations for current project
  const summary = useMemo(() => {
    if (project.periods.length === 0) {
      return {
        openingBalance: 0,
        totalInflow: 0,
        totalOutflow: 0,
        netCashFlow: 0,
        closingBalance: 0
      };
    }

    const firstPeriod = project.periods[0];
    const lastPeriod = project.periods[project.periods.length - 1];

    const openingBalance = firstPeriod.bankBalance + firstPeriod.cashInHand;
    
    let totalInflow = 0;
    let totalOutflow = 0;

    project.periods.forEach((p) => {
      const t = calculatePeriodTotals(p);
      totalInflow += t.totalInflow;
      totalOutflow += t.totalOutflow;
    });

    const netCashFlow = totalInflow - totalOutflow;
    const closingBalance = openingBalance + netCashFlow;

    return {
      openingBalance: Number(openingBalance.toFixed(2)),
      totalInflow: Number(totalInflow.toFixed(2)),
      totalOutflow: Number(totalOutflow.toFixed(2)),
      netCashFlow: Number(netCashFlow.toFixed(2)),
      closingBalance: Number(closingBalance.toFixed(2))
    };
  }, [project]);

  // 2. Prepare Monthly Trends (Inflow vs Outflow over time)
  const monthlyTrendsData = useMemo(() => {
    return project.periods.map((p) => {
      const t = calculatePeriodTotals(p);
      return {
        name: p.name,
        Inflow: t.totalInflow,
        Outflow: t.totalOutflow,
        'Net Cash Flow': t.netCashFlow
      };
    });
  }, [project.periods]);

  // 3. Category Outflow Pie Chart Data
  const categoryOutflowData = useMemo(() => {
    const categories: Record<string, number> = {};
    project.periods.forEach((p) => {
      p.outflows.forEach((o) => {
        categories[o.category] = (categories[o.category] || 0) + o.actual;
      });
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [project.periods]);

  // 3b. Revenue Distribution Pie Chart Data
  const revenueDistributionData = useMemo(() => {
    const categories: Record<string, number> = {};
    project.periods.forEach((p) => {
      p.inflows.forEach((i) => {
        categories[i.category] = (categories[i.category] || 0) + i.actual;
      });
    });

    return Object.entries(categories)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [project.periods]);

  // 3c. Monthly Growth Trend Line Chart Data
  const monthlyGrowthTrendData = useMemo(() => {
    return project.periods.map((p) => {
      const t = calculatePeriodTotals(p);
      return {
        name: p.name,
        'Net Cash Flow': Number(t.netCashFlow.toFixed(2))
      };
    });
  }, [project.periods]);

  // 4. Collection Trends (Collected vs Pending over due dates)
  const collectionTrendsData = useMemo(() => {
    let cumulativeCollected = 0;
    let cumulativePending = 0;

    return project.collections.map((c) => {
      cumulativeCollected += c.collectedAmount;
      cumulativePending += Math.max(0, c.amount - c.collectedAmount);
      return {
        name: c.customerName.length > 10 ? c.customerName.substring(0, 10) + '...' : c.customerName,
        Collected: cumulativeCollected,
        Pending: cumulativePending
      };
    });
  }, [project.collections]);

  // 5. Budget vs Actual Outflow comparison (top categories)
  const budgetVsActualData = useMemo(() => {
    const categories: Record<string, { budgeted: number; actual: number }> = {};
    project.periods.forEach((p) => {
      p.outflows.forEach((o) => {
        if (!categories[o.category]) {
          categories[o.category] = { budgeted: 0, actual: 0 };
        }
        categories[o.category].budgeted += o.budgeted;
        categories[o.category].actual += o.actual;
      });
    });

    return Object.entries(categories)
      .map(([name, item]) => ({
        name,
        Budgeted: Number(item.budgeted.toFixed(2)),
        Actual: Number(item.actual.toFixed(2))
      }))
      .slice(0, 6); // Top 6 categories
  }, [project.periods]);

  // 6. Comparative Project bar chart data
  const comparativeProjectsData = useMemo(() => {
    return projects.map((proj) => {
      const baseOpen = proj.periods[0] ? (proj.periods[0].bankBalance + proj.periods[0].cashInHand) : 0;
      const totalIn = proj.periods.reduce((sum, p) => sum + p.inflows.reduce((s, i) => s + i.actual, 0), 0);
      const totalOut = proj.periods.reduce((sum, p) => sum + p.outflows.reduce((s, o) => s + o.actual, 0), 0);
      const closing = baseOpen + (totalIn - totalOut);

      return {
        name: proj.name.length > 15 ? proj.name.substring(0, 12) + '...' : proj.name,
        Inflows: Number(totalIn.toFixed(1)),
        Outflows: Number(totalOut.toFixed(1)),
        Closing: Number(closing.toFixed(1))
      };
    });
  }, [projects]);

  return (
    <div className="space-y-6">
      
      {/* 5 KPI Cards at top */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Total Inflow */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all relative overflow-hidden">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Total Cash Inflow</span>
            <span className="block text-xl font-extrabold text-gray-900 mt-1 truncate">{formatCurrency(summary.totalInflow)}</span>
          </div>
        </div>

        {/* Card 2: Total Outflow */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all relative overflow-hidden">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg shrink-0">
            <ArrowDownRight className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Total Cash Outflow</span>
            <span className="block text-xl font-extrabold text-gray-900 mt-1 truncate">{formatCurrency(summary.totalOutflow)}</span>
          </div>
        </div>

        {/* Card 3: Net Cash Flow */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all relative overflow-hidden">
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg shrink-0">
            <ArrowUpRight className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Net Cash Flow</span>
            <span className={`block text-xl font-extrabold mt-1 truncate ${summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              {formatCurrency(summary.netCashFlow)}
            </span>
          </div>
        </div>

        {/* Card 4: Closing Balance */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all relative overflow-hidden">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Wallet className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-blue-500 font-bold">Closing Balance</span>
            <span className="block text-xl font-extrabold text-gray-900 mt-1 truncate">{formatCurrency(summary.closingBalance)}</span>
          </div>
        </div>

        {/* Card 5: Available Cash */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all relative overflow-hidden">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Available Cash Position</span>
            <span className="block text-xl font-extrabold text-gray-900 mt-1 truncate">{formatCurrency(summary.closingBalance)}</span>
          </div>
        </div>
      </div>

      {/* Copilot observations panel (Prominent on dashboard!) */}
      <CopilotPanel project={project} />

      {/* Dashboard Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Trend (Inflow vs Outflow Bar/Line) */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 tracking-tight">Monthly Inflow vs Outflow Trend</h4>
            <span className="text-[11px] text-gray-400 block mt-0.5">Visualizes the comparison between total money received and money spent over each month.</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatPlainNumber} />
                <Tooltip formatter={(v) => [formatPlainNumber(v)]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Inflow" fill="#0EA5B7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Outflow" fill="#142A4D" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense distribution Pie */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 tracking-tight">Expense Category Outlay Share</h4>
            <span className="text-[11px] text-gray-400 block mt-0.5">Shows the percentage breakdown of outgoing expenditures across various business operation categories.</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {categoryOutflowData.length === 0 ? (
              <span className="text-xs text-gray-400">No outflow records to plot yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryOutflowData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryOutflowData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatPlainNumber(v)]} />
                  <Legend wrapperStyle={{ fontSize: 9 }} layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Collection Trend */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 tracking-tight">Cumulative Customer Collections Trend</h4>
            <span className="text-[11px] text-gray-400 block mt-0.5">Tracks total invoiced client revenue against actual payments received over time.</span>
          </div>
          <div className="h-64 w-full">
            {collectionTrendsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No customer invoices logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={collectionTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCollected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5B7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0EA5B7" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#142A4D" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#142A4D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatPlainNumber} />
                  <Tooltip formatter={(v) => [formatPlainNumber(v)]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="Collected" stroke="#0EA5B7" strokeWidth={2.5} fillOpacity={1} fill="url(#colorCollected)" activeDot={{ r: 6 }} />
                  <Area type="monotone" dataKey="Pending" stroke="#142A4D" strokeWidth={2.5} fillOpacity={1} fill="url(#colorPending)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Budget vs Actual (Grouped Bar) */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 tracking-tight">Outflow Budget vs Actual Outlays</h4>
            <span className="text-[11px] text-gray-400 block mt-0.5">Compares budgeted business targets with actual monthly cash spending.</span>
          </div>
          <div className="h-64 w-full">
            {budgetVsActualData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No expense actuals logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={budgetVsActualData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatPlainNumber} />
                  <Tooltip formatter={(v) => [formatPlainNumber(v)]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Budgeted" fill="#142A4D" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actual" fill="#0EA5B7" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project-wise comparative flow (Shown only when comparing or available as summary) */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm lg:col-span-2">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 tracking-tight">Cross-Project Comparative Cash Position</h4>
            <span className="text-[11px] text-gray-400 block mt-0.5">Compares financial performance and closing reserves across different project developments.</span>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativeProjectsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatPlainNumber} />
                <Tooltip formatter={(v) => [formatPlainNumber(v)]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Inflows" fill="#0EA5B7" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Outflows" fill="#142A4D" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Closing" fill="#475569" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Chart 1: Revenue Distribution (Inflow Categories) */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 tracking-tight">Revenue Distribution by Inflow Category</h4>
            <span className="text-[11px] text-gray-400 block mt-0.5">Breaks down company incoming revenues by source and contract billing types.</span>
          </div>
          <div className="h-64 w-full flex items-center justify-center">
            {revenueDistributionData.length === 0 ? (
              <span className="text-xs text-gray-400">No inflow records to plot yet.</span>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {revenueDistributionData.map((entry, index) => (
                      <Cell key={`cell-rev-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => [formatPlainNumber(v)]} />
                  <Legend wrapperStyle={{ fontSize: 9 }} layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* New Chart 2: Monthly Net Cash Flow Growth Trend */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm">
          <div className="mb-4">
            <h4 className="text-sm font-bold text-gray-900 tracking-tight">Monthly Net Cash Flow Growth Trend</h4>
            <span className="text-[11px] text-gray-400 block mt-0.5">Displays the trajectory of monthly net cash inflows and gains.</span>
          </div>
          <div className="h-64 w-full">
            {monthlyGrowthTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No monthly logs to plot growth trend yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyGrowthTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorGrowth" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0EA5B7" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#0EA5B7" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} tickFormatter={formatPlainNumber} />
                  <Tooltip formatter={(v) => [formatPlainNumber(v)]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Area type="monotone" dataKey="Net Cash Flow" stroke="#0EA5B7" strokeWidth={3} fillOpacity={1} fill="url(#colorGrowth)" activeDot={{ r: 6 }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
