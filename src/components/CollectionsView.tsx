import React, { useState, useMemo } from 'react';
import { Project, CustomerCollection } from '../types';
import { Coins, Plus, CheckCircle, Clock, AlertTriangle, Trash2, ArrowUpRight } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface CollectionsViewProps {
  project: Project;
  onUpdateProject: (id: string, updated: Partial<Project>) => void;
}

export default function CollectionsView({ project, onUpdateProject }: CollectionsViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [amount, setAmount] = useState('');
  const [collectedAmount, setCollectedAmount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<CustomerCollection['status']>('Pending');

  // Calculate KPIs
  const kpis = useMemo(() => {
    let total = 0;
    let collected = 0;
    let pending = 0;
    let overdue = 0;

    project.collections.forEach((c) => {
      total += c.amount;
      collected += c.collectedAmount;
      const left = c.amount - c.collectedAmount;
      if (left > 0) {
        pending += left;
        if (c.status === 'Overdue') {
          overdue += left;
        }
      }
    });

    return {
      total,
      collected,
      pending,
      overdue
    };
  }, [project.collections]);

  const handleAddInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !amount) return;

    const newColl: CustomerCollection = {
      id: `coll-${Math.random().toString(36).substring(2, 9)}`,
      customerName: customerName.trim(),
      amount: parseFloat(amount) || 0,
      collectedAmount: parseFloat(collectedAmount) || 0,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      status
    };

    const collections = [...project.collections, newColl];
    onUpdateProject(project.id, { collections });

    // Reset Form
    setCustomerName('');
    setAmount('');
    setCollectedAmount('0');
    setDueDate('');
    setStatus('Pending');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    const collections = project.collections.filter((c) => c.id !== id);
    onUpdateProject(project.id, { collections });
  };

  const handleQuickCollect = (id: string, full: boolean) => {
    const collections = project.collections.map((c) => {
      if (c.id === id) {
        const nextCollected = full ? c.amount : Math.min(c.amount, c.collectedAmount + 1000000);
        const isPaid = nextCollected >= c.amount;
        return {
          ...c,
          collectedAmount: Number(nextCollected.toFixed(2)),
          status: (isPaid ? 'Paid' : c.status) as CustomerCollection['status']
        };
      }
      return c;
    });
    onUpdateProject(project.id, { collections });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Receivables */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 bg-blue-50 text-blue-600 rounded-lg shrink-0">
            <Coins className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Total Customer Invoices</span>
            <span className="block text-xl font-extrabold text-gray-900 mt-1 truncate">{formatCurrency(kpis.total)}</span>
            <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">Apartments sold & billed.</p>
          </div>
        </div>

        {/* Collected Amount */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-lg shrink-0">
            <CheckCircle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Collected Amount</span>
            <span className="block text-xl font-extrabold text-gray-900 mt-1 truncate">{formatCurrency(kpis.collected)}</span>
            <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">Cash received in bank.</p>
          </div>
        </div>

        {/* Pending Collection */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 bg-amber-50 text-amber-500 rounded-lg shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Pending Collection</span>
            <span className="block text-xl font-extrabold text-gray-900 mt-1 truncate">{formatCurrency(kpis.pending)}</span>
            <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">Waiting to be paid.</p>
          </div>
        </div>

        {/* Overdue Collection */}
        <div className="bg-white rounded-xl border border-gray-150 p-5 shadow-sm flex items-center gap-4 hover:shadow-md transition-all">
          <div className="p-3.5 bg-rose-50 text-rose-600 rounded-lg shrink-0">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Overdue Collection</span>
            <span className="block text-xl font-extrabold text-gray-900 mt-1 truncate">{formatCurrency(kpis.overdue)}</span>
            <p className="text-[9px] text-gray-400 mt-0.5 line-clamp-1">Delayed past due dates.</p>
          </div>
        </div>
      </div>

      {/* Main Table and Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display uppercase">Customer Invoices & Installment Tracking</h2>
          <p className="text-xs text-gray-500">Track milestones and collections from individual property buyers.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Buyer Invoice</span>
        </button>
      </div>

      {/* Add Invoice Form */}
      {showAddForm && (
        <form onSubmit={handleAddInvoice} className="bg-white border border-gray-250 p-5 rounded-xl shadow-xs space-y-4 max-w-lg">
          <h3 className="text-sm font-bold text-gray-900 font-display">New Customer Invoice Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Customer / Buyer Name</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Ravindra Jadeja"
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Amount Billed (₹)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000000"
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Amount Collected to Date (₹)</label>
              <input
                type="number"
                value={collectedAmount}
                onChange={(e) => setCollectedAmount(e.target.value)}
                placeholder="e.g. 1000000"
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Payment Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as CustomerCollection['status'])}
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 text-gray-700"
              >
                <option value="Pending">Pending</option>
                <option value="Paid">Paid</option>
                <option value="Overdue">Overdue</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700"
            >
              Save Invoice
            </button>
          </div>
        </form>
      )}

      {/* Customer List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 text-gray-500 uppercase tracking-wider text-[10px] font-mono border-b border-gray-200">
                <th className="py-3 px-5 font-semibold">Customer / Buyer</th>
                <th className="py-3 px-5 font-semibold">Total Invoice Amount</th>
                <th className="py-3 px-5 font-semibold">Collected Amount</th>
                <th className="py-3 px-5 font-semibold">Remaining Due</th>
                <th className="py-3 px-5 font-semibold">Due Date</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {project.collections.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-400">
                    No customer invoices or installment milestones recorded for this project yet.
                  </td>
                </tr>
              ) : (
                project.collections.map((item) => {
                  const left = Math.max(0, item.amount - item.collectedAmount);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-bold text-gray-900">{item.customerName}</td>
                      <td className="py-3 px-5">{formatCurrency(item.amount)}</td>
                      <td className="py-3 px-5 font-semibold text-emerald-600">{formatCurrency(item.collectedAmount)}</td>
                      <td className="py-3 px-5 font-semibold text-gray-800">{formatCurrency(left)}</td>
                      <td className="py-3 px-5 font-medium text-gray-500">{item.dueDate}</td>
                      <td className="py-3 px-5">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Paid'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                              : item.status === 'Overdue'
                              ? 'bg-rose-50 text-rose-700 border border-rose-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right flex items-center justify-end gap-1.5">
                        {left > 0 && (
                          <>
                            <button
                              onClick={() => handleQuickCollect(item.id, false)}
                              className="bg-gray-50 hover:bg-gray-100 border border-gray-250 text-gray-700 px-2 py-1 rounded text-[10px] font-semibold"
                              title="Collect partial installment"
                            >
                              Collect Partial
                            </button>
                            <button
                              onClick={() => handleQuickCollect(item.id, true)}
                              className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold"
                              title="Collect total outstanding amount"
                            >
                              Settle Full
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
