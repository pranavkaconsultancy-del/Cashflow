import React, { useMemo } from 'react';
import { Project } from '../types';
import { calculatePeriodTotals } from '../utils/calculations';
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

const COLORS = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#3B82F6', '#14B8A6'];

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
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <span className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 font-bold">Total Cash Inflow</span>
            <span className="block text-lg font-black text-emerald-600 mt-1">Rs. {summary.totalInflow.toFixed(2)} L</span>
          </div>
          <div className="absolute bottom-3 right-3 text-emerald-100">
            <Coins className="h-10 w-10 stroke-1" />
          </div>
        </div>

        {/* Card 2: Total Outflow */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <span className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 font-bold">Total Cash Outflow</span>
            <span className="block text-lg font-black text-rose-600 mt-1">Rs. {summary.totalOutflow.toFixed(2)} L</span>
            <span className="block text-[9px] text-gray-500 italic mt-0.5 leading-none">Plain-English: Building & office spend.</span>
          </div>
          <div className="absolute bottom-3 right-3 text-rose-100">
            <ArrowDownRight className="h-10 w-10 stroke-1" />
          </div>
        </div>

        {/* Card 3: Net Cash Flow */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <span className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 font-bold">Net Cash Flow</span>
            <span className={`block text-lg font-black mt-1 ${summary.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              Rs. {summary.netCashFlow.toFixed(2)} L
            </span>
            <span className="block text-[9px] text-gray-500 italic mt-0.5 leading-none">Plain-English: Money left after spending.</span>
          </div>
          <div className="absolute bottom-3 right-3 text-blue-100">
            <ArrowUpRight className="h-10 w-10 stroke-1" />
          </div>
        </div>

        {/* Card 4: Closing Balance */}
        <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <span className="block text-[9px] font-mono tracking-wider uppercase text-blue-800 font-bold">Closing Balance</span>
            <span className="block text-lg font-black text-blue-900 mt-1">Rs. {summary.closingBalance.toFixed(2)} L</span>
            <span className="block text-[9px] text-blue-700 italic mt-0.5 leading-none font-medium">Plain-English: Total cash on hand now.</span>
          </div>
          <div className="absolute bottom-3 right-3 text-blue-200/50">
            <Wallet className="h-10 w-10 stroke-1" />
          </div>
        </div>

        {/* Card 5: Available Cash */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs flex flex-col justify-between relative overflow-hidden">
          <div>
            <span className="block text-[9px] font-mono tracking-wider uppercase text-gray-400 font-bold">Available Cash Position</span>
            <span className="block text-lg font-black text-gray-900 mt-1">Rs. {summary.closingBalance.toFixed(2)} L</span>
            <span className="block text-[9px] text-gray-500 italic mt-0.5 leading-none">Plain-English: Instantly spending-ready cash.</span>
          </div>
          <div className="absolute bottom-3 right-3 text-gray-100">
            <Coins className="h-10 w-10 stroke-1" />
          </div>
        </div>
      </div>

      {/* Copilot observations panel (Prominent on dashboard!) */}
      <CopilotPanel project={project} />

      {/* Dashboard Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Monthly Trend (Inflow vs Outflow Bar/Line) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono mb-4">Monthly Inflow vs Outflow Trend</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthlyTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`Rs. ${Number(v).toFixed(1)} L`]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Inflow" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Outflow" fill="#EF4444" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense distribution Pie */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono mb-4">Expense Category Outlay Share</h4>
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
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toFixed(1)} L`]} />
                  <Legend wrapperStyle={{ fontSize: 9 }} layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Collection Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono mb-4">Cumulative Customer Collections Trend</h4>
          <div className="h-64 w-full">
            {collectionTrendsData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No customer invoices logged yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={collectionTrendsData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toFixed(1)} L`]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Collected" stroke="#10B981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="Pending" stroke="#F59E0B" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Budget vs Actual (Grouped Bar) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono mb-4">Outflow Budget vs Actual Outlays</h4>
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
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toFixed(1)} L`]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Bar dataKey="Budgeted" fill="#93C5FD" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Actual" fill="#2563EB" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Project-wise comparative flow (Shown only when comparing or available as summary) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs lg:col-span-2">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono mb-4">Cross-Project Comparative Cash Position</h4>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={comparativeProjectsData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip formatter={(v) => [`Rs. ${Number(v).toFixed(1)} L`]} />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Bar dataKey="Inflows" fill="#10B981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Outflows" fill="#EF4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Closing" fill="#2563EB" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* New Chart 1: Revenue Distribution (Inflow Categories) */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono mb-4">Revenue Distribution by Inflow Category</h4>
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
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toFixed(1)} L`]} />
                  <Legend wrapperStyle={{ fontSize: 9 }} layout="vertical" align="right" verticalAlign="middle" />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* New Chart 2: Monthly Net Cash Flow Growth Trend */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono mb-4">Monthly Net Cash Flow Growth Trend</h4>
          <div className="h-64 w-full">
            {monthlyGrowthTrendData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-gray-400">
                No monthly logs to plot growth trend yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyGrowthTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                  <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                  <YAxis fontSize={10} tickLine={false} axisLine={false} />
                  <Tooltip formatter={(v) => [`Rs. ${Number(v).toFixed(1)} L`]} />
                  <Legend wrapperStyle={{ fontSize: 10 }} />
                  <Line type="monotone" dataKey="Net Cash Flow" stroke="#3B82F6" strokeWidth={3} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
