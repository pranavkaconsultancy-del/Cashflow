import React, { useState, useMemo } from 'react';
import { Project, VendorPayment } from '../types';
import { ShieldAlert, Plus, CheckCircle, Clock, AlertTriangle, Trash2, CreditCard } from 'lucide-react';

interface PaymentsViewProps {
  project: Project;
  onUpdateProject: (id: string, updated: Partial<Project>) => void;
}

export default function PaymentsView({ project, onUpdateProject }: PaymentsViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [vendorName, setVendorName] = useState('');
  const [amount, setAmount] = useState('');
  const [paidAmount, setPaidAmount] = useState('0');
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState<VendorPayment['status']>('Pending');

  // Calculate KPIs
  const kpis = useMemo(() => {
    let total = 0;
    let paid = 0;
    let pending = 0;
    let overdue = 0;

    project.payments.forEach((p) => {
      total += p.amount;
      paid += p.paidAmount;
      const left = p.amount - p.paidAmount;
      if (left > 0) {
        pending += left;
        if (p.status === 'Overdue') {
          overdue += left;
        }
      }
    });

    return {
      total,
      paid,
      pending,
      overdue
    };
  }, [project.payments]);

  const handleAddBill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendorName.trim() || !amount) return;

    const newPay: VendorPayment = {
      id: `pay-${Math.random().toString(36).substring(2, 9)}`,
      vendorName: vendorName.trim(),
      amount: parseFloat(amount) || 0,
      paidAmount: parseFloat(paidAmount) || 0,
      dueDate: dueDate || new Date().toISOString().split('T')[0],
      status
    };

    const payments = [...project.payments, newPay];
    onUpdateProject(project.id, { payments });

    // Reset Form
    setVendorName('');
    setAmount('');
    setPaidAmount('0');
    setDueDate('');
    setStatus('Pending');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    const payments = project.payments.filter((p) => p.id !== id);
    onUpdateProject(project.id, { payments });
  };

  const handleQuickPay = (id: string, full: boolean) => {
    const payments = project.payments.map((p) => {
      if (p.id === id) {
        const nextPaid = full ? p.amount : Math.min(p.amount, p.paidAmount + 10);
        const isPaid = nextPaid >= p.amount;
        return {
          ...p,
          paidAmount: Number(nextPaid.toFixed(2)),
          status: (isPaid ? 'Paid' : p.status) as VendorPayment['status']
        };
      }
      return p;
    });
    onUpdateProject(project.id, { payments });
  };

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Payables */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Total Vendor Invoices</span>
            <span className="block text-xl font-black text-gray-900 mt-1">Rs. {kpis.total.toFixed(2)} L</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Plain-English: Total value of cement, steel, & contracting bills received.</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <CreditCard className="h-6 w-6" />
          </div>
        </div>

        {/* Paid Amount */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Paid Amount</span>
            <span className="block text-xl font-black text-emerald-600 mt-1">Rs. {kpis.paid.toFixed(2)} L</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Plain-English: Bills we have paid out of our bank to contractors.</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle className="h-6 w-6" />
          </div>
        </div>

        {/* Pending Amount */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Pending Payables</span>
            <span className="block text-xl font-black text-amber-500 mt-1">Rs. {kpis.pending.toFixed(2)} L</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Plain-English: Material or services received that we still owe cash for.</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-500 rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
        </div>

        {/* Overdue Payments */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex items-center justify-between">
          <div>
            <span className="block text-[10px] font-mono tracking-wider uppercase text-gray-400 font-bold">Overdue Payments</span>
            <span className="block text-xl font-black text-rose-600 mt-1">Rs. {kpis.overdue.toFixed(2)} L</span>
            <p className="text-[10px] text-gray-500 mt-0.5">Plain-English: Bills where our payment date has lapsed.</p>
          </div>
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Main Table and Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display uppercase">Vendor & Contractor Accounts Payable</h2>
          <p className="text-xs text-gray-500">Track bills, purchase orders, and settlements with construction suppliers.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Vendor Invoice</span>
        </button>
      </div>

      {/* Add Invoice Form */}
      {showAddForm && (
        <form onSubmit={handleAddBill} className="bg-white border border-gray-250 p-5 rounded-xl shadow-xs space-y-4 max-w-lg">
          <h3 className="text-sm font-bold text-gray-900 font-display">New Vendor Invoice Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Vendor / Contractor Name</label>
              <input
                type="text"
                required
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder="e.g. Jindal Steel Corp"
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
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Total Amount Owed (Rs. Lakhs)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 25.0"
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Amount Paid to Date (Rs. Lakhs)</label>
              <input
                type="number"
                value={paidAmount}
                onChange={(e) => setPaidAmount(e.target.value)}
                placeholder="e.g. 5.0"
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Invoice Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as VendorPayment['status'])}
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
              className="bg-[#2563EB] text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700"
            >
              Save Invoice
            </button>
          </div>
        </form>
      )}

      {/* Vendor List Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 text-gray-500 uppercase tracking-wider text-[10px] font-mono border-b border-gray-200">
                <th className="py-3 px-5 font-semibold">Vendor / Supplier</th>
                <th className="py-3 px-5 font-semibold">Total Invoice Amount</th>
                <th className="py-3 px-5 font-semibold">Paid Amount</th>
                <th className="py-3 px-5 font-semibold">Remaining Balance</th>
                <th className="py-3 px-5 font-semibold">Due Date</th>
                <th className="py-3 px-5 font-semibold">Status</th>
                <th className="py-3 px-5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {project.payments.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-gray-400">
                    No vendor bills or contractor payments logged for this project yet.
                  </td>
                </tr>
              ) : (
                project.payments.map((item) => {
                  const left = Math.max(0, item.amount - item.paidAmount);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/50">
                      <td className="py-3 px-5 font-bold text-gray-900">{item.vendorName}</td>
                      <td className="py-3 px-5">Rs. {item.amount.toFixed(2)} Lakhs</td>
                      <td className="py-3 px-5 font-semibold text-emerald-600">Rs. {item.paidAmount.toFixed(2)} Lakhs</td>
                      <td className="py-3 px-5 font-semibold text-gray-800">Rs. {left.toFixed(2)} Lakhs</td>
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
                              onClick={() => handleQuickPay(item.id, false)}
                              className="bg-gray-50 hover:bg-gray-100 border border-gray-250 text-gray-700 px-2 py-1 rounded text-[10px] font-semibold"
                              title="Pay Rs. 10 Lakhs installment"
                            >
                              Pay Partial
                            </button>
                            <button
                              onClick={() => handleQuickPay(item.id, true)}
                              className="bg-rose-50 hover:bg-rose-100 border border-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-bold"
                              title="Pay total outstanding amount"
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
