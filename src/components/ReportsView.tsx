import React, { useState, useRef, useMemo } from 'react';
import { Project } from '../types';
import { calculatePeriodTotals } from '../utils/calculations';
import { FileText, Download, Printer, Loader2, Landmark, CheckCircle, AlertCircle, Sparkles } from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

// Helper to convert OKLCH and OKLab to RGB format to prevent html2canvas failures on Tailwind v4
function cleanOklchString(cssOklch: string): string {
  try {
    return cssOklch.replace(/(oklch|oklab)\(([^)]+)\)/gi, (fullMatch, colorType, inner) => {
      const normalized = inner.replace(/\//g, ' / ').trim();
      const parts = normalized.split(/[\s,]+/);
      if (parts.length < 3) return 'rgb(37, 99, 235)'; // Default blue
      
      let lStr = parts[0];
      let cOrAStr = parts[1]; // Chroma for oklch, 'a' for oklab
      let hOrBStr = parts[2]; // Hue for oklch, 'b' for oklab
      let aStr = parts[4] || '1';
      
      const slashIndex = parts.indexOf('/');
      if (slashIndex !== -1 && parts[slashIndex + 1]) {
        aStr = parts[slashIndex + 1];
      }
      
      let l = parseFloat(lStr);
      let cOrA = parseFloat(cOrAStr);
      let hOrB = parseFloat(hOrBStr);
      let alpha = parseFloat(aStr);
      
      if (isNaN(l) || isNaN(cOrA) || isNaN(hOrB)) return 'rgb(37, 99, 235)';
      
      if (lStr.includes('%')) l /= 100;
      if (cOrAStr.includes('%') && colorType.toLowerCase() === 'oklch') cOrA /= 100;
      if (aStr.includes('%')) alpha /= 100;
      if (isNaN(alpha)) alpha = 1;

      let labA = 0;
      let labB = 0;

      if (colorType.toLowerCase() === 'oklch') {
        // Convert OKLCH -> OKLab
        const hRad = (hOrB * Math.PI) / 180;
        labA = cOrA * Math.cos(hRad);
        labB = cOrA * Math.sin(hRad);
      } else {
        // Already OKLab
        labA = cOrA;
        labB = hOrB;
      }

      // Convert OKLab -> LMS -> Linear sRGB -> Gamma corrected sRGB
      const l_ = l + 0.3963377774 * labA + 0.2158037573 * labB;
      const m_ = l - 0.1055613458 * labA - 0.0638541728 * labB;
      const s_ = l - 0.0894841775 * labA - 1.2914855480 * labB;

      const l3 = l_ * l_ * l_;
      const m3 = m_ * m_ * m_;
      const s3 = s_ * s_ * s_;

      const rL = +4.0767416621 * l3 - 3.3077115913 * m3 + 0.2309699292 * s3;
      const gL = -1.2684380046 * l3 + 2.6097574011 * m3 - 0.3413193965 * s3;
      const bL = -0.0041960863 * l3 - 0.7034186147 * m3 + 1.7076147010 * s3;

      const f = (x: number) => {
        if (isNaN(x)) return 0;
        return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
      };

      const r = Math.max(0, Math.min(255, Math.round(f(rL) * 255)));
      const g = Math.max(0, Math.min(255, Math.round(f(gL) * 255)));
      const b = Math.max(0, Math.min(255, Math.round(f(bL) * 255)));

      if (alpha === 1) {
        return `rgb(${r}, ${g}, ${b})`;
      } else {
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
      }
    });
  } catch {
    return 'rgb(37, 99, 235)';
  }
}

interface ReportsViewProps {
  project: Project;
  projects: Project[];
}

export default function ReportsView({ project, projects }: ReportsViewProps) {
  const [reportType, setReportType] = useState<'statement' | 'monthly' | 'project-wise'>('statement');
  const [selectedPeriodId, setSelectedPeriodId] = useState<string>(project.periods[0]?.id || 'all');
  const [companyName, setCompanyName] = useState('Vanguard Real Estate Developers');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync selected period if not found in current project
  const activePeriod = useMemo(() => {
    return project.periods.find((p) => p.id === selectedPeriodId) || project.periods[0];
  }, [project.periods, selectedPeriodId]);

  // Aggregate project data for summary tables
  const statementTotals = useMemo(() => {
    let opening = project.periods[0] ? (project.periods[0].bankBalance + project.periods[0].cashInHand) : 0;
    let totalInflow = 0;
    let totalOutflow = 0;

    project.periods.forEach((p) => {
      const t = calculatePeriodTotals(p);
      totalInflow += t.totalInflow;
      totalOutflow += t.totalOutflow;
    });

    return {
      opening,
      totalInflow,
      totalOutflow,
      netCashFlow: totalInflow - totalOutflow,
      closing: opening + (totalInflow - totalOutflow)
    };
  }, [project.periods]);

  // Compute live performance metrics for the PDF Report
  const metrics = useMemo(() => {
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

    // Operating Inflows
    let operatingInflow = 0;
    project.periods.forEach((p) => {
      p.inflows.forEach((i) => {
        if (i.category !== 'Bank Loan Disbursement' && i.category !== 'Investor Funds') {
          operatingInflow += i.actual;
        }
      });
    });

    // 1. Liquidity
    const currentRatio = payables > 0 ? (closingBalance + receivables) / payables : (closingBalance + receivables);
    const quickRatio = payables > 0 ? (closingBalance + receivables * 0.5) / payables : (closingBalance + receivables * 0.5);
    const cashRatio = payables > 0 ? closingBalance / payables : closingBalance;

    // 2. Profitability
    const grossProfit = totalInflow > 0 ? ((totalInflow - directCosts) / totalInflow) * 100 : 0;
    const netProfit = totalInflow > 0 ? ((totalInflow - totalOutflow) / totalInflow) * 100 : 0;
    const ebitda = totalInflow > 0 ? ((totalInflow - (totalOutflow - financingCosts)) / totalInflow) * 100 : 0;

    // 3. Efficiency & Flow
    const assetTurnover = opening > 0 ? totalInflow / opening : 0;
    const ocfRatio = payables > 0 ? operatingInflow / payables : operatingInflow;

    // 4. Moving Average Forecast
    const count = project.periods.length || 1;
    const avgInflow = totalInflow / count;
    const avgOutflow = totalOutflow / count;
    const forecast30Balance = closingBalance + (avgInflow - avgOutflow);
    const forecast90Balance = closingBalance + (avgInflow * 3 - avgOutflow * 3);

    // Observations list
    const listRecs = [];
    if (receivables > 0) {
      listRecs.push(`Prioritize collection follow-ups to reclaim Rs. ${receivables.toFixed(1)} L milestone receivables.`);
    }
    if (directCosts > totalInflow * 0.6) {
      listRecs.push(`Optimize contractor bidding; cumulative construction direct costs are pacing high at Rs. ${directCosts.toFixed(1)} L.`);
    }
    if (payables > 0) {
      listRecs.push(`Negotiate deferred vendor payments for Rs. ${payables.toFixed(1)} L to preserve available cash reserves.`);
    }
    if (forecast30Balance < 20) {
      listRecs.push('Postpone non-essential operations overhead inside the next 30 days to mitigate cash reserve shortages.');
    }
    if (listRecs.length === 0) {
      listRecs.push('Project displays stellar solvency; continue regular scheduled project construction milestones.');
    }

    return {
      currentRatio,
      quickRatio,
      cashRatio,
      grossProfit,
      netProfit,
      ebitda,
      assetTurnover,
      ocfRatio,
      forecast30Balance,
      forecast90Balance,
      listRecs,
      receivables,
      payables
    };
  }, [project]);

  // 1. SheetJS Excel Export
  const handleExportExcel = () => {
    try {
      const workbook = XLSX.utils.book_new();

      // Sheet 1: Project Financial Summary
      const summaryData = [
        { Metric: 'Project Name', Value: project.name },
        { Metric: 'Financial Year', Value: project.financialYear },
        { Metric: 'Status', Value: project.status },
        { Metric: 'Opening Balance (Base)', Value: `Rs. ${statementTotals.opening.toFixed(2)} Lakhs` },
        { Metric: 'Aggregate Inflows', Value: `Rs. ${statementTotals.totalInflow.toFixed(2)} Lakhs` },
        { Metric: 'Aggregate Outflows', Value: `Rs. ${statementTotals.totalOutflow.toFixed(2)} Lakhs` },
        { Metric: 'Net Cumulative Cash Flow', Value: `Rs. ${statementTotals.netCashFlow.toFixed(2)} Lakhs` },
        { Metric: 'Project Closing Position', Value: `Rs. ${statementTotals.closing.toFixed(2)} Lakhs` }
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(workbook, summarySheet, 'Project Summary');

      // Sheet 2: Monthly Cash Flow Ledgers
      const ledgerData: any[] = [];
      project.periods.forEach((p) => {
        const t = calculatePeriodTotals(p);
        ledgerData.push({
          'Month/Period': p.name,
          'Bank Opening Balance': p.bankBalance,
          'Cash In Hand Opening': p.cashInHand,
          'Total Monthly Inflows': t.totalInflow,
          'Total Monthly Outflows': t.totalOutflow,
          'Net Monthly Flow': t.netCashFlow,
          'Closing Balance Position': t.closingBalance
        });
      });
      const ledgerSheet = XLSX.utils.json_to_sheet(ledgerData);
      XLSX.utils.book_append_sheet(workbook, ledgerSheet, 'Monthly Cash Flow');

      // Sheet 3: Customer Receivables Ledger
      const custData = project.collections.map((c) => ({
        'Customer Name': c.customerName,
        'Invoiced Milestone Amount': c.amount,
        'Amount Collected': c.collectedAmount,
        'Pending Receivable': c.amount - c.collectedAmount,
        'Payment Due Date': c.dueDate,
        Status: c.status
      }));
      const custSheet = XLSX.utils.json_to_sheet(custData);
      XLSX.utils.book_append_sheet(workbook, custSheet, 'Customer Collections');

      // Sheet 4: Vendor Payables Ledger
      const vendData = project.payments.map((p) => ({
        'Vendor Name': p.vendorName,
        'Invoiced Bill Amount': p.amount,
        'Amount Paid': p.paidAmount,
        'Pending Payable Balance': p.amount - p.paidAmount,
        'Bill Due Date': p.dueDate,
        Status: p.status
      }));
      const vendSheet = XLSX.utils.json_to_sheet(vendData);
      XLSX.utils.book_append_sheet(workbook, vendSheet, 'Vendor Payables');

      // Write and trigger download
      const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `CashFlow_Sheet_${project.name.replace(/\s+/g, '_')}.xlsx`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      console.error(err);
      alert('Failed to generate Excel download: ' + err.message);
    }
  };

  // 2. jsPDF + html2canvas PDF Export (with live status loading spinner)
  const handleExportPDF = async () => {
    if (!printAreaRef.current) return;
    setIsGenerating(true);
    setErrorMsg(null);

    const originalGetComputedStyle = window.getComputedStyle;

    // Helper to proxy style declarations to filter out oklch/oklab values
    const makeStyleProxy = (style: CSSStyleDeclaration) => {
      return new Proxy(style, {
        get(target, prop) {
          if (prop === 'getPropertyValue') {
            return function(propertyName: string) {
              const val = target.getPropertyValue(propertyName);
              if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                return cleanOklchString(val);
              }
              return val;
            };
          }
          
          const val = target[prop as any];
          if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
            return cleanOklchString(val);
          }
          if (typeof val === 'function') {
            return (val as any).bind(target);
          }
          return val;
        }
      });
    };

    try {
      // Intercept host window's getComputedStyle globally during render
      window.getComputedStyle = function(elt, pseudoElt) {
        const style = originalGetComputedStyle.call(window, elt, pseudoElt);
        return makeStyleProxy(style) as any;
      };

      // Small timeout to allow render states to settle
      await new Promise((resolve) => setTimeout(resolve, 500));

      const element = printAreaRef.current;
      const canvas = await html2canvas(element, {
        scale: 2, // Retain crystal clear sharp display typography
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        onclone: (clonedDoc) => {
          // A. Rewrite all style tags inside the cloned document
          const styleTags = clonedDoc.getElementsByTagName('style');
          for (let i = 0; i < styleTags.length; i++) {
            const styleTag = styleTags[i];
            if (styleTag.textContent) {
              styleTag.textContent = cleanOklchString(styleTag.textContent);
            }
          }

          // B. Monkeypatch getComputedStyle on the cloned window default view
          const clonedWindow = clonedDoc.defaultView;
          if (clonedWindow) {
            const originalClonedGetComputedStyle = clonedWindow.getComputedStyle;
            clonedWindow.getComputedStyle = function(elt, pseudoElt) {
              const style = originalClonedGetComputedStyle.call(clonedWindow, elt, pseudoElt);
              return makeStyleProxy(style) as any;
            };
          }

          // C. Parallel-traverse original and cloned elements to rewrite inline styles
          const originalTarget = printAreaRef.current;
          const clonedTarget = clonedDoc.getElementById('printable-report-area');
          if (originalTarget && clonedTarget) {
            const originalElts = [originalTarget, ...Array.from(originalTarget.getElementsByTagName('*'))];
            const clonedElts = [clonedTarget, ...Array.from(clonedTarget.getElementsByTagName('*'))];
            
            const colorProps = [
              'color',
              'backgroundColor',
              'borderColor',
              'borderTopColor',
              'borderRightColor',
              'borderBottomColor',
              'borderLeftColor',
              'fill',
              'stroke',
              'outlineColor',
              'boxShadow',
              'textShadow',
              'backgroundImage'
            ];

            const limit = Math.min(originalElts.length, clonedElts.length);
            for (let i = 0; i < limit; i++) {
              const orig = originalElts[i] as HTMLElement;
              const clone = clonedElts[i] as HTMLElement;
              
              if (orig && clone) {
                const computed = window.getComputedStyle(orig);
                for (const prop of colorProps) {
                  try {
                    const val = computed[prop as any];
                    if (typeof val === 'string' && (val.includes('oklch') || val.includes('oklab'))) {
                      const cleaned = cleanOklchString(val);
                      clone.style[prop as any] = cleaned;
                    }
                  } catch (e) {
                    // ignore style write errors
                  }
                }
              }
            }
          }

          // D. Extra fallback: strip main container color to guarantee dark contrast if background went white
          if (clonedTarget) {
            clonedTarget.style.color = '#111827';
          }
        }
      });

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const imgHeight = (canvasHeight * pdfWidth) / canvasWidth;

      let heightLeft = imgHeight;
      let position = 0;

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
      heightLeft -= pdfHeight;

      // Wrap onto subsequent pages if table flows long
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
        heightLeft -= pdfHeight;
      }

      const periodName = reportType === 'monthly' && activePeriod ? activePeriod.name : 'FullStatement';
      pdf.save(`CashFlow_Report_${project.name.replace(/\s+/g, '_')}_${periodName}.pdf`);
    } catch (err: any) {
      console.error('PDF Generation Failure:', err);
      setErrorMsg(err.message || 'Unknown render engine error.');
    } finally {
      window.getComputedStyle = originalGetComputedStyle;
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Settings Block */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-display uppercase">Executive Financial Report Room</h3>
            <p className="text-xs text-gray-500">Produce and export audit-ready financial statements for lenders and equity partners.</p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExportExcel}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-250 hover:bg-gray-50 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer shadow-xs"
            >
              <Download className="h-4 w-4 text-gray-400" />
              <span>Export Excel</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isGenerating}
              className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer disabled:opacity-40 shadow-xs"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating PDF...</span>
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  <span>Download PDF Report</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Error banner if any */}
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-900 text-xs rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>PDF Engine failed to render: {errorMsg}. Please try standard Excel export instead.</span>
          </div>
        )}

        {/* Controls Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-gray-150 pt-4">
          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Company / Group Name</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Report Scope</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value as any)}
              className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs text-gray-700"
            >
              <option value="statement">Cash Flow Statement (All-Time Project aggregate)</option>
              <option value="monthly">Monthly Cash Flow Breakdown</option>
              <option value="project-wise">Project-wise Comparative Statement</option>
            </select>
          </div>

          {reportType === 'monthly' && (
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Select Month</label>
              <select
                value={selectedPeriodId}
                onChange={(e) => setSelectedPeriodId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs text-gray-700"
              >
                {project.periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Printable Report Preview Container */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 shadow-sm font-sans" id="printable-report-area" ref={printAreaRef}>
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header Banner */}
          <div className="border-b-2 border-blue-600 pb-5 flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase tracking-widest font-mono">{companyName}</span>
              <h2 className="text-2xl font-black text-gray-900 font-display mt-1">Real Estate Project Financial Report</h2>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-500 font-medium mt-1">
                <Landmark className="h-4 w-4" />
                Active Scope: <strong className="text-gray-900">{project.name}</strong>
              </span>
            </div>
            <div className="text-right">
              <span className="block text-[10px] font-mono uppercase text-gray-400 tracking-wider">Report Date</span>
              <span className="text-xs font-bold text-gray-900">{new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="block text-[10px] text-gray-400 font-semibold uppercase mt-1 font-mono">Currency: Rs. Lakhs</span>
            </div>
          </div>

          {/* Statement Layout */}
          {reportType === 'statement' && (
            <div className="space-y-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Cumulative Cash Flow Statement</h4>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 text-center">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono font-bold">Base Opening Balance</span>
                  <span className="block text-base font-black text-gray-900 mt-1">Rs. {statementTotals.opening.toFixed(2)} L</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 text-center">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono font-bold">Aggregate Inflows</span>
                  <span className="block text-base font-black text-emerald-600 mt-1">Rs. {statementTotals.totalInflow.toFixed(2)} L</span>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-150 text-center">
                  <span className="text-[9px] text-gray-400 uppercase tracking-wider font-mono font-bold">Aggregate Outflows</span>
                  <span className="block text-base font-black text-rose-600 mt-1">Rs. {statementTotals.totalOutflow.toFixed(2)} L</span>
                </div>
                <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100 text-center">
                  <span className="text-[9px] text-blue-800 uppercase tracking-wider font-mono font-bold">Project Closing Balance</span>
                  <span className="block text-base font-black text-blue-900 mt-1">Rs. {statementTotals.closing.toFixed(2)} L</span>
                </div>
              </div>

              {/* Monthly ledger overview table */}
              <div className="border border-gray-200 rounded-xl overflow-hidden mt-6">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-mono border-b border-gray-200">
                      <th className="py-3 px-4 font-semibold">Month/Period Name</th>
                      <th className="py-3 px-4 font-semibold">Opening Balance</th>
                      <th className="py-3 px-4 font-semibold">Total Inflows</th>
                      <th className="py-3 px-4 font-semibold">Total Outflows</th>
                      <th className="py-3 px-4 font-semibold">Net Cash Flow</th>
                      <th className="py-3 px-4 font-semibold text-right">Closing Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {project.periods.map((p) => {
                      const t = calculatePeriodTotals(p);
                      return (
                        <tr key={p.id} className="hover:bg-gray-50/30">
                          <td className="py-3 px-4 font-bold text-gray-900">{p.name}</td>
                          <td className="py-3 px-4">Rs. {t.openingBalance.toFixed(2)} L</td>
                          <td className="py-3 px-4 text-emerald-600 font-semibold">+ Rs. {t.totalInflow.toFixed(2)} L</td>
                          <td className="py-3 px-4 text-rose-600 font-semibold">- Rs. {t.totalOutflow.toFixed(2)} L</td>
                          <td className={`py-3 px-4 font-bold ${t.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                            Rs. {t.netCashFlow.toFixed(2)} L
                          </td>
                          <td className="py-3 px-4 font-bold text-gray-800 text-right">Rs. {t.closingBalance.toFixed(2)} L</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* SECTION: LIVE FINANCIAL RATIOS FOR AUDIT */}
              <div className="space-y-3 pt-4 break-inside-avoid">
                <h5 className="text-[10px] font-bold text-blue-700 uppercase tracking-widest font-mono">Live Financial Ratios Statement</h5>
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-700 uppercase tracking-wider text-[9px] font-mono border-b border-gray-200">
                        <th className="py-2.5 px-4 font-semibold">Technical Ratio Name</th>
                        <th className="py-2.5 px-4 font-semibold">Accounting Formula</th>
                        <th className="py-2.5 px-4 font-semibold">Live Score</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Solvency Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      <tr>
                        <td className="py-2 px-4 font-semibold">Current Solvency Ratio</td>
                        <td className="py-2 px-4 font-mono text-[10px]">Current Assets / Liabilities</td>
                        <td className="py-2 px-4 font-bold text-gray-900">{metrics.currentRatio.toFixed(2)}x</td>
                        <td className="py-2 px-4 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700">
                            {metrics.currentRatio >= 1.5 ? 'Healthy' : 'Squeeze'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-semibold">Quick Cash Acid-Test</td>
                        <td className="py-2 px-4 font-mono text-[10px]">(Cash + 50% Rec) / Payables</td>
                        <td className="py-2 px-4 font-bold text-gray-900">{metrics.quickRatio.toFixed(2)}x</td>
                        <td className="py-2 px-4 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700">
                            {metrics.quickRatio >= 1.2 ? 'Healthy' : 'Squeeze'}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-semibold">Gross Profit Yield</td>
                        <td className="py-2 px-4 font-mono text-[10px]">((Inflow - Direct) / Inflow) * 100</td>
                        <td className="py-2 px-4 font-bold text-emerald-600">{metrics.grossProfit.toFixed(1)}%</td>
                        <td className="py-2 px-4 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700">Operational</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-semibold">Net Retained Margin</td>
                        <td className="py-2 px-4 font-mono text-[10px]">((Net Flow) / Inflow) * 100</td>
                        <td className="py-2 px-4 font-bold text-blue-600">{metrics.netProfit.toFixed(1)}%</td>
                        <td className="py-2 px-4 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-blue-50 text-blue-700">Aggregate</span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 px-4 font-semibold">Operating Cash Flow Ratio</td>
                        <td className="py-2 px-4 font-mono text-[10px]">Op Inflow / Payables</td>
                        <td className="py-2 px-4 font-bold text-gray-900">{metrics.ocfRatio.toFixed(2)}x</td>
                        <td className="py-2 px-4 text-right">
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase bg-emerald-50 text-emerald-700">
                            {metrics.ocfRatio >= 1.0 ? 'Covered' : 'Exposed'}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION: FUTURE FORECAST RUNWAY ANALYSIS */}
              <div className="space-y-3 pt-4 break-inside-avoid">
                <h5 className="text-[10px] font-bold text-purple-700 uppercase tracking-widest font-mono">30-Day and 90-Day Forecast Projections</h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg">
                    <span className="text-[9px] text-gray-400 font-mono font-bold uppercase block">30-Day Predictive Cash Balance</span>
                    <span className="text-sm font-black text-blue-800 mt-1 block">Rs. {metrics.forecast30Balance.toFixed(2)} Lakhs</span>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      {metrics.forecast30Balance < 20
                        ? 'CRITICAL WARNING: Balances fall below safety margins inside 30 days.'
                        : 'Checking balance is on track to stay healthy and above Safety Buffers.'}
                    </p>
                  </div>

                  <div className="bg-slate-50 border border-slate-150 p-3.5 rounded-lg">
                    <span className="text-[9px] text-gray-400 font-mono font-bold uppercase block">90-Day Predictive Cash Balance</span>
                    <span className="text-sm font-black text-indigo-800 mt-1 block">Rs. {metrics.forecast90Balance.toFixed(2)} Lakhs</span>
                    <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                      {metrics.forecast90Balance < 20
                        ? 'CRITICAL WARNING: Long-term cash reserve deficit predicted within 3 months.'
                        : 'Long-term operational liquidity remains highly stable.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* SECTION: AUDIT OBSERVATIONS AND GROUNDED ACTIONS */}
              <div className="space-y-3 pt-4 break-inside-avoid">
                <h5 className="text-[10px] font-bold text-amber-700 uppercase tracking-widest font-mono">Management Key Observations & Recommendations</h5>
                <div className="bg-amber-50/40 border border-amber-200 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-amber-800 font-bold font-mono">
                    <Sparkles className="h-4 w-4 text-amber-600" />
                    <span>GROUNDED SYSTEM DIRECTIVES</span>
                  </div>
                  <ul className="list-decimal list-inside space-y-2 text-xs text-gray-700 font-medium">
                    {metrics.listRecs.map((rec, idx) => (
                      <li key={idx} className="leading-relaxed pl-1">{rec}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* Monthly Report Layout */}
          {reportType === 'monthly' && activePeriod && (
            <div className="space-y-6">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Monthly Cash Flow Breakdown ({activePeriod.name})</h4>
                <span className="text-xs font-semibold text-gray-600 font-mono">Selected Period: {activePeriod.name}</span>
              </div>

              {/* Inflow categories */}
              <div className="space-y-3">
                <h5 className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest font-mono">Receipts & Cash Inflow</h5>
                <div className="border border-gray-150 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-emerald-50/40 text-emerald-800 uppercase tracking-wider text-[9px] font-mono border-b border-gray-200">
                        <th className="py-2.5 px-4 font-semibold">Category</th>
                        <th className="py-2.5 px-4 font-semibold">Planned Budget</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Actual Collected</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {activePeriod.inflows.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-4 font-semibold">{item.category}</td>
                          <td className="py-2.5 px-4">Rs. {item.budgeted.toFixed(2)} L</td>
                          <td className="py-2.5 px-4 font-bold text-emerald-600 text-right">Rs. {item.actual.toFixed(2)} L</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Outflow categories */}
              <div className="space-y-3 pt-4">
                <h5 className="text-[10px] font-bold text-rose-700 uppercase tracking-widest font-mono">Expenditures & Outflows</h5>
                <div className="border border-gray-150 rounded-lg overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-rose-50/40 text-rose-800 uppercase tracking-wider text-[9px] font-mono border-b border-gray-200">
                        <th className="py-2.5 px-4 font-semibold">Category</th>
                        <th className="py-2.5 px-4 font-semibold">Planned Budget</th>
                        <th className="py-2.5 px-4 font-semibold text-right">Actual Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-gray-700">
                      {activePeriod.outflows.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-4 font-semibold">{item.category}</td>
                          <td className="py-2.5 px-4">Rs. {item.budgeted.toFixed(2)} L</td>
                          <td className="py-2.5 px-4 font-bold text-rose-600 text-right">Rs. {item.actual.toFixed(2)} L</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Project-wise Report Layout */}
          {reportType === 'project-wise' && (
            <div className="space-y-6">
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Comparative Project Dashboard</h4>
              
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[10px] font-mono border-b border-gray-200">
                      <th className="py-3 px-4 font-semibold">Project Name</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Periods Logged</th>
                      <th className="py-3 px-4 font-semibold">Opening Position</th>
                      <th className="py-3 px-4 font-semibold">Total Outlays</th>
                      <th className="py-3 px-4 font-semibold text-right">Closing Position</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-gray-700">
                    {projects.map((proj) => {
                      const baseOpen = proj.periods[0] ? (proj.periods[0].bankBalance + proj.periods[0].cashInHand) : 0;
                      const totalIn = proj.periods.reduce((sum, p) => sum + p.inflows.reduce((s, i) => s + i.actual, 0), 0);
                      const totalOut = proj.periods.reduce((sum, p) => sum + p.outflows.reduce((s, o) => s + o.actual, 0), 0);
                      const closing = baseOpen + (totalIn - totalOut);
                      
                      return (
                        <tr key={proj.id} className="hover:bg-gray-50/30">
                          <td className="py-3 px-4 font-bold text-gray-900">{proj.name}</td>
                          <td className="py-3 px-4 font-semibold">{proj.status}</td>
                          <td className="py-3 px-4 font-mono font-bold text-gray-400">{proj.periods.length} months</td>
                          <td className="py-3 px-4">Rs. {baseOpen.toFixed(2)} L</td>
                          <td className="py-3 px-4 font-medium text-rose-600">Rs. {totalOut.toFixed(2)} L</td>
                          <td className="py-3 px-4 font-bold text-blue-800 text-right">Rs. {closing.toFixed(2)} L</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Verification disclaimer */}
          <div className="border-t border-gray-150 pt-5 text-[10px] text-gray-400 text-center leading-relaxed">
            <p>CONFIDENTIAL REPORT FOR INTERNAL MANAGEMENT USE ONLY. PREPARED AUTONOMOUSLY BY THE VANGUARD REAL ESTATE PORTFOLIO ENGINE.</p>
            <p className="mt-1">Values computed are in Indian Rupees (Lakhs) where 1 Lakh is equivalent to ₹1,00,000.</p>
          </div>

        </div>
      </div>
    </div>
  );
}
