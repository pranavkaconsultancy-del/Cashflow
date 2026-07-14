import React, { useMemo } from 'react';
import { Project } from '../types';
import { calculatePeriodTotals } from '../utils/calculations';
import { Scale, Activity, TrendingUp, Landmark, ShieldCheck, HelpCircle, ArrowUpRight } from 'lucide-react';

interface RatiosViewProps {
  project: Project;
}

interface RatioCardData {
  name: string;
  technicalName: string;
  value: string;
  meaning: string;
  status: 'good' | 'warning' | 'danger';
  statusLabel: string;
}

export default function RatiosView({ project }: RatiosViewProps) {
  // Compute ratios dynamically based on the selected project
  const ratios = useMemo(() => {
    let opening = project.periods[0] ? (project.periods[0].bankBalance + project.periods[0].cashInHand) : 0;
    let totalInflow = 0;
    let totalOutflow = 0;

    project.periods.forEach((p) => {
      const t = calculatePeriodTotals(p);
      totalInflow += t.totalInflow;
      totalOutflow += t.totalOutflow;
    });

    const closingBalance = opening + (totalInflow - totalOutflow);

    // Receivables (Pending Collections)
    const receivables = project.collections
      .filter((c) => c.status !== 'Paid')
      .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);

    // Payables (Pending Payments)
    const payables = project.payments
      .filter((p) => p.status !== 'Paid')
      .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

    // Outlays breakdown
    let constructionCosts = 0;
    let materialPurchases = 0;
    let labourCosts = 0;
    let contractorPayments = 0;
    let interestOutflows = 0;
    let loanEMIs = 0;

    project.periods.forEach((p) => {
      p.outflows.forEach((o) => {
        if (o.category === 'Construction Cost') constructionCosts += o.actual;
        else if (o.category === 'Material Purchase') materialPurchases += o.actual;
        else if (o.category === 'Labour Cost') labourCosts += o.actual;
        else if (o.category === 'Contractor Payment') contractorPayments += o.actual;
        else if (o.category === 'Interest') interestOutflows += o.actual;
        else if (o.category === 'Loan EMI') loanEMIs += o.actual;
      });
    });

    const directCosts = constructionCosts + materialPurchases + labourCosts + contractorPayments;
    const financingCosts = interestOutflows + loanEMIs;

    // Operating Inflows (All inflows except Bank Loan Disbursement and Investor Funds)
    let operatingInflow = 0;
    project.periods.forEach((p) => {
      p.inflows.forEach((i) => {
        if (i.category !== 'Bank Loan Disbursement' && i.category !== 'Investor Funds') {
          operatingInflow += i.actual;
        }
      });
    });

    // 1. Liquidity Ratios
    const currentRatioVal = payables > 0 ? (closingBalance + receivables) / payables : (closingBalance + receivables);
    const quickRatioVal = payables > 0 ? (closingBalance + receivables * 0.5) / payables : (closingBalance + receivables * 0.5);
    const cashRatioVal = payables > 0 ? closingBalance / payables : closingBalance;

    // 2. Profitability Ratios
    const grossProfitVal = totalInflow > 0 ? ((totalInflow - directCosts) / totalInflow) * 100 : 0;
    const netProfitVal = totalInflow > 0 ? ((totalInflow - totalOutflow) / totalInflow) * 100 : 0;
    const ebitdaVal = totalInflow > 0 ? ((totalInflow - (totalOutflow - financingCosts)) / totalInflow) * 100 : 0;

    // 3. Efficiency Ratios
    const assetTurnoverVal = opening > 0 ? totalInflow / opening : 0;
    const workingCapitalRatioVal = payables > 0 ? (closingBalance + receivables) / payables : 1.0;

    // 4. Cash Flow Ratios
    const ocfRatioVal = payables > 0 ? operatingInflow / payables : operatingInflow;
    const cashCoverageVal = financingCosts > 0 ? operatingInflow / financingCosts : operatingInflow;
    const fcfRatioVal = totalInflow > 0 ? ((totalInflow - directCosts) / totalInflow) * 100 : 0;

    // Helper to determine status and traffic-light color
    const getStatus = (val: number, goodLimit: number, warnLimit: number): { type: 'good' | 'warning' | 'danger'; label: string } => {
      if (val >= goodLimit) return { type: 'good', label: 'Healthy' };
      if (val >= warnLimit) return { type: 'warning', label: 'Moderate' };
      return { type: 'danger', label: 'Action Required' };
    };

    const currentRatioStatus = getStatus(currentRatioVal, 1.5, 1.0);
    const quickRatioStatus = getStatus(quickRatioVal, 1.2, 0.8);
    const cashRatioStatus = getStatus(cashRatioVal, 1.0, 0.5);

    const grossMarginStatus = getStatus(grossProfitVal, 25, 10);
    const netMarginStatus = getStatus(netProfitVal, 15, 5);
    const ebitdaStatus = getStatus(ebitdaVal, 22, 12);

    const assetTurnoverStatus = getStatus(assetTurnoverVal, 1.2, 0.6);
    const wcStatus = getStatus(workingCapitalRatioVal, 1.5, 1.0);

    const ocfStatus = getStatus(ocfRatioVal, 1.5, 1.0);
    const coverageStatus = getStatus(cashCoverageVal, 2.0, 1.2);
    const fcfStatus = getStatus(fcfRatioVal, 20, 10);

    return {
      liquidity: [
        {
          name: 'Current Ratio',
          technicalName: 'Current Assets / Current Liabilities',
          value: `${currentRatioVal.toFixed(2)}x`,
          meaning: 'Do we have enough available cash and outstanding customer bills combined to cover our immediate unpaid vendor payables?',
          status: currentRatioStatus.type,
          statusLabel: currentRatioStatus.label,
        },
        {
          name: 'Quick Ratio',
          technicalName: '(Cash + 50% Receivables) / Current Liabilities',
          value: `${quickRatioVal.toFixed(2)}x`,
          meaning: 'Measures our immediate ability to cover vendor invoices using our cash and only the most highly reliable near-term customer dues.',
          status: quickRatioStatus.type,
          statusLabel: quickRatioStatus.label,
        },
        {
          name: 'Cash Ratio',
          technicalName: 'Cash Reserves / Current Liabilities',
          value: `${cashRatioVal.toFixed(2)}x`,
          meaning: 'Can we settle all active outstanding contractor/vendor invoices today using ONLY our current checking bank account balance?',
          status: cashRatioStatus.type,
          statusLabel: cashRatioStatus.label,
        },
      ] as RatioCardData[],
      profitability: [
        {
          name: 'Gross Profit Margin',
          technicalName: '((Inflow - Direct Costs) / Inflow) * 100',
          value: `${grossProfitVal.toFixed(1)}%`,
          meaning: 'What percentage of our project revenues is retained after clearing direct structural building, steel, concrete, and labor charges?',
          status: grossMarginStatus.type,
          statusLabel: grossMarginStatus.label,
        },
        {
          name: 'Net Profit Margin',
          technicalName: '((Inflow - Total Outflow) / Inflow) * 100',
          value: `${netProfitVal.toFixed(1)}%`,
          meaning: 'Our baseline profitability: how many Rupees of pure capital reserve do we keep for every Rs. 100 collected across all periods?',
          status: netMarginStatus.type,
          statusLabel: netMarginStatus.label,
        },
        {
          name: 'EBITDA Margin',
          technicalName: '(EBITDA / Total Inflows) * 100',
          value: `${ebitdaVal.toFixed(1)}%`,
          meaning: 'The true operational cash generation rate of construction activities, completely ignoring bank interest payments or EMI loans.',
          status: ebitdaStatus.type,
          statusLabel: ebitdaStatus.label,
        },
      ] as RatioCardData[],
      efficiency: [
        {
          name: 'Asset Turnover Ratio',
          technicalName: 'Total Inflow / Opening Cash Asset Base',
          value: `${assetTurnoverVal.toFixed(2)}x`,
          meaning: 'How actively are we multiplying our starting bank balance footprint to capture sales milestones and collections?',
          status: assetTurnoverStatus.type,
          statusLabel: assetTurnoverStatus.label,
        },
        {
          name: 'Working Capital Ratio',
          technicalName: 'Current Assets / Current Liabilities',
          value: `${workingCapitalRatioVal.toFixed(2)}x`,
          meaning: 'A measure of whether the active project has a solid buffer of operational assets to fund ongoing day-to-day physical progress.',
          status: wcStatus.type,
          statusLabel: wcStatus.label,
        },
      ] as RatioCardData[],
      cashFlow: [
        {
          name: 'Operating Cash Flow Ratio',
          technicalName: 'Operating Inflow / Current Payables',
          value: `${ocfRatioVal.toFixed(2)}x`,
          meaning: 'Can our direct, recurring organic collections from home/office buyers fully pay for our ongoing vendor building bills?',
          status: ocfStatus.type,
          statusLabel: ocfStatus.label,
        },
        {
          name: 'Cash Coverage Ratio',
          technicalName: 'Operating Inflow / Financing Costs',
          value: `${cashCoverageVal.toFixed(2)}x`,
          meaning: 'How comfortably our organic sales collections cover our monthly bank financing interest fees and recurring loan EMIs.',
          status: coverageStatus.type,
          statusLabel: coverageStatus.label,
        },
        {
          name: 'Free Cash Flow Margin',
          technicalName: '(Free Cash Flow / Total Revenue) * 100',
          value: `${fcfRatioVal.toFixed(1)}%`,
          meaning: 'The proportion of total collected money left fully unencumbered to expand holdings or safeguard in reserves after building costs.',
          status: fcfStatus.type,
          statusLabel: fcfStatus.label,
        },
      ] as RatioCardData[],
    };
  }, [project]);

  const renderRatioGroup = (title: string, desc: string, groupKey: 'liquidity' | 'profitability' | 'efficiency' | 'cashFlow') => {
    const list = ratios[groupKey];
    return (
      <div className="space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <h4 className="text-sm font-bold text-gray-800 uppercase tracking-wide font-display">{title}</h4>
          <p className="text-xs text-gray-500 font-medium">{desc}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {list.map((ratio, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between hover:shadow-sm transition-all">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h5 className="font-bold text-gray-900 text-sm leading-tight">{ratio.name}</h5>
                    <span className="text-[10px] text-gray-400 font-mono block mt-0.5">{ratio.technicalName}</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      ratio.status === 'good'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : ratio.status === 'warning'
                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                        : 'bg-rose-50 text-rose-700 border border-rose-100'
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${
                      ratio.status === 'good' ? 'bg-emerald-500' : ratio.status === 'warning' ? 'bg-amber-500' : 'bg-rose-500'
                    }`} />
                    {ratio.statusLabel}
                  </span>
                </div>

                <div className="py-2.5">
                  <span className={`text-2xl font-black ${
                    ratio.status === 'good' ? 'text-emerald-600' : ratio.status === 'warning' ? 'text-amber-600' : 'text-rose-600'
                  }`}>
                    {ratio.value}
                  </span>
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3 mt-2">
                <span className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono">Plain-English Meaning</span>
                <p className="text-xs text-gray-600 font-medium leading-relaxed">{ratio.meaning}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Overview Block */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-600">
            <Scale className="h-4.5 w-4.5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-display">Live Financial Performance Ratios</h3>
            <p className="text-xs text-gray-500 font-medium">Automatic solvency, profitability, and operational risk scan computed per project.</p>
          </div>
        </div>
        <p className="text-[11px] text-gray-500 italic mt-2 border-t border-black/5 pt-2">
          Plain-English Transparency: This module simplifies complex accounting standards into simple, direct explanations so developers and builders can verify project health without a CPA degree.
        </p>
      </div>

      {renderRatioGroup('Liquidity Solvency', 'Measures physical cash availability to cover active contractor and material bill run payables.', 'liquidity')}
      {renderRatioGroup('Profitability Yield', 'Examines the rate of pure cash retention from inflows compared to construction overhead.', 'profitability')}
      {renderRatioGroup('Asset Efficiency', 'Tracks how productively the project utilizes its starting capital base to fund collections.', 'efficiency')}
      {renderRatioGroup('Cash Flow Risk', 'Direct comparison of actual operating receipts against debt-servicing and payables.', 'cashFlow')}
    </div>
  );
}
