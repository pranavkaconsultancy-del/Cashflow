import React, { useMemo, useState, useEffect } from 'react';
import { Project } from '../types';
import { calculatePeriodTotals, formatCurrency } from '../utils/calculations';
import { 
  AlertTriangle, 
  Info, 
  CheckCircle2, 
  TrendingUp, 
  Sparkles, 
  Loader2, 
  ArrowUpRight,
  MessageSquare
} from 'lucide-react';

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
  const [scanError, setScanError] = useState<string | null>(null);

  // Interactive Q&A state
  const [activeQuestion, setActiveQuestion] = useState<string | null>(null);
  const [qaResponse, setQaResponse] = useState<string | null>(null);
  const [isQALoading, setIsQALoading] = useState<boolean>(false);
  const [qaError, setQaError] = useState<string | null>(null);
  const [questionInput, setQuestionInput] = useState<string>('');

  const suggestedQuestions = [
    "Why did expenses go up this month?",
    "How much do we still need to collect?",
    "Is our cash balance healthy?",
    "What changed in our bank accounts?"
  ];

  const isEmptyProject = !project.periods || project.periods.length === 0;

  // Local Rule-Based Observations fallback
  const localObservations = useMemo((): Observation[] => {
    if (isEmptyProject) {
      return [
        {
          id: 'empty-notice',
          type: 'info',
          title: 'Grounded Status',
          desc: 'Not enough data yet to generate insights — add some entries first',
          plainEnglish: 'Plain-English helper: The project is currently blank. Log a period, collections, or transactions to enable autonomous scans.'
        }
      ];
    }
    
    const list: Observation[] = [];

    const collectionsList = project.collections || [];
    const budgetVsActualList = project.budgetVsActual || [];
    const periodsList = project.periods || [];

    const totalOverdueCollections = collectionsList
      .filter(c => c.status === 'Overdue')
      .reduce((sum, c) => sum + (c.amount - (c.collectedAmount || 0)), 0);

    const totalPendingCollections = collectionsList
      .filter(c => c.status !== 'Paid')
      .reduce((sum, c) => sum + (c.amount - (c.collectedAmount || 0)), 0);

    // 1. Overdue collections
    if (totalOverdueCollections > 0) {
      list.push({
        id: 'overdue-collections',
        type: 'danger',
        title: `Overdue collections stand at ${formatCurrency(totalOverdueCollections)}`,
        desc: `Action required: ${collectionsList.filter(c => c.status === 'Overdue').length} customer invoices are past their due dates.`,
        plainEnglish: 'Plain-English helper: Customers haven’t paid us on time. We need to follow up to ensure we have cash to build with.'
      });
    } else if (totalPendingCollections > 0) {
      list.push({
        id: 'pending-collections',
        type: 'info',
        title: `Pending collections: ${formatCurrency(totalPendingCollections)}`,
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

    // 2. Budget overruns
    const construction = budgetVsActualList.find(b => b.category === 'Construction Cost');
    if (construction && construction.actual > construction.budgeted) {
      const overrunPercent = ((construction.actual - construction.budgeted) / construction.budgeted) * 100;
      list.push({
        id: 'construction-overrun',
        type: overrunPercent > 10 ? 'danger' : 'warning',
        title: `Construction outlays are ${overrunPercent.toFixed(1)}% over budget`,
        desc: `Actual construction cost is ${formatCurrency(construction.actual)} vs ${formatCurrency(construction.budgeted)} planned.`,
        plainEnglish: 'Plain-English helper: Building expenses are higher than we originally planned. We should verify contractor invoices.'
      });
    }

    const materials = budgetVsActualList.find(b => b.category === 'Material Purchase');
    if (materials && materials.actual > materials.budgeted) {
      const overrunPercent = ((materials.actual - materials.budgeted) / materials.budgeted) * 100;
      list.push({
        id: 'materials-overrun',
        type: overrunPercent > 10 ? 'danger' : 'warning',
        title: `Materials expenses exceeded budget by ${formatCurrency(materials.actual - materials.budgeted)}`,
        desc: `Actual material procurement is ${formatCurrency(materials.actual)} compared to ${formatCurrency(materials.budgeted)} budgeted.`,
        plainEnglish: 'Plain-English helper: Raw materials like cement, sand, or steel cost more than expected.'
      });
    }

    // 3. Liquidity
    if (periodsList.length > 0) {
      const lastPeriod = periodsList[periodsList.length - 1];
      const bank = lastPeriod.bankBalance || 0;
      const cash = lastPeriod.cashInHand || 0;
      const totalBalance = bank + cash;

      if (totalBalance < 2000000 && totalBalance > 0) {
        list.push({
          id: 'low-liquidity',
          type: 'warning',
          title: `Low cash safety buffer: ${formatCurrency(totalBalance)} remaining`,
          desc: `Your available cash balance is approaching our minimum safety reserve of ${formatCurrency(2000000)}.`,
          plainEnglish: 'Plain-English helper: Our checking account reserves are thin. We might struggle if unexpected expenses pop up.'
        });
      } else if (totalBalance <= 0) {
        list.push({
          id: 'negative-liquidity',
          type: 'danger',
          title: `Critical Cash Deficit: ${formatCurrency(totalBalance)}`,
          desc: 'Closing balance is currently negative. Immediate capital injection or credit line draw needed.',
          plainEnglish: 'Plain-English helper: We have spent more cash than we have in the bank. This is an active financial emergency.'
        });
      } else {
        list.push({
          id: 'healthy-liquidity',
          type: 'success',
          title: `Strong available reserves: ${formatCurrency(totalBalance)}`,
          desc: 'Cash reserves are fully funded above safety thresholds.',
          plainEnglish: 'Plain-English helper: We have plenty of cash in our bank account to handle building costs and payments.'
        });
      }
    }

    return list.slice(0, 4);
  }, [project, isEmptyProject]);

  const fetchCopilotInsights = async () => {
    if (isEmptyProject) {
      setAiObservations(null);
      setIsAiPowered(false);
      return;
    }
    setIsLoading(true);
    setScanError(null);
    
    const collectionsList = project.collections || [];
    const paymentsList = project.payments || [];
    const budgetVsActualList = project.budgetVsActual || [];
    const periodsList = project.periods || [];

    const lastPeriod = periodsList[periodsList.length - 1];
    const closingBalance = lastPeriod ? ((lastPeriod.bankBalance || 0) + (lastPeriod.cashInHand || 0)) : 0;
    
    let totalInflow = 0;
    let totalOutflow = 0;
    periodsList.forEach((p) => {
      const pInflow = (p.inflows || []).reduce((sum, i) => sum + (i.actual || 0), 0);
      const pOutflow = (p.outflows || []).reduce((sum, o) => sum + (o.actual || 0), 0);
      totalInflow += pInflow;
      totalOutflow += pOutflow;
    });

    const count = periodsList.length;
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

    const pendingCollections = collectionsList
      .filter(c => c.status !== 'Paid')
      .reduce((sum, c) => sum + (c.amount - (c.collectedAmount || 0)), 0);
    const overdueCollections = collectionsList
      .filter(c => c.status === 'Overdue')
      .reduce((sum, c) => sum + (c.amount - (c.collectedAmount || 0)), 0);

    const pendingPayables = paymentsList
      .filter(p => p.status !== 'Paid')
      .reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0);
    const overduePayables = paymentsList
      .filter(p => p.status === 'Overdue')
      .reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0);

    const context = {
      projectName: project.name,
      projectStatus: project.status,
      financialYear: project.financialYear,
      openingBalance: periodsList[0] ? ((periodsList[0].bankBalance || 0) + (periodsList[0].cashInHand || 0)) : 0,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
      closingBalance,
      totalReceivables: collectionsList.reduce((sum, c) => sum + c.amount, 0),
      collectedAmount: collectionsList.reduce((sum, c) => sum + (c.collectedAmount || 0), 0),
      pendingCollections,
      overdueCollections,
      totalPayables: paymentsList.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: paymentsList.reduce((sum, p) => sum + (p.paidAmount || 0), 0),
      pendingPayables,
      overduePayables,
      budgetVsActual: budgetVsActualList,
      forecast30,
      forecast90,
      periods: periodsList.map(p => ({
        name: p.name,
        bankBalance: p.bankBalance,
        cashInHand: p.cashInHand,
        inflows: (p.inflows || []).filter(i => i.actual > 0),
        outflows: (p.outflows || []).filter(o => o.actual > 0)
      })),
      collections: collectionsList,
      payments: paymentsList,
      transactions: project.transactions || []
    };

    try {
      const res = await fetch('/api/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ context })
      });
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || 'AI intelligence server is not responding currently');
      }
      const data = await res.json();
      if (data.observations && Array.isArray(data.observations)) {
        setAiObservations(data.observations);
        setIsAiPowered(data.aiPowered);
      } else {
        setAiObservations(null);
        setIsAiPowered(false);
      }
    } catch (err: any) {
      console.warn('Fallback local co-pilot insights triggered:', err);
      setScanError(err.message || 'Failed to complete real-time scan. Showing local ledger rules.');
      setAiObservations(null);
      setIsAiPowered(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCopilotInsights();
  }, [project.id, isEmptyProject]);

  const handleAskQuestion = async (textToSend: string) => {
    if (!textToSend.trim() || isQALoading) return;
    const userQuery = textToSend.trim();
    setActiveQuestion(userQuery);
    setQaResponse(null);
    setQaError(null);
    setIsQALoading(true);

    if (isEmptyProject) {
      // Handle brand-new/empty project question gracefully on the client side
      setTimeout(() => {
        setQaResponse("Not enough data yet to generate insights — add some entries first.\n\nWe need a logged monthly period, cash entries, or collections before the ledger analytics can be performed.");
        setIsQALoading(false);
      }, 400);
      return;
    }

    const collectionsList = project.collections || [];
    const paymentsList = project.payments || [];
    const budgetVsActualList = project.budgetVsActual || [];
    const periodsList = project.periods || [];

    const lastPeriod = periodsList[periodsList.length - 1];
    const closingBalance = lastPeriod ? ((lastPeriod.bankBalance || 0) + (lastPeriod.cashInHand || 0)) : 0;
    
    let totalInflow = 0;
    let totalOutflow = 0;
    periodsList.forEach((p) => {
      const pInflow = (p.inflows || []).reduce((sum, i) => sum + (i.actual || 0), 0);
      const pOutflow = (p.outflows || []).reduce((sum, o) => sum + (o.actual || 0), 0);
      totalInflow += pInflow;
      totalOutflow += pOutflow;
    });

    const count = periodsList.length;
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

    const pendingCollections = collectionsList
      .filter(c => c.status !== 'Paid')
      .reduce((sum, c) => sum + (c.amount - (c.collectedAmount || 0)), 0);
    const overdueCollections = collectionsList
      .filter(c => c.status === 'Overdue')
      .reduce((sum, c) => sum + (c.amount - (c.collectedAmount || 0)), 0);

    const pendingPayables = paymentsList
      .filter(p => p.status !== 'Paid')
      .reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0);
    const overduePayables = paymentsList
      .filter(p => p.status === 'Overdue')
      .reduce((sum, p) => sum + (p.amount - (p.paidAmount || 0)), 0);

    const context = {
      projectName: project.name,
      projectStatus: project.status,
      financialYear: project.financialYear,
      openingBalance: periodsList[0] ? ((periodsList[0].bankBalance || 0) + (periodsList[0].cashInHand || 0)) : 0,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
      closingBalance,
      totalReceivables: collectionsList.reduce((sum, c) => sum + c.amount, 0),
      collectedAmount: collectionsList.reduce((sum, c) => sum + (c.collectedAmount || 0), 0),
      pendingCollections,
      overdueCollections,
      totalPayables: paymentsList.reduce((sum, p) => sum + p.amount, 0),
      paidAmount: paymentsList.reduce((sum, p) => sum + (p.paidAmount || 0), 0),
      pendingPayables,
      overduePayables,
      budgetVsActual: budgetVsActualList,
      forecast30,
      forecast90,
      periods: periodsList.map(p => ({
        name: p.name,
        bankBalance: p.bankBalance,
        cashInHand: p.cashInHand,
        inflows: (p.inflows || []).filter(i => i.actual > 0),
        outflows: (p.outflows || []).filter(o => o.actual > 0)
      })),
      collections: collectionsList,
      payments: paymentsList,
      transactions: project.transactions || []
    };

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: userQuery, context })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.error || 'Q&A endpoint failed to answer');
      }

      const data = await response.json();
      setQaResponse(data.text || 'No response details returned from assistant.');
    } catch (err: any) {
      console.error(err);
      setQaError(`Failed to retrieve response: ${err.message || 'Verify server or internet connection.'}`);
    } finally {
      setIsQALoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim()) return;
    handleAskQuestion(questionInput);
    setQuestionInput('');
  };

  const handleClearAnswer = () => {
    setActiveQuestion(null);
    setQaResponse(null);
    setQaError(null);
  };

  const activeObservations = aiObservations || localObservations;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <TrendingUp className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900">Real Estate Co-Pilot Insights</h3>
            <p className="text-[10px] text-gray-500">Autonomous scan of active project ledger and collections.</p>
          </div>
        </div>
        {(isAiPowered && !isEmptyProject) && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-violet-50 text-violet-700 border border-violet-100 animate-in fade-in">
            <Sparkles className="h-2.5 w-2.5 animate-pulse" />
            AI Grounded
          </span>
        )}
      </div>

      {/* Error Message if Scan Fails */}
      {scanError && !isEmptyProject && (
        <div className="flex items-center justify-between p-3.5 bg-rose-50 border border-rose-100 rounded-lg text-xs text-rose-950">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="h-4.5 w-4.5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Co-Pilot Scan Notice</p>
              <p className="text-gray-600 text-[11px] font-medium mt-0.5">{scanError}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setScanError(null);
              fetchCopilotInsights();
            }}
            className="shrink-0 bg-white hover:bg-rose-100 border border-rose-200 text-rose-950 font-bold px-2.5 py-1 rounded text-[10px] cursor-pointer transition-all"
          >
            Retry Scan
          </button>
        </div>
      )}

      {/* Proactive Observations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {isLoading && !aiObservations ? (
          <div className="col-span-full py-8 text-center text-xs text-gray-400 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <span>Running co-pilot scan...</span>
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
                <p className="text-gray-600 font-medium leading-relaxed">{obs.desc}</p>
                <p className="text-[10px] text-gray-500 italic border-t border-black/5 pt-1 mt-1 leading-normal">
                  {obs.plainEnglish}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-gray-150 pt-4 mt-1">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-violet-600" />
          <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Interactive Ledger Consult</h4>
        </div>
        <p className="text-[11px] text-gray-500 mb-3">
          Ask any specific question about your customer collections, material/construction expenditures, or bank accounts below:
        </p>

        {/* Suggested Question Chips */}
        <div className="flex flex-wrap gap-2 mb-3.5">
          {suggestedQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleAskQuestion(q)}
              disabled={isQALoading}
              className="bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 hover:text-gray-900 font-semibold px-2.5 py-1 rounded-full text-[10px] transition-all cursor-pointer disabled:opacity-50 flex items-center gap-1"
            >
              <span>{q}</span>
              <ArrowUpRight className="h-2.5 w-2.5 opacity-50" />
            </button>
          ))}
        </div>

        {/* Q&A Active Dialogue Box */}
        {activeQuestion && (
          <div className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 mb-4 space-y-2.5 animate-in fade-in duration-200">
            <div className="flex justify-between items-center gap-2 border-b border-slate-200/60 pb-2">
              <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">
                Investigating: "{activeQuestion}"
              </span>
              <button 
                onClick={handleClearAnswer}
                className="text-gray-400 hover:text-gray-700 text-xs font-bold shrink-0 cursor-pointer"
              >
                Clear
              </button>
            </div>
            
            {isQALoading ? (
              <div className="flex items-center gap-2 text-xs text-gray-500 py-2 font-medium">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                <span>Co-pilot is analyzing cash flow entries & ledger files...</span>
              </div>
            ) : qaError ? (
              <div className="text-xs text-rose-700 font-medium p-3 bg-rose-50 border border-rose-100 rounded-lg whitespace-pre-wrap">
                {qaError}
              </div>
            ) : (
              <div className="text-xs text-gray-800 leading-relaxed font-medium whitespace-pre-wrap max-h-80 overflow-y-auto pr-1">
                {qaResponse}
              </div>
            )}
          </div>
        )}

        {/* Free-form Input Form */}
        <form onSubmit={handleFormSubmit} className="flex gap-2">
          <input
            type="text"
            placeholder="Ask anything (e.g., 'did any account balance change significantly?')..."
            value={questionInput}
            onChange={(e) => setQuestionInput(e.target.value)}
            disabled={isQALoading}
            className="flex-1 bg-gray-50 border border-gray-200 focus:border-blue-500 rounded-lg px-3.5 py-2 text-xs font-medium focus:ring-1 focus:ring-blue-500 focus:bg-white outline-hidden transition-all disabled:opacity-75"
          />
          <button
            type="submit"
            disabled={isQALoading || !questionInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer shadow-xs disabled:opacity-50 transition-all shrink-0 flex items-center gap-1"
          >
            {isQALoading && <Loader2 className="h-3 w-3 animate-spin" />}
            <span>Consult AI</span>
          </button>
        </form>
      </div>
    </div>
  );
}
