import React, { useMemo, useState, useEffect } from 'react';
import { Project } from '../types';
import { AlertTriangle, Info, CheckCircle2, TrendingUp, Sparkles } from 'lucide-react';

interface CopilotPanelProps {
  project: Project;
}

interface Observation {
  id: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  title: string;
  desc: string;
  plainEnglish: string;
}

export default function CopilotPanel({ project }: CopilotPanelProps) {
  const [aiObservations, setAiObservations] = useState<Observation[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAiPowered, setIsAiPowered] = useState<boolean>(false);

  const localObservations = useMemo((): Observation[] => {
    const list: Observation[] = [];

    // Calculate metrics
    const totalOverdueCollections = project.collections
      .filter(c => c.status === 'Overdue')
      .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);

    const totalPendingCollections = project.collections
      .filter(c => c.status !== 'Paid')
      .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);

    // 1. Check overdue collections
    if (totalOverdueCollections > 0) {
      list.push({
        id: 'overdue-collections',
        type: 'danger',
        title: `Overdue collections stand at Rs. ${totalOverdueCollections.toFixed(2)} Lakhs`,
        desc: `Action required: ${project.collections.filter(c => c.status === 'Overdue').length} customer invoices are past their due dates.`,
        plainEnglish: 'Plain-English helper: Customers haven’t paid us on time. We need to follow up to ensure we have cash to build with.'
      });
    } else if (totalPendingCollections > 0) {
      list.push({
        id: 'pending-collections',
        type: 'info',
        title: `Pending collections: Rs. ${totalPendingCollections.toFixed(2)} Lakhs`,
        desc: 'Incoming payments are on schedule with zero overdue items.',
        plainEnglish: 'Plain-English helper: Future payments are lined up and looking healthy.'
      });
    } else {
      list.push({
        id: 'zero-receivables',
        type: 'success',
        title: 'Perfect collections status!',
        desc: 'All invoiced customer amounts have been fully collected.',
        plainEnglish: 'Plain-English helper: Every customer has paid in full. Exceptional cash incoming flow!'
      });
    }

    // 2. Budget vs Actual variances
    const construction = project.budgetVsActual.find(b => b.category === 'Construction Cost');
    if (construction && construction.actual > construction.budgeted) {
      const overrunPercent = ((construction.actual - construction.budgeted) / construction.budgeted) * 100;
      list.push({
        id: 'construction-overrun',
        type: overrunPercent > 10 ? 'danger' : 'warning',
        title: `Construction outlays are ${overrunPercent.toFixed(1)}% over budget`,
        desc: `Actual construction cost is Rs. ${construction.actual.toFixed(2)} Lakhs vs Rs. ${construction.budgeted.toFixed(2)} Lakhs planned.`,
        plainEnglish: 'Plain-English helper: Building expenses are higher than we originally planned. We should verify contractor invoices.'
      });
    }

    // 3. Material Purchase budget check
    const materials = project.budgetVsActual.find(b => b.category === 'Material Purchase');
    if (materials && materials.actual > materials.budgeted) {
      const overrunPercent = ((materials.actual - materials.budgeted) / materials.budgeted) * 100;
      list.push({
        id: 'materials-overrun',
        type: overrunPercent > 10 ? 'danger' : 'warning',
        title: `Materials expenses exceeded budget by Rs. ${(materials.actual - materials.budgeted).toFixed(2)} Lakhs`,
        desc: `Actual material procurement is Rs. ${materials.actual.toFixed(2)} Lakhs compared to Rs. ${materials.budgeted.toFixed(2)} Lakhs budgeted.`,
        plainEnglish: 'Plain-English helper: Raw materials like cement, sand, or steel cost more than expected.'
      });
    }

    // 4. Liquidity warning based on last period closing balance
    if (project.periods.length > 0) {
      const lastPeriod = project.periods[project.periods.length - 1];
      const bank = lastPeriod.bankBalance;
      const cash = lastPeriod.cashInHand;
      const totalBalance = bank + cash;

      if (totalBalance < 20.0 && totalBalance > 0) {
        list.push({
          id: 'low-liquidity',
          type: 'warning',
          title: `Low cash safety buffer: Rs. ${totalBalance.toFixed(2)} Lakhs remaining`,
          desc: 'Your available cash balance is approaching our minimum safety reserve of Rs. 20 Lakhs.',
          plainEnglish: 'Plain-English helper: Our checking account reserves are thin. We might struggle if unexpected expenses pop up.'
        });
      } else if (totalBalance <= 0) {
        list.push({
          id: 'negative-liquidity',
          type: 'danger',
          title: `Critical Cash Deficit: Rs. ${totalBalance.toFixed(2)} Lakhs`,
          desc: 'Closing balance is currently negative. Immediate capital injection or credit line draw needed.',
          plainEnglish: 'Plain-English helper: We have spent more cash than we have in the bank. This is an active financial emergency.'
        });
      } else {
        list.push({
          id: 'healthy-liquidity',
          type: 'success',
          title: `Strong available reserves: Rs. ${totalBalance.toFixed(2)} Lakhs`,
          desc: 'Cash reserves are fully funded above safety thresholds.',
          plainEnglish: 'Plain-English helper: We have plenty of cash in our bank account to handle building costs and payments.'
        });
      }
    }

    return list.slice(0, 4); // limit to max 4 observations
  }, [project]);

  useEffect(() => {
    let active = true;
    const fetchCopilotInsights = async () => {
      setIsLoading(true);
      
      const lastPeriod = project.periods[project.periods.length - 1];
      const closingBalance = lastPeriod ? (lastPeriod.bankBalance + lastPeriod.cashInHand) : 0;
      
      let totalInflow = 0;
      let totalOutflow = 0;
      project.periods.forEach((p) => {
        const pInflow = p.inflows.reduce((sum, i) => sum + (i.actual || 0), 0);
        const pOutflow = p.outflows.reduce((sum, o) => sum + (o.actual || 0), 0);
        totalInflow += pInflow;
        totalOutflow += pOutflow;
      });

      const count = project.periods.length;
      const avgInflow = count > 0 ? totalInflow / count : 0;
      const avgOutflow = count > 0 ? totalOutflow / count : 0;

      const forecast30 = {
        inflow: Number(avgInflow.toFixed(2)),
        outflow: Number(avgOutflow.toFixed(2)),
        balance: Number((closingBalance + (avgInflow - avgOutflow)).toFixed(2))
      };

      const forecast90 = {
        inflow: Number((avgInflow * 3).toFixed(2)),
        outflow: Number((avgOutflow * 3).toFixed(2)),
        balance: Number((closingBalance + (avgInflow * 3 - avgOutflow * 3)).toFixed(2))
      };

      const pendingCollections = project.collections
        .filter(c => c.status !== 'Paid')
        .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);
      const overdueCollections = project.collections
        .filter(c => c.status === 'Overdue')
        .reduce((sum, c) => sum + (c.amount - c.collectedAmount), 0);

      const pendingPayables = project.payments
        .filter(p => p.status !== 'Paid')
        .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);
      const overduePayables = project.payments
        .filter(p => p.status === 'Overdue')
        .reduce((sum, p) => sum + (p.amount - p.paidAmount), 0);

      const context = {
        projectName: project.name,
        projectStatus: project.status,
        financialYear: project.financialYear,
        openingBalance: project.periods[0] ? (project.periods[0].bankBalance + project.periods[0].cashInHand) : 0,
        totalInflow,
        totalOutflow,
        netCashFlow: totalInflow - totalOutflow,
        closingBalance,
        totalReceivables: project.collections.reduce((sum, c) => sum + c.amount, 0),
        collectedAmount: project.collections.reduce((sum, c) => sum + c.collectedAmount, 0),
        pendingCollections,
        overdueCollections,
        totalPayables: project.payments.reduce((sum, p) => sum + p.amount, 0),
        paidAmount: project.payments.reduce((sum, p) => sum + p.paidAmount, 0),
        pendingPayables,
        overduePayables,
        budgetVsActual: project.budgetVsActual,
        forecast30,
        forecast90,
        periods: project.periods.map(p => ({
          name: p.name,
          bankBalance: p.bankBalance,
          cashInHand: p.cashInHand,
          inflows: p.inflows.filter(i => i.actual > 0),
          outflows: p.outflows.filter(o => o.actual > 0)
        })),
        collections: project.collections,
        payments: project.payments
      };

      try {
        const res = await fetch('/api/copilot', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ context })
        });
        if (!res.ok) throw new Error('API issue');
        const data = await res.json();
        if (active) {
          if (data.observations && Array.isArray(data.observations)) {
            setAiObservations(data.observations);
            setIsAiPowered(data.aiPowered);
          } else {
            setAiObservations(null);
            setIsAiPowered(false);
          }
        }
      } catch (err) {
        console.warn('Fallback local co-pilot insights triggered:', err);
        if (active) {
          setAiObservations(null);
          setIsAiPowered(false);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchCopilotInsights();
    return () => {
      active = false;
    };
  }, [project]);

  const activeObservations = aiObservations || localObservations;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Real Estate Co-Pilot Insights</h3>
            <p className="text-[10px] text-gray-500">Autonomous scan of active project ledger and collections.</p>
          </div>
        </div>
        {isAiPowered && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-violet-50 text-violet-700 border border-violet-100">
            <Sparkles className="h-2.5 w-2.5 animate-pulse" />
            AI Grounded
          </span>
        )}
      </div>

      <div className="space-y-4">
        {isLoading && !aiObservations ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Running co-pilot scan...
          </div>
        ) : (
          activeObservations.map((obs) => (
            <div
              key={obs.id}
              className={`flex gap-3 p-3.5 rounded-lg border text-xs transition-all ${
                obs.type === 'danger'
                  ? 'bg-rose-50/50 border-rose-100 text-rose-950'
                  : obs.type === 'warning'
                  ? 'bg-amber-50/50 border-amber-100 text-amber-950'
                  : obs.type === 'success'
                  ? 'bg-emerald-50/50 border-emerald-100 text-emerald-950'
                  : 'bg-blue-50/50 border-blue-100 text-blue-950'
              }`}
            >
              <div className="shrink-0 mt-0.5">
                {obs.type === 'danger' && <AlertTriangle className="h-4.5 w-4.5 text-rose-600" />}
                {obs.type === 'warning' && <AlertTriangle className="h-4.5 w-4.5 text-amber-600" />}
                {obs.type === 'success' && <CheckCircle2 className="h-4.5 w-4.5 text-emerald-600" />}
                {obs.type === 'info' && <Info className="h-4.5 w-4.5 text-blue-600" />}
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-gray-900">{obs.title}</h4>
                <p className="text-gray-600 font-medium">{obs.desc}</p>
                <p className="text-[10px] text-gray-500 italic border-t border-black/5 pt-1 mt-1">
                  {obs.plainEnglish}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
