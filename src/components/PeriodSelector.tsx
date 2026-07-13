import React, { useState } from 'react';
import { Period } from '../types';
import { Plus, Calendar, Copy, ChevronDown, Check, Trash2 } from 'lucide-react';

interface PeriodSelectorProps {
  periods: Period[];
  selectedPeriodId: string;
  onSelectPeriod: (id: string) => void;
  onCreatePeriod: (name: string, sourcePeriodId: string | null) => void;
  onDeletePeriod: (id: string) => void;
}

export default function PeriodSelector({
  periods,
  selectedPeriodId,
  onSelectPeriod,
  onCreatePeriod,
  onDeletePeriod,
}: PeriodSelectorProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newPeriodName, setNewPeriodName] = useState('');
  const [copyStructure, setCopyStructure] = useState(true);
  const [sourcePeriodId, setSourcePeriodId] = useState(selectedPeriodId || (periods[0]?.id || ''));
  const [error, setError] = useState('');
  const [isCustomDateRange, setIsCustomDateRange] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatFriendlyDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const year = parts[0];
    const monthNum = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthName = months[monthNum - 1] || '';
    
    return `${day.toString().padStart(2, '0')} ${monthName} ${year}`;
  };

  const formatPeriodRange = (start: string, end: string): string => {
    const startF = formatFriendlyDate(start);
    const endF = formatFriendlyDate(end);
    if (startF && endF) {
      return `${startF} - ${endF}`;
    }
    return '';
  };

  const currentPeriod = periods.find((p) => p.id === selectedPeriodId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    let periodName = '';

    if (isCustomDateRange) {
      if (!startDate || !endDate) {
        setError('Both start and end dates are required.');
        return;
      }
      if (new Date(startDate) > new Date(endDate)) {
        setError('Start date cannot be after end date.');
        return;
      }
      periodName = formatPeriodRange(startDate, endDate);
    } else {
      periodName = newPeriodName.trim();
    }

    if (!periodName) {
      setError('Period name is required.');
      return;
    }

    if (periods.some((p) => p.name.toLowerCase() === periodName.toLowerCase())) {
      setError('A period with this name or date range already exists.');
      return;
    }

    onCreatePeriod(periodName, copyStructure ? sourcePeriodId : null);
    setNewPeriodName('');
    setStartDate('');
    setEndDate('');
    setIsCreating(false);
    setError('');
  };

  return (
    <div id="period-selector-container" className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Left side: Selector */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-100 text-slate-600">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-500 uppercase tracking-wider mb-0.5">
              Active Period
            </label>
            <div className="relative flex items-center gap-2">
              <select
                id="active-period-select"
                value={selectedPeriodId}
                onChange={(e) => onSelectPeriod(e.target.value)}
                className="appearance-none bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-3 pr-10 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer min-w-[180px]"
              >
                {periods.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-500">
                <ChevronDown className="h-4 w-4" />
              </div>

              {periods.length > 1 && (
                <button
                   id="delete-period-btn"
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete the period "${currentPeriod?.name}"? All entered values for this period will be lost.`)) {
                      onDeletePeriod(selectedPeriodId);
                    }
                  }}
                  title="Delete current period"
                  className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors border border-transparent hover:border-rose-100"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right side: Create Action */}
        <div className="w-full md:w-auto">
          {!isCreating ? (
            <button
              id="add-period-toggle-btn"
              type="button"
              onClick={() => {
                setIsCreating(true);
                setIsCustomDateRange(false);
                setSourcePeriodId(selectedPeriodId || periods[0]?.id || '');
              }}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              New Financial Period
            </button>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 w-full md:max-w-2xl">
              {/* Toggle Tab */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Create Period
                </span>
                
                <div className="flex rounded-lg bg-slate-200/60 p-1 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomDateRange(false);
                      setNewPeriodName('');
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      !isCustomDateRange
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Preset / Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsCustomDateRange(true);
                      // Pre-fill default dates
                      if (!startDate) {
                        const today = new Date();
                        setStartDate(today.toISOString().split('T')[0]);
                        const nextMonth = new Date();
                        nextMonth.setMonth(nextMonth.getMonth() + 1);
                        setEndDate(nextMonth.toISOString().split('T')[0]);
                      }
                    }}
                    className={`px-3 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                      isCustomDateRange
                        ? 'bg-white text-slate-800 shadow-xs'
                        : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    Custom Date
                  </button>
                </div>
              </div>

              {/* Form Input fields */}
              <div className="flex flex-col md:flex-row items-stretch md:items-end gap-3">
                {!isCustomDateRange ? (
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-600 mb-1">
                      Period Name (e.g., Jul-Sep 2026)
                    </label>
                    <input
                      id="new-period-name-input"
                      type="text"
                      placeholder="e.g., Oct-Dec 2026"
                      value={newPeriodName}
                      onChange={(e) => {
                        setNewPeriodName(e.target.value);
                        if (error) setError('');
                      }}
                      className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                      autoFocus
                    />
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col sm:flex-row gap-2">
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Start Date
                      </label>
                      <input
                        id="new-period-start-date"
                        type="date"
                        value={startDate}
                        onChange={(e) => {
                          setStartDate(e.target.value);
                          if (error) setError('');
                        }}
                        className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        End Date
                      </label>
                      <input
                        id="new-period-end-date"
                        type="date"
                        value={endDate}
                        onChange={(e) => {
                          setEndDate(e.target.value);
                          if (error) setError('');
                        }}
                        className="w-full bg-white border border-slate-250 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-slate-700"
                      />
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-1 min-w-[150px]">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-600 py-1">
                    <input
                      id="copy-structure-checkbox"
                      type="checkbox"
                      checked={copyStructure}
                      onChange={(e) => setCopyStructure(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Copy template:</span>
                  </label>
                  <select
                    id="copy-source-select"
                    disabled={!copyStructure}
                    value={sourcePeriodId}
                    onChange={(e) => setSourcePeriodId(e.target.value)}
                    className="bg-white border border-slate-200 rounded-lg py-1 px-2 text-xs focus:outline-none disabled:opacity-50 h-8"
                  >
                    {periods.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    id="cancel-create-period-btn"
                    type="button"
                    onClick={() => {
                      setIsCreating(false);
                      setError('');
                    }}
                    className="px-3 py-1.5 h-8 rounded-lg border border-slate-250 text-slate-600 hover:bg-slate-100 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-create-period-btn"
                    type="submit"
                    className="inline-flex items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 h-8 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Create
                  </button>
                </div>
              </div>

              {/* Dynamic Preview for Custom Date */}
              {isCustomDateRange && startDate && endDate && (
                <div className="text-xs bg-blue-50 border border-blue-100 rounded-lg p-2 flex items-center justify-between text-blue-800">
                  <span className="font-semibold">Period Name Preview:</span>
                  <span className="font-mono bg-white px-2 py-0.5 rounded border border-blue-200 font-bold">
                    {formatPeriodRange(startDate, endDate) || 'Calculating...'}
                  </span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      {error && (
        <div id="period-selector-error" className="mt-2 text-xs text-rose-500 font-medium bg-rose-50 p-2 rounded-lg border border-rose-100">
          {error}
        </div>
      )}
    </div>
  );
}
