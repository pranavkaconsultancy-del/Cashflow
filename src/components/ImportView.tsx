import React, { useState, useMemo, useRef } from 'react';
import { Project, Period, PeriodInflow, PeriodOutflow, BudgetVsActualItem } from '../types';
import { calculatePeriodTotals, formatCurrency } from '../utils/calculations';
import * as XLSX from 'xlsx';
import { 
  Upload, 
  FileSpreadsheet, 
  Server, 
  RefreshCw, 
  Check, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  Sparkles, 
  Database, 
  Wifi, 
  FileText,
  AlertCircle
} from 'lucide-react';

interface ImportViewProps {
  project: Project;
  onUpdateProject: (id: string, updatedFields: Partial<Project>) => void;
}

interface ParsedRecord {
  month: string;
  year: string;
  category: string;
  type: 'Inflow' | 'Outflow';
  amount: number;
  notes: string;
}

interface ValidatedRow {
  index: number;
  data: ParsedRecord;
  isValid: boolean;
  errors: string[];
  isNewCategory: boolean;
}

export default function ImportView({ project, onUpdateProject }: ImportViewProps) {
  // Tabs: 'upload' or 'cloud'
  const [activeTab, setActiveTab] = useState<'upload' | 'cloud'>('upload');

  // Preview / Validation State
  const [rows, setRows] = useState<ValidatedRow[]>([]);
  const [isDragActive, setIsDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);

  // Cloud Tally Settings Form State
  const [tallyUrl, setTallyUrl] = useState('https://mock-tally.vanguard.com');
  const [tallyPort, setTallyPort] = useState('9000');
  const [tallyUser, setTallyUser] = useState('');
  const [tallyPassword, setTallyPassword] = useState('');
  
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get current active categories for new category detection
  const currentCategories = useMemo(() => {
    const inflows = new Set<string>();
    const outflows = new Set<string>();
    project.periods.forEach(p => {
      p.inflows.forEach(i => inflows.add(i.category.toLowerCase().trim()));
      p.outflows.forEach(o => outflows.add(o.category.toLowerCase().trim()));
    });
    return { inflows, outflows };
  }, [project]);

  // Helper to normalize month names to 3-letter abbreviation
  const normalizeMonth = (m: string): string => {
    if (!m) return '';
    const clean = m.trim().toLowerCase().replace(/[^a-z]/g, '');
    if (clean.startsWith('jan')) return 'Jan';
    if (clean.startsWith('feb')) return 'Feb';
    if (clean.startsWith('mar')) return 'Mar';
    if (clean.startsWith('apr')) return 'Apr';
    if (clean.startsWith('may')) return 'May';
    if (clean.startsWith('jun')) return 'Jun';
    if (clean.startsWith('jul')) return 'Jul';
    if (clean.startsWith('aug')) return 'Aug';
    if (clean.startsWith('sep')) return 'Sep';
    if (clean.startsWith('oct')) return 'Oct';
    if (clean.startsWith('nov')) return 'Nov';
    if (clean.startsWith('dec')) return 'Dec';
    return m.trim(); // fallback
  };

  // Raw file parser
  const parseRawRows = (rawObjects: any[]) => {
    const validated: ValidatedRow[] = [];

    rawObjects.forEach((raw, idx) => {
      const errors: string[] = [];
      
      // Column Alias mappings to be super robust (handles Tally Excel exports as well)
      const rawMonth = raw.Month || raw.month || raw.Period || raw.Date || '';
      const rawYear = raw.Year || raw.year || raw.FY || '';
      const rawCategory = raw.Category || raw.category || raw.Ledger || raw.Particulars || '';
      const rawType = raw.Type || raw.type || raw.VoucherType || raw.DC || '';
      const rawAmount = raw.Amount || raw.amount || raw.Value || raw.Debit || raw.Credit || '';
      const rawNotes = raw.Notes || raw.notes || raw.Narration || raw.Description || '';

      const month = normalizeMonth(String(rawMonth));
      const year = String(rawYear).trim();
      const category = String(rawCategory).trim();
      const typeStr = String(rawType).trim().toLowerCase();
      const amountNum = parseFloat(String(rawAmount).replace(/[^0-9.-]/g, '')) || 0;

      // Validation
      if (!month) errors.push('Missing Month');
      if (!year) errors.push('Missing Year');
      if (!category) errors.push('Missing Category/Ledger Name');
      
      let type: 'Inflow' | 'Outflow' = 'Inflow';
      if (typeStr.includes('outflow') || typeStr.includes('payment') || typeStr.includes('dr') || typeStr.includes('debit') || typeStr.includes('spend')) {
        type = 'Outflow';
      } else if (typeStr.includes('inflow') || typeStr.includes('receipt') || typeStr.includes('cr') || typeStr.includes('credit') || typeStr.includes('collect')) {
        type = 'Inflow';
      } else {
        errors.push('Invalid or missing Type (must specify Inflow or Outflow)');
      }

      if (isNaN(amountNum) || amountNum <= 0) {
        errors.push('Amount must be a positive number');
      }

      // Check if it's a new category
      let isNewCategory = false;
      if (category) {
        const catLower = category.toLowerCase().trim();
        if (type === 'Inflow') {
          isNewCategory = !currentCategories.inflows.has(catLower);
        } else {
          isNewCategory = !currentCategories.outflows.has(catLower);
        }
      }

      validated.push({
        index: idx + 1,
        data: {
          month,
          year,
          category,
          type,
          amount: amountNum,
          notes: String(rawNotes).trim()
        },
        isValid: errors.length === 0,
        errors,
        isNewCategory
      });
    });

    setRows(validated);
    setImportSuccess(null);
  };

  // CSV Parsing Engine
  const parseCSV = (text: string) => {
    const lines = text.split(/\r?\n/);
    if (lines.length === 0) return;

    // Grab header row
    const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
    const parsedObjects: any[] = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values: string[] = [];
      let current = '';
      let inQuotes = false;
      
      for (let c = 0; c < line.length; c++) {
        const char = line[c];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      values.push(current.trim());

      const rowObj: Record<string, any> = {};
      headers.forEach((header, idx) => {
        let val = values[idx] || '';
        val = val.replace(/^["']|["']$/g, '');
        rowObj[header] = val;
      });
      parsedObjects.push(rowObj);
    }

    parseRawRows(parsedObjects);
  };

  // Excel (.xlsx) Parsing Engine
  const parseExcelFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(sheet);
        parseRawRows(json);
      } catch (err: any) {
        alert('Error reading Excel: ' + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // General File Handling Route
  const handleFile = (file: File) => {
    setFileName(file.name);
    if (file.name.endsWith('.csv')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result as string;
        parseCSV(text);
      };
      reader.readAsText(file);
    } else if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
      parseExcelFile(file);
    } else {
      alert('Unsupported file format. Please upload a .xlsx or .csv export.');
    }
  };

  // Drag & Drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = () => {
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  // Cloud Tally Actions
  const handleTestConnection = async () => {
    if (!tallyUrl) return;
    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await fetch('/api/tally/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: tallyUrl,
          port: tallyPort,
          username: tallyUser,
          password: tallyPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setTestResult({ success: true, message: data.message });
      } else {
        setTestResult({ success: false, message: data.error || 'Failed to establish connection' });
      }
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Network error occurred' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSyncCloudNow = async () => {
    if (!tallyUrl) return;
    setIsSyncing(true);
    setRows([]);
    setFileName(`Cloud Sync: ${tallyUrl.replace(/https?:\/\//, '')}`);

    try {
      const res = await fetch('/api/tally/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: tallyUrl,
          port: tallyPort,
          username: tallyUser,
          password: tallyPassword
        })
      });
      const data = await res.json();
      if (res.ok && data.records) {
        parseRawRows(data.records);
        if (data.message) {
          setTestResult({ success: true, message: data.message });
        }
      } else {
        alert(data.error || 'Failed to sync ledger records from Cloud Tally');
      }
    } catch (err: any) {
      alert('Network sync failed: ' + err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  // Execute Final DB Commit
  const handleConfirmImport = () => {
    const validRows = rows.filter(r => r.isValid);
    if (validRows.length === 0) return;

    // Deep copy existing periods to manipulate
    const updatedPeriods = JSON.parse(JSON.stringify(project.periods)) as Period[];
    const updatedBudgetVsActual = JSON.parse(JSON.stringify(project.budgetVsActual)) as BudgetVsActualItem[];

    let newPeriodsCount = 0;
    let categoriesAdded = 0;

    validRows.forEach(row => {
      const record = row.data;
      const targetPeriodName = `${record.month} ${record.year}`;
      
      // 1. Locate or create corresponding monthly Period
      let period = updatedPeriods.find(p => p.name.toLowerCase() === targetPeriodName.toLowerCase());
      if (!period) {
        const lastPeriod = updatedPeriods[updatedPeriods.length - 1];
        const prevTotals = lastPeriod ? calculatePeriodTotals(lastPeriod) : null;
        const prevBank = prevTotals ? prevTotals.closingBalance : 1500000;
        const prevCash = lastPeriod ? lastPeriod.cashInHand : 200000;

        period = {
          id: `per-${Math.random().toString(36).substring(2, 9)}`,
          name: targetPeriodName,
          bankBalance: prevBank,
          cashInHand: prevCash,
          inflows: [],
          outflows: []
        };
        updatedPeriods.push(period);
        newPeriodsCount++;
      }

      // 2. Insert into Inflows or Outflows
      if (record.type === 'Inflow') {
        const existingInflow = period.inflows.find(i => i.category.toLowerCase().trim() === record.category.toLowerCase().trim());
        if (existingInflow) {
          existingInflow.actual = Number((existingInflow.actual + record.amount).toFixed(2));
        } else {
          period.inflows.push({
            category: record.category,
            budgeted: 0,
            actual: record.amount
          });
          categoriesAdded++;
        }
      } else {
        const existingOutflow = period.outflows.find(o => o.category.toLowerCase().trim() === record.category.toLowerCase().trim());
        if (existingOutflow) {
          existingOutflow.actual = Number((existingOutflow.actual + record.amount).toFixed(2));
        } else {
          period.outflows.push({
            category: record.category,
            budgeted: 0,
            actual: record.amount
          });
          categoriesAdded++;
        }

        // Also update Project-level budget vs actual for Outflows
        const existingBvA = updatedBudgetVsActual.find(b => b.category.toLowerCase().trim() === record.category.toLowerCase().trim());
        if (existingBvA) {
          existingBvA.actual = Number((existingBvA.actual + record.amount).toFixed(2));
        } else {
          updatedBudgetVsActual.push({
            category: record.category,
            budgeted: 0,
            actual: record.amount
          });
        }
      }
    });

    // Save back to local storage and update app state
    onUpdateProject(project.id, {
      periods: updatedPeriods,
      budgetVsActual: updatedBudgetVsActual
    });

    setImportSuccess(
      `Import complete! Successfully integrated ${validRows.length} ledger transactions. ${
        newPeriodsCount > 0 ? `Created ${newPeriodsCount} new monthly periods. ` : ''
      }${categoriesAdded > 0 ? `Auto-mapped ${categoriesAdded} new category categories.` : ''}`
    );
    
    // Reset view states
    setRows([]);
    setFileName(null);
  };

  const handleReset = () => {
    setRows([]);
    setFileName(null);
    setImportSuccess(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const validRows = rows.filter(r => r.isValid);
  const invalidRows = rows.filter(r => !r.isValid);

  return (
    <div className="space-y-6">
      {/* Top Title Bar */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-gray-900 font-display">Tally & Ledger Data Integration</h3>
        <p className="text-xs text-gray-500 mt-1">
          Bring in live ledger vouchers and Day Book transactions to automatically synchronize real-time building cash flows, customer collections, and operational balances.
        </p>
      </div>

      {importSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex gap-3 text-emerald-900 text-xs font-semibold">
          <CheckCircle className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-gray-900 font-bold">{importSuccess}</p>
            <p className="text-gray-500 font-medium mt-1">All executive dashboards, live ratios, cash runways, and safety buffers are fully recalculated.</p>
          </div>
        </div>
      )}

      {rows.length === 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main upload option selection panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tabs for choosing CSV/Excel vs Hosted Tally */}
            <div className="bg-white rounded-xl border border-gray-200 p-1 flex">
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'upload'
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <span>Upload CSV / Excel File</span>
              </button>
              <button
                onClick={() => setActiveTab('cloud')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  activeTab === 'cloud'
                    ? 'bg-blue-50 text-blue-600 font-bold'
                    : 'text-gray-500 hover:text-gray-900'
                }`}
              >
                <Server className="h-4 w-4" />
                <span>Optional — Connect Hosted Tally</span>
              </button>
            </div>

            {/* TAB 1: FILE UPLOAD */}
            {activeTab === 'upload' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Import Tally Day Book or Ledger Sheet</h4>
                  <span className="text-[10px] text-gray-400 font-mono">Supports .csv, .xlsx, .xls</span>
                </div>

                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50/50'
                      : 'border-gray-250 bg-gray-50/25 hover:bg-gray-50/75'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".csv, .xlsx, .xls"
                    className="hidden"
                  />
                  <div className="max-w-md mx-auto space-y-2.5">
                    <div className="mx-auto w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-gray-900">Drag & drop your Tally export or click to browse</p>
                      <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">
                        Export your data from Tally as Excel or CSV (Day Book / Ledger report) and upload it here.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50/50 rounded-lg p-3.5 border border-blue-100 flex gap-2.5 text-xs text-blue-900">
                  <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-bold">Required Sheet Headers:</p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      Month | Year | Category | Type (Inflow/Outflow) | Amount | Notes
                    </p>
                    <p className="text-[10px] text-gray-500 leading-normal">
                      The engine automatically validates missing lines and auto-creates any missing months/categories in the budget matrix during import.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: CLOUD TALLY CONNECTION */}
            {activeTab === 'cloud' && (
              <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
                <div>
                  <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wide">Connect to Hosted / Cloud Tally Instance</h4>
                  <p className="text-[11px] text-gray-500 mt-0.5">
                    Optional — configure only if your office uses a cloud-hosted Tally deployment with an active HTTP endpoint.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Tally Server URL / IP
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. https://mock-tally.vanguard.com"
                      value={tallyUrl}
                      onChange={(e) => setTallyUrl(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Gateway Port
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9000"
                      value={tallyPort}
                      onChange={(e) => setTallyPort(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs font-medium focus:ring-1 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Tally Username (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="admin"
                      value={tallyUser}
                      onChange={(e) => setTallyUser(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                      Password / Auth Token (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={tallyPassword}
                      onChange={(e) => setTallyPassword(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs font-medium"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={handleTestConnection}
                    disabled={isTesting || !tallyUrl}
                    className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1.5"
                  >
                    {isTesting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Wifi className="h-3.5 w-3.5 text-blue-600" />
                    )}
                    <span>Test Connection</span>
                  </button>

                  <button
                    onClick={handleSyncCloudNow}
                    disabled={isSyncing || !tallyUrl}
                    className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    {isSyncing ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Database className="h-3.5 w-3.5" />
                    )}
                    <span>Sync Ledger Now</span>
                  </button>
                </div>

                {testResult && (
                  <div className={`p-3.5 rounded-lg border text-xs font-semibold flex gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-50 border-emerald-100 text-emerald-950' 
                      : 'bg-rose-50 border-rose-100 text-rose-950'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertCircle className="h-4.5 w-4.5 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <p>{testResult.message}</p>
                      {testResult.success && (
                        <p className="text-[10px] text-gray-500 font-medium mt-1">
                          Ready to sync live vouchers. Enter a server endpoint or keep the mock demo URL to test with preloaded records.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                <div className="bg-amber-50/50 rounded-lg p-3.5 border border-amber-100 text-[10px] text-amber-900 leading-normal">
                  <strong>Network Reachability Notice:</strong> This only works if your Tally is hosted on a server reachable over the internet. If your Tally runs locally in your office, use the CSV/Excel upload above instead.
                </div>
              </div>
            )}
          </div>

          {/* Quick instructions Sidebar */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Integration Specs</h4>
            <div className="space-y-3.5 text-xs">
              <div className="flex gap-2.5">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600 h-fit">
                  <FileText className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-gray-900">Automatic Mapping</h5>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                    Imports automatically assign vouchers to their respective monthly periods. Any missing month is instantly provisioned.
                  </p>
                </div>
              </div>

              <div className="flex gap-2.5">
                <div className="p-1 rounded-md bg-blue-50 text-blue-600 h-fit">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div>
                  <h5 className="font-bold text-gray-900">Unrecognized Categories</h5>
                  <p className="text-gray-500 text-[11px] mt-0.5 leading-relaxed">
                    Ledger accounts or expense heads that are not present in the current catalog are auto-created and mapped in real-time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Preview Vouchers screen */
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-600" />
                <h4 className="text-sm font-bold text-gray-900 font-display">Verify Tally Ledger Vouchers Before Import</h4>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Source: <span className="font-mono text-gray-700 bg-gray-50 px-1.5 py-0.5 rounded border">{fileName}</span>
              </p>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold px-3 py-1.5 rounded-lg text-xs cursor-pointer"
              >
                Clear / Reset
              </button>

              <button
                onClick={handleConfirmImport}
                disabled={validRows.length === 0}
                className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-4 py-1.5 rounded-lg text-xs cursor-pointer shadow-xs flex items-center gap-1"
              >
                <Check className="h-3.5 w-3.5" />
                <span>Integrate {validRows.length} Valid Records</span>
              </button>
            </div>
          </div>

          {/* Validation Status summary bars */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-gray-50 border border-gray-150 text-xs">
              <span className="text-gray-400 block font-bold uppercase text-[9px] font-mono">Total Found Records</span>
              <span className="text-lg font-black text-gray-900 mt-1 block">{rows.length}</span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-100 text-xs">
              <span className="text-emerald-700 block font-bold uppercase text-[9px] font-mono">Valid & Ready</span>
              <span className="text-lg font-black text-emerald-600 mt-1 block">{validRows.length}</span>
            </div>

            <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-100 text-xs">
              <span className="text-rose-700 block font-bold uppercase text-[9px] font-mono">Invalid (Will be Skipped)</span>
              <span className="text-lg font-black text-rose-600 mt-1 block">{invalidRows.length}</span>
            </div>
          </div>

          {/* Scrollable validation tables */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto max-h-[360px]">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 text-gray-500 uppercase tracking-wider text-[9px] font-mono border-b border-gray-200 sticky top-0">
                    <th className="py-2.5 px-4 font-semibold">Row</th>
                    <th className="py-2.5 px-4 font-semibold">Status</th>
                    <th className="py-2.5 px-4 font-semibold">Period</th>
                    <th className="py-2.5 px-4 font-semibold">Ledger / Category</th>
                    <th className="py-2.5 px-4 font-semibold">Voucher Type</th>
                    <th className="py-2.5 px-4 font-semibold">Value</th>
                    <th className="py-2.5 px-4 font-semibold">Narration</th>
                    <th className="py-2.5 px-4 font-semibold">Validation Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-150 text-[11px]">
                  {rows.map((row) => (
                    <tr 
                      key={row.index} 
                      className={`hover:bg-gray-50/50 ${!row.isValid ? 'bg-rose-50/20' : ''}`}
                    >
                      <td className="py-2 px-4 font-mono text-gray-400 font-bold">#{row.index}</td>
                      
                      <td className="py-2 px-4">
                        {row.isValid ? (
                          <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                            <CheckCircle className="h-3.5 w-3.5" />
                            <span>Pass</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-rose-600 font-bold animate-pulse">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span>Error</span>
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-4 font-semibold text-gray-900">
                        {row.data.month && row.data.year ? `${row.data.month} ${row.data.year}` : '-'}
                      </td>

                      <td className="py-2 px-4 font-medium">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-800">{row.data.category || '-'}</span>
                          {row.isValid && row.isNewCategory && (
                            <span className="inline-block bg-violet-50 text-violet-700 text-[8px] font-extrabold uppercase px-1 rounded border border-violet-100">
                              New Category
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-2 px-4">
                        {row.data.type === 'Inflow' ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-100">
                            Inflow
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[9px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-100">
                            Outflow
                          </span>
                        )}
                      </td>

                      <td className="py-2 px-4 font-bold text-gray-900 font-mono">
                        {isNaN(row.data.amount) ? '-' : formatCurrency(row.data.amount)}
                      </td>

                      <td className="py-2 px-4 text-gray-500 max-w-xs truncate" title={row.data.notes}>
                        {row.data.notes || '-'}
                      </td>

                      <td className="py-2 px-4">
                        {row.isValid ? (
                          <span className="text-gray-400 font-medium">No errors detected</span>
                        ) : (
                          <div className="text-rose-600 font-bold space-y-0.5">
                            {row.errors.map((err, i) => (
                              <div key={i} className="flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-rose-600 shrink-0" />
                                <span>{err}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
