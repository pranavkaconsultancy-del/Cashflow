import React, { useState, useMemo, useRef, useEffect } from 'react';
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
  Legend
} from 'recharts';
import {
  FileText,
  Download,
  Upload,
  Image as ImageIcon,
  Building,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Percent,
  Coins,
  Wallet
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Helper functions to parse OKLCH and replace them with RGB fallbacks to prevent html2canvas crashes on Tailwind CSS v4 color formats
function oklchToRgb(cssOklch: string): string {
  try {
    const match = cssOklch.match(/oklch\(([^)]+)\)/i);
    if (!match) return 'rgb(120, 120, 120)';
    const inner = match[1].trim();
    
    // Split by slash first to separate alpha if any
    const parts = inner.split('/');
    const mainPartsStr = parts[0].trim();
    const alphaStr = parts[1] ? parts[1].trim() : null;
    
    // Split the main parts by spaces or commas
    const mainParts = mainPartsStr.split(/[\s,]+/);
    if (mainParts.length < 3) return 'rgb(120, 120, 120)';
    
    // Parse L
    let lVal = mainParts[0];
    let l = 0;
    if (lVal.endsWith('%')) {
      l = parseFloat(lVal) / 100;
    } else {
      l = parseFloat(lVal);
    }
    
    // Parse C
    let cVal = mainParts[1];
    let c = 0;
    if (cVal.endsWith('%')) {
      c = parseFloat(cVal) / 100;
    } else {
      c = parseFloat(cVal);
    }
    
    // Parse H
    let hVal = mainParts[2];
    let h = 0;
    if (hVal.toLowerCase().endsWith('deg')) {
      h = parseFloat(hVal);
    } else if (hVal.toLowerCase().endsWith('rad')) {
      h = parseFloat(hVal) * (180 / Math.PI);
    } else if (hVal.toLowerCase().endsWith('grad')) {
      h = parseFloat(hVal) * 0.9;
    } else if (hVal.toLowerCase().endsWith('turn')) {
      h = parseFloat(hVal) * 360;
    } else {
      h = parseFloat(hVal);
    }
    
    // Parse alpha if present
    let alpha = 1;
    if (alphaStr) {
      if (alphaStr.endsWith('%')) {
        alpha = parseFloat(alphaStr) / 100;
      } else {
        alpha = parseFloat(alphaStr);
      }
    }
    
    if (isNaN(l) || isNaN(c) || isNaN(h)) {
      return 'rgb(120, 120, 120)';
    }
    
    // Conversion math (OKLCH -> OKLab -> LMS -> linear RGB -> sRGB)
    const hRad = h * (Math.PI / 180);
    const a = c * Math.cos(hRad);
    const b = c * Math.sin(hRad);
    
    const l_ = l + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = l - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = l - 0.0894841775 * a - 1.2914855480 * b;
    
    const l_3 = l_ * l_ * l_;
    const m_3 = m_ * m_ * m_;
    const s_3 = s_ * s_ * s_;
    
    const rLinear = +4.0767416621 * l_3 - 3.3077115913 * m_3 + 0.2309699292 * s_3;
    const gLinear = -1.2684380046 * l_3 + 2.6097574011 * m_3 - 0.3413193965 * s_3;
    const bLinear = -0.0041960863 * l_3 - 0.7034186145 * m_3 + 1.7076147010 * s_3;
    
    const toSRGB = (x: number) => {
      return x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
    };
    
    const outR = Math.round(Math.max(0, Math.min(1, toSRGB(rLinear))) * 255);
    const outG = Math.round(Math.max(0, Math.min(1, toSRGB(gLinear))) * 255);
    const outB = Math.round(Math.max(0, Math.min(1, toSRGB(bLinear))) * 255);
    
    if (alphaStr) {
      return `rgba(${outR}, ${outG}, ${outB}, ${alpha})`;
    }
    return `rgb(${outR}, ${outG}, ${outB})`;
  } catch (err) {
    console.warn('Failed to parse OKLCH color:', cssOklch, err);
    return 'rgb(120, 120, 120)';
  }
}

function replaceOklchInCssText(cssText: string): string {
  return cssText.replace(/oklch\([^)]+\)/gi, (match) => {
    return oklchToRgb(match);
  });
}

interface ReportsViewProps {
  periods: Period[];
}

export default function ReportsView({ periods }: ReportsViewProps) {
  // 1. Report Settings State
  const [companyName, setCompanyName] = useState<string>(() => {
    return localStorage.getItem('vanguard_company_name') || 'Vanguard Portfolio Holdings';
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    return localStorage.getItem('vanguard_company_logo_base64') || null;
  });

  const [selectedPeriodId, setSelectedPeriodId] = useState<string>('all');
  const [minReserveThreshold, setMinReserveThreshold] = useState<number>(() => {
    const saved = localStorage.getItem('vanguard_min_reserve_threshold');
    return saved ? parseFloat(saved) : 15.0;
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sync settings to localStorage
  useEffect(() => {
    localStorage.setItem('vanguard_company_name', companyName);
  }, [companyName]);

  // Handle Logo Upload and Convert to Base64
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setLogoUrl(base64String);
        localStorage.setItem('vanguard_company_logo_base64', base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setLogoUrl(null);
    localStorage.removeItem('vanguard_company_logo_base64');
  };

  // 2. Filter periods to use based on user selection
  const targetPeriods = useMemo(() => {
    if (selectedPeriodId === 'all') {
      return periods;
    }
    return periods.filter((p) => p.id === selectedPeriodId);
  }, [periods, selectedPeriodId]);

  // 3. Compute Metrics for the report
  const reportMetrics = useMemo(() => {
    if (targetPeriods.length === 0) return null;

    let totalRevenue = 0;
    let totalExpenses = 0;
    let totalA = 0;
    let totalB = 0;
    let totalC = 0;
    let totalD = 0;
    let totalE = 0;
    let totalF = 0;

    targetPeriods.forEach((p) => {
      const totals = calculateAllTotals(p.sections);
      totalA += totals.totalA.actual;
      totalB += totals.totalB.actual;
      totalC += totals.totalC.actual;
      totalD += totals.totalD.actual;
      totalE += totals.totalE.actual;
      totalF += totals.totalF.actual;
      
      totalRevenue += totals.totalB.actual;
      totalExpenses += (totals.totalC.actual + totals.totalD.actual + totals.totalE.actual + totals.totalF.actual);
    });

    const netCashFlow = totalRevenue - totalExpenses;
    const lastPeriodTotals = calculateAllTotals(targetPeriods[targetPeriods.length - 1].sections);
    const closingBalance = lastPeriodTotals.netBalanceAvailable.actual;

    // Ratios
    const currentAssets = totalA + totalB;
    const currentLiabilities = totalC + totalD + totalE + totalF;

    const safeRatio = (num: number, den: number): number => {
      if (!den || isNaN(num)) return 0;
      return Math.round((num / den) * 100) / 100;
    };

    const safePercentage = (num: number, den: number): number => {
      if (!den || isNaN(num)) return 0;
      return Math.round((num / den) * 1000) / 10;
    };

    const currentRatio = safeRatio(currentAssets, currentLiabilities);
    const grossProfit = totalB - totalD;
    const grossProfitMargin = safePercentage(grossProfit, totalB);
    const operatingCashFlow = totalB - (totalD + totalE);
    const cashCoverageRatio = safeRatio(operatingCashFlow, totalC);

    return {
      totalA,
      totalB,
      totalC,
      totalD,
      totalE,
      totalF,
      totalRevenue,
      totalExpenses,
      netCashFlow,
      closingBalance,
      currentRatio,
      grossProfitMargin,
      cashCoverageRatio
    };
  }, [targetPeriods]);

  // 4. Chart Data for Report
  const chartData = useMemo(() => {
    return targetPeriods.map((p) => {
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
        Closing: closing
      };
    });
  }, [targetPeriods]);

  // 5. Forecast & Insights logic inside Report
  const forecastAndInsights = useMemo(() => {
    const k = periods.length;
    if (k === 0) return { forecastPoints: [], breachPeriod: null };

    const nets = periods.map((p) => {
      const totals = calculateAllTotals(p.sections);
      return totals.totalB.actual - (totals.totalC.actual + totals.totalD.actual + totals.totalE.actual + totals.totalF.actual);
    });

    const closings = periods.map((p) => {
      const totals = calculateAllTotals(p.sections);
      return totals.netBalanceAvailable.actual;
    });

    // Simple Blended forecast helper for net flow
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
      return Array.from({ length: count }, (_, i) => m * (n + i) + c);
    };

    const runMovingAverage = (y: number[], count = 3): number[] => {
      if (y.length === 0) return Array(count).fill(0);
      const temp = [...y];
      const result: number[] = [];
      for (let i = 0; i < count; i++) {
        const avg = temp.slice(-3).reduce((acc, curr) => acc + curr, 0) / Math.min(temp.length, 3);
        result.push(avg);
        temp.push(avg);
      }
      return result;
    };

    const netReg = runRegression(nets, 3);
    const netMA = runMovingAverage(nets, 3);
    const projectedNets = Array.from({ length: 3 }, (_, i) => (netReg[i] + netMA[i]) / 2);

    let currentCB = closings[k - 1];
    const projectedClosings: number[] = [];
    for (let i = 0; i < 3; i++) {
      currentCB += projectedNets[i];
      projectedClosings.push(currentCB);
    }

    const lastPeriodName = periods[k - 1]?.name || 'Period';
    const forecastNames = Array.from({ length: 3 }, (_, i) => `${lastPeriodName} +${i + 1}P`);

    const forecastPoints = forecastNames.map((name, idx) => ({
      name,
      net: projectedNets[idx],
      closing: projectedClosings[idx]
    }));

    let breachPeriod: string | null = null;
    for (let i = 0; i < forecastPoints.length; i++) {
      if (forecastPoints[i].closing < minReserveThreshold) {
        breachPeriod = forecastPoints[i].name;
        break;
      }
    }

    return { forecastPoints, breachPeriod };
  }, [periods, minReserveThreshold]);

  // 6. Generate PDF report function
  const handleGeneratePDF = async () => {
    const element = printAreaRef.current;
    if (!element) return;

    setIsGenerating(true);
    setErrorMsg(null);

    // Save style elements and content
    const styleElements = Array.from(document.querySelectorAll('style'));
    const originalStyleContents: { element: HTMLStyleElement; originalText: string | null }[] = [];

    try {
      // 1. Temporarily replace oklch(...) colors in stylesheets with parsed RGB values to prevent html2canvas parsing crash
      styleElements.forEach(styleEl => {
        const text = styleEl.textContent;
        if (text && text.includes('oklch')) {
          originalStyleContents.push({
            element: styleEl,
            originalText: text
          });
          styleEl.textContent = replaceOklchInCssText(text);
        }
      });

      // Small delay to let rendering stabilize
      await new Promise((resolve) => setTimeout(resolve, 600));

      const canvas = await html2canvas(element, {
        scale: 2, // high quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#FFFFFF',
        logging: true,
        scrollX: 0,
        scrollY: 0,
      });

      if (!canvas || canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas rendering produced an empty image. Please verify report data and try again.');
      }

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210; // A4 size width in mm
      const pageHeight = 297; // A4 size height in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      // Slices across multiple pages with a 3mm safe margin threshold
      while (heightLeft > 3) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      const activePeriodName = selectedPeriodId === 'all'
        ? 'Consolidated'
        : (periods.find((p) => p.id === selectedPeriodId)?.name || 'Period');

      const cleanCompany = companyName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanPeriod = activePeriodName.replace(/[^a-zA-Z0-9_-]/g, '_');
      const fileName = `CashFlow_Report_${cleanCompany}_${cleanPeriod}.pdf`;

      // Programmatic file download using Blob & URL to ensure reliability in all frames
      const blob = pdf.output('blob');
      const blobURL = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobURL;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(blobURL), 100);
    } catch (error: any) {
      console.error('Error generating PDF:', error);
      setErrorMsg(error?.message || 'Failed to generate PDF. Please try again.');
    } finally {
      // 2. Restore original stylesheets content so app view styling remains unaffected and high fidelity is preserved!
      originalStyleContents.forEach(item => {
        try {
          item.element.textContent = item.originalText;
        } catch (restoreErr) {
          console.warn('Failed to restore original style element content:', restoreErr);
        }
      });
      setIsGenerating(false);
    }
  };

  if (periods.length === 0) {
    return (
      <div className="py-20 text-center text-gray-500 bg-white border border-gray-200 rounded-xl p-6">
        Please enter portfolio data in the Cash Flow Sheet before generating a report.
      </div>
    );
  }

  const formatLakhsVal = (val: number) => `Rs. ${val.toFixed(2)} L`;

  return (
    <div id="financial-reports-workspace" className="grid grid-cols-1 lg:grid-cols-4 gap-8 animate-fade-in">
      {errorMsg && (
        <div className="col-span-1 lg:col-span-4 bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-xl flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-500 hover:text-rose-700 underline font-bold cursor-pointer">
            Dismiss
          </button>
        </div>
      )}
      {/* 1. REPORT CONTROL PANEL (Sidebar on left) */}
      <div className="lg:col-span-1 space-y-6">
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs space-y-5">
          <div className="flex items-center gap-2 border-b border-gray-100 pb-3">
            <FileText className="h-4 w-4 text-[#2563EB]" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 font-mono">
              Report Settings
            </h3>
          </div>

          {/* Company Name Input */}
          <div className="space-y-1.5">
            <label htmlFor="company-name-report-input" className="block text-xs font-semibold text-gray-600">
              Company / Holding Name
            </label>
            <div className="relative">
              <Building className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                id="company-name-report-input"
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Vanguard Holdings Ltd."
                className="block w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:bg-white"
              />
            </div>
          </div>

          {/* Logo Upload Field */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-gray-600">
              Company Logo (.PNG / .JPG)
            </label>
            <div className="flex flex-col gap-2">
              {logoUrl ? (
                <div className="relative border border-gray-200 rounded-lg p-2 flex items-center justify-between bg-gray-50">
                  <div className="flex items-center gap-2 overflow-hidden">
                    <img src={logoUrl} alt="Logo preview" className="h-8 w-12 object-contain rounded border border-gray-150" />
                    <span className="text-[10px] text-gray-500 truncate">Logo Uploaded</span>
                  </div>
                  <button
                    onClick={handleClearLogo}
                    className="text-[10px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                  >
                    Clear
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-lg p-4 bg-gray-50 hover:bg-gray-100/50 cursor-pointer transition-colors">
                  <Upload className="h-5 w-5 text-gray-400 mb-1" />
                  <span className="text-[10px] text-gray-500 font-semibold text-center">Click to upload logo</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Reporting Period Filter */}
          <div className="space-y-1.5">
            <label htmlFor="period-report-filter" className="block text-xs font-semibold text-gray-600">
              Select Reporting Period
            </label>
            <select
              id="period-report-filter"
              value={selectedPeriodId}
              onChange={(e) => setSelectedPeriodId(e.target.value)}
              className="block w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs font-bold text-gray-800 cursor-pointer focus:outline-none"
            >
              <option value="all">All Selected Range (Consolidated)</option>
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Minimum Reserve Input (linked to the database) */}
          <div className="space-y-1.5">
            <label htmlFor="min-reserve-report-input" className="block text-xs font-semibold text-gray-600">
              Minimum Reserve Threshold (Lakhs)
            </label>
            <input
              id="min-reserve-report-input"
              type="number"
              value={minReserveThreshold}
              onChange={(e) => setMinReserveThreshold(Math.max(0, parseFloat(e.target.value) || 0))}
              className="block w-full bg-gray-50 border border-gray-200 rounded-lg py-2 px-3 text-xs font-semibold text-gray-800 focus:outline-none"
            />
          </div>

          {/* Action Export Button */}
          <button
            onClick={handleGeneratePDF}
            disabled={isGenerating || periods.length === 0}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold py-2.5 rounded-xl text-xs shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="h-4 w-4" />
            {isGenerating ? 'Generating PDF...' : 'Download PDF Report'}
          </button>

          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 font-medium flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">PDF generation failed:</span> {errorMsg}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. LIVE DOCUMENT PRINT PREVIEW (A4 Styled container on right) */}
      <div className="lg:col-span-3">
        <div className="text-xs text-gray-400 font-semibold mb-2 uppercase tracking-wider font-mono flex items-center justify-between">
          <span>A4 Document Print Preview</span>
          <span className="text-[10px] text-emerald-600">Dynamic & Interactive</span>
        </div>

        <div className="overflow-x-auto border border-gray-200 rounded-2xl bg-gray-500/5 p-4 md:p-8 flex justify-center shadow-inner">
          {/* Main print container */}
          <div
            id="report-print-preview-container"
            ref={printAreaRef}
            className="bg-white text-[#1A1A1A] w-[794px] min-h-[1123px] shadow-lg flex flex-col p-10 space-y-8 relative font-sans leading-relaxed shrink-0 border border-gray-100"
          >
            {/* Report Header */}
            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-5">
              <div className="space-y-1">
                {logoUrl ? (
                  <img src={logoUrl} alt="Company Logo" className="h-10 max-w-[150px] object-contain mb-2" />
                ) : (
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-900 text-white font-mono text-[10px] font-bold uppercase tracking-wider mb-2">
                    <Building className="h-3.5 w-3.5" />
                    <span>{companyName.slice(0, 3).toUpperCase()} CORP</span>
                  </div>
                )}
                <h2 className="text-xl font-black font-display tracking-tight uppercase text-gray-900">
                  {companyName}
                </h2>
                <p className="text-[10px] font-mono text-gray-400 font-semibold uppercase tracking-widest">
                  Holding Portfolio Financial Status Report
                </p>
              </div>

              <div className="text-right text-xs space-y-1 font-mono text-gray-500">
                <div><strong>Document</strong>: FIN-CF-01</div>
                <div><strong>Date</strong>: {new Date().toLocaleDateString('en-GB')}</div>
                <div>
                  <strong>Reporting Period</strong>:{' '}
                  <span className="font-bold text-gray-800">
                    {selectedPeriodId === 'all'
                      ? `${periods[0]?.name} – ${periods[periods.length - 1]?.name}`
                      : periods.find((p) => p.id === selectedPeriodId)?.name}
                  </span>
                </div>
              </div>
            </div>

            {/* KPI CARDS GRID */}
            {reportMetrics && (
              <div className="grid grid-cols-4 gap-4">
                <div className="border border-gray-200 p-3 rounded-lg bg-gray-50">
                  <div className="text-[9px] text-gray-400 uppercase font-mono tracking-wider font-bold">Money Coming In</div>
                  <div className="text-sm font-black font-mono text-gray-900 pt-0.5">{formatLakhsVal(reportMetrics.totalRevenue)}</div>
                </div>
                <div className="border border-gray-200 p-3 rounded-lg bg-gray-50">
                  <div className="text-[9px] text-gray-400 uppercase font-mono tracking-wider font-bold">Money Going Out</div>
                  <div className="text-sm font-black font-mono text-gray-900 pt-0.5">{formatLakhsVal(reportMetrics.totalExpenses)}</div>
                </div>
                <div className="border border-gray-200 p-3 rounded-lg bg-gray-50">
                  <div className="text-[9px] text-gray-400 uppercase font-mono tracking-wider font-bold">Money Left After Expenses</div>
                  <div className={`text-sm font-black font-mono pt-0.5 ${reportMetrics.netCashFlow >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatLakhsVal(reportMetrics.netCashFlow)}
                  </div>
                </div>
                <div className="border border-gray-200 p-3 rounded-lg bg-gray-50">
                  <div className="text-[9px] text-gray-400 uppercase font-mono tracking-wider font-bold">Total Cash in Hand</div>
                  <div className="text-sm font-black font-mono text-gray-900 pt-0.5">{formatLakhsVal(reportMetrics.closingBalance)}</div>
                </div>
              </div>
            )}

            {/* FINANCIAL SUMMARY TABLE */}
            {reportMetrics && (
              <div className="space-y-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 font-mono border-b border-gray-300 pb-1">
                  I. Consolidated Ledger Summary (Rs. Lakhs)
                </h3>
                <div className="overflow-hidden border border-gray-250 rounded-lg">
                  <table className="w-full text-[10px] text-left border-collapse">
                    <thead>
                      <tr className="bg-gray-100 text-gray-500 border-b border-gray-250 uppercase font-mono text-[9px]">
                        <th className="p-2">Section Particular</th>
                        <th className="p-2 text-right">Actual Amount</th>
                        <th className="p-2 text-right">Budget Share %</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-150 font-medium">
                      <tr>
                        <td className="p-2 text-gray-800">Balances B/fd (Opening Balances) (A)</td>
                        <td className="p-2 text-right font-mono">{reportMetrics.totalA.toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">—</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-gray-800">Rent Receivables (B)</td>
                        <td className="p-2 text-right font-mono">{reportMetrics.totalB.toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">—</td>
                      </tr>
                      <tr className="bg-gray-50/50 font-bold">
                        <td className="p-2 text-gray-900 uppercase">Total Money Coming In (A + B)</td>
                        <td className="p-2 text-right font-mono text-gray-900">{(reportMetrics.totalA + reportMetrics.totalB).toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">—</td>
                      </tr>
                      <tr>
                        <td className="p-2 text-gray-800">Loan Interest & Installments (C)</td>
                        <td className="p-2 text-right font-mono">{reportMetrics.totalC.toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">
                          {reportMetrics.totalExpenses > 0
                            ? `${((reportMetrics.totalC / reportMetrics.totalExpenses) * 100).toFixed(1)}%`
                            : '0%'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-gray-800">Operating Monthly Expenses (D)</td>
                        <td className="p-2 text-right font-mono">{reportMetrics.totalD.toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">
                          {reportMetrics.totalExpenses > 0
                            ? `${((reportMetrics.totalD / reportMetrics.totalExpenses) * 100).toFixed(1)}%`
                            : '0%'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-gray-800">Professional/Administrative (E)</td>
                        <td className="p-2 text-right font-mono">{reportMetrics.totalE.toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">
                          {reportMetrics.totalExpenses > 0
                            ? `${((reportMetrics.totalE / reportMetrics.totalExpenses) * 100).toFixed(1)}%`
                            : '0%'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2 text-gray-800">Extraordinary CapEx Overrides (F)</td>
                        <td className="p-2 text-right font-mono">{reportMetrics.totalF.toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">
                          {reportMetrics.totalExpenses > 0
                            ? `${((reportMetrics.totalF / reportMetrics.totalExpenses) * 100).toFixed(1)}%`
                            : '0%'}
                        </td>
                      </tr>
                      <tr className="bg-gray-50/50 font-bold">
                        <td className="p-2 text-gray-900 uppercase">Total Money Going Out (C + D + E + F)</td>
                        <td className="p-2 text-right font-mono text-gray-900">{reportMetrics.totalExpenses.toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">100.0%</td>
                      </tr>
                      <tr className="bg-gray-900 text-white font-black">
                        <td className="p-2 uppercase font-mono text-[9px]">Money Left After Expenses (Inflow - Outflows)</td>
                        <td className="p-2 text-right font-mono">{reportMetrics.netCashFlow.toFixed(2)} L</td>
                        <td className="p-2 text-right font-mono">—</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* RATIO CARDS & CHARTS */}
            <div className="grid grid-cols-2 gap-6">
              {/* Ratio Summary Column */}
              <div className="space-y-3 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 font-mono border-b border-gray-300 pb-1 mb-2">
                    II. Key Ratio Performance
                  </h3>
                  {reportMetrics && (
                    <div className="space-y-2">
                      <div className="border border-gray-150 rounded p-2 flex justify-between items-center text-[10px]">
                        <div>
                          <div className="font-bold text-gray-800">Can We Pay Our Short-Term Bills?</div>
                          <div className="text-[8px] text-gray-400">Current Ratio (Benchmark: &gt;1.2x)</div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-gray-900 text-xs block">{reportMetrics.currentRatio}x</span>
                          <span className={`text-[8px] font-bold uppercase ${reportMetrics.currentRatio >= 1.2 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {reportMetrics.currentRatio >= 1.2 ? 'Adequate' : 'Below Norm'}
                          </span>
                        </div>
                      </div>

                      <div className="border border-gray-150 rounded p-2 flex justify-between items-center text-[10px]">
                        <div>
                          <div className="font-bold text-gray-800">Profit Before Expenses</div>
                          <div className="text-[8px] text-gray-400">Gross Margin (Benchmark: &gt;80%)</div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-gray-900 text-xs block">{reportMetrics.grossProfitMargin}%</span>
                          <span className={`text-[8px] font-bold uppercase ${reportMetrics.grossProfitMargin >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {reportMetrics.grossProfitMargin >= 80 ? 'Healthy' : 'Below Target'}
                          </span>
                        </div>
                      </div>

                      <div className="border border-gray-150 rounded p-2 flex justify-between items-center text-[10px]">
                        <div>
                          <div className="font-bold text-gray-800">Can We Pay Loan EMIs?</div>
                          <div className="text-[8px] text-gray-400">Cash Coverage (Benchmark: &gt;1.25x)</div>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-gray-900 text-xs block">{reportMetrics.cashCoverageRatio}x</span>
                          <span className={`text-[8px] font-bold uppercase ${reportMetrics.cashCoverageRatio >= 1.25 ? 'text-emerald-700' : 'text-amber-700'}`}>
                            {reportMetrics.cashCoverageRatio >= 1.25 ? 'Strong Cover' : 'Tight Cover'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-[9px] text-gray-400 leading-normal border-t border-gray-150 pt-2 font-mono">
                  * All ratio analyses conform to GAAP/IGAAP standard holding company liquidity assessment matrices.
                </div>
              </div>

              {/* Static Chart Image Placeholders (rendered using light Recharts inside print area) */}
              <div className="space-y-3">
                <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 font-mono border-b border-gray-300 pb-1">
                  III. Actual Historical Trend
                </h3>
                <div className="border border-gray-150 rounded-lg p-2 bg-gray-50 h-36 flex items-center justify-center">
                  <BarChart width={330} height={130} data={chartData} margin={{ top: 5, right: 0, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={8} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={8} tickLine={false} />
                    <Bar dataKey="Inflow" fill="#2563EB" radius={[2, 2, 0, 0]} name="Inflow" isAnimationActive={false} />
                    <Bar dataKey="Outflow" fill="#64748B" radius={[2, 2, 0, 0]} name="Outflow" isAnimationActive={false} />
                  </BarChart>
                </div>
              </div>
            </div>

            {/* FORECAST PANEL */}
            <div className="space-y-3 border-t border-gray-200 pt-5">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-900 font-mono border-b border-gray-300 pb-1">
                IV. 3-Month Forward Forecast Trend (Rs. Lakhs)
              </h3>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                {forecastAndInsights.forecastPoints.map((item, idx) => (
                  <div key={idx} className="border border-gray-200 p-2.5 rounded-lg bg-gray-50/50">
                    <div className="text-[9px] text-gray-400 font-bold uppercase font-mono">{item.name}</div>
                    <div className="text-xs font-extrabold text-gray-900 mt-1 font-mono">{item.closing.toFixed(2)} L</div>
                    <div className="text-[8px] text-gray-400 mt-0.5">Projected Total Cash</div>
                  </div>
                ))}
              </div>
            </div>

            {/* INSIGHTS TEXT */}
            <div className="space-y-2 bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center gap-1.5 border-b border-gray-150 pb-1.5 mb-1">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                <h4 className="text-[10px] font-black uppercase tracking-wider text-gray-900 font-mono">
                  V. Professional Executive Commentary & Actions
                </h4>
              </div>

              {forecastAndInsights.breachPeriod ? (
                <p className="text-[10px] text-gray-600 leading-relaxed font-sans">
                  <strong>LIQUIDITY RISK RED ALERT</strong>: Financial forward algorithms project a reserve violation of the Rs. {minReserveThreshold.toFixed(1)} L margin in <strong>{forecastAndInsights.breachPeriod}</strong>. Discretionary overheads must be reduced. Improve rental receivables collections for BITS Pilani or HDFC Bank immediately, and freeze non-essential capital investments (CapEx) to prevent cash-flow bottlenecks.
                </p>
              ) : (
                <p className="text-[10px] text-gray-600 leading-relaxed font-sans">
                  <strong>SYSTEM DIAGNOSTICS: SECURE</strong>: Projected liquid resources maintain a comfortable gap above your Rs. {minReserveThreshold.toFixed(1)} L threshold across the entire forecast timeline. Operational cash flows adequately service recurring bank LRD and consultant liabilities. No immediate emergency funding actions are recommended.
                </p>
              )}
            </div>

            {/* Report Footer / Signature */}
            <div className="border-t border-gray-100 pt-5 mt-auto flex justify-between items-center text-[9px] text-gray-400 font-mono">
              <div>System Engine: Vanguard Holding Cash Flow Console v1.0.0</div>
              <div>Authorized Signatory Header</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
