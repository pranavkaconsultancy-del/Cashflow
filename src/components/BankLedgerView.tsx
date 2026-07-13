import React, { useState, useMemo } from 'react';
import { Project, BankTransaction } from '../types';
import { Landmark, Plus, ArrowUpRight, ArrowDownRight, RefreshCw, Trash2 } from 'lucide-react';

interface BankLedgerViewProps {
  project: Project;
  onUpdateProject: (id: string, updated: Partial<Project>) => void;
}

export default function BankLedgerView({ project, onUpdateProject }: BankLedgerViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [date, setDate] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<BankTransaction['type']>('Deposit');
  const [amount, setAmount] = useState('');

  // Initial balance anchor
  const startingBalance = 50.0;

  // Compute running balances
  const ledgerRows = useMemo(() => {
    let current = startingBalance;
    return project.transactions.map((tx) => {
      if (tx.type === 'Deposit') {
        current += tx.amount;
      } else {
        current -= tx.amount; // Withdrawals & Transfers reduce the main bank balance
      }
      return {
        ...tx,
        runningBalance: Number(current.toFixed(2))
      };
    });
  }, [project.transactions]);

  const handleAddTransaction = (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !amount) return;

    const newTx: BankTransaction = {
      id: `tx-${Math.random().toString(36).substring(2, 9)}`,
      date: date || new Date().toISOString().split('T')[0],
      description: description.trim(),
      type,
      amount: parseFloat(amount) || 0
    };

    const transactions = [...project.transactions, newTx];
    onUpdateProject(project.id, { transactions });

    // Reset Form
    setDescription('');
    setAmount('');
    setDate('');
    setType('Deposit');
    setShowAddForm(false);
  };

  const handleDelete = (id: string) => {
    const transactions = project.transactions.filter((tx) => tx.id !== id);
    onUpdateProject(project.id, { transactions });
  };

  return (
    <div className="space-y-6">
      {/* Starting Balance and Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-100 text-blue-600 rounded-lg">
            <Landmark className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-900 font-display">Project Checking Ledger</h3>
            <p className="text-xs text-gray-500 italic">
              Bank Transactions: Register bank withdrawals, cash movements, and customer deposits to reconcile live statements.
            </p>
          </div>
        </div>

        <div className="bg-slate-50 border border-gray-200 px-4 py-2.5 rounded-lg text-right">
          <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Ledger Base Balance</span>
          <span className="text-sm font-extrabold text-gray-900">Rs. {startingBalance.toFixed(2)} Lakhs</span>
        </div>
      </div>

      {/* Table and Form Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-sm font-bold text-gray-900 tracking-tight font-display uppercase">Reconciliation Ledger Entries</h2>
          <p className="text-xs text-gray-500">View real-time credit, debit, and internal account transfer ledgers.</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-1.5 bg-[#2563EB] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Record Transaction</span>
        </button>
      </div>

      {/* Add Transaction Form */}
      {showAddForm && (
        <form onSubmit={handleAddTransaction} className="bg-white border border-gray-250 p-5 rounded-xl shadow-xs space-y-4 max-w-lg">
          <h3 className="text-sm font-bold text-gray-900 font-display">New Ledger Transaction Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Transaction Date</label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Transaction Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as BankTransaction['type'])}
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 text-gray-700"
              >
                <option value="Deposit">Deposit (Inward Credit / Receipt)</option>
                <option value="Withdrawal">Withdrawal (Debit / Outward Payment)</option>
                <option value="Transfer">Transfer (Internal Cash Movement)</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Description / Particulars</label>
              <input
                type="text"
                required
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Cleared installment from buyer Rohit Sharma"
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Amount (Rs. Lakhs)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 15.5"
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600"
              />
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
              Post Transaction
            </button>
          </div>
        </form>
      )}

      {/* Ledger Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/75 text-gray-500 uppercase tracking-wider text-[10px] font-mono border-b border-gray-200">
                <th className="py-3 px-5 font-semibold">Date</th>
                <th className="py-3 px-5 font-semibold">Description</th>
                <th className="py-3 px-5 font-semibold">Type</th>
                <th className="py-3 px-5 font-semibold">Amount</th>
                <th className="py-3 px-5 font-semibold">Current Balance</th>
                <th className="py-3 px-5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-6 text-gray-400">
                    No transactions registered in this checking ledger yet.
                  </td>
                </tr>
              ) : (
                ledgerRows.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/50">
                    <td className="py-3 px-5 font-medium text-gray-500">{item.date}</td>
                    <td className="py-3 px-5 font-semibold text-gray-900">{item.description}</td>
                    <td className="py-3 px-5">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold ${
                          item.type === 'Deposit'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : item.type === 'Withdrawal'
                            ? 'bg-rose-50 text-rose-700 border border-rose-100'
                            : 'bg-blue-50 text-blue-700 border border-blue-100'
                        }`}
                      >
                        {item.type === 'Deposit' && <ArrowUpRight className="h-3 w-3" />}
                        {item.type === 'Withdrawal' && <ArrowDownRight className="h-3 w-3" />}
                        {item.type === 'Transfer' && <RefreshCw className="h-3 w-3" />}
                        {item.type}
                      </span>
                    </td>
                    <td className={`py-3 px-5 font-bold ${item.type === 'Deposit' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {item.type === 'Deposit' ? '+' : '-'} Rs. {item.amount.toFixed(2)} Lakhs
                    </td>
                    <td className="py-3 px-5 font-bold text-gray-800">Rs. {item.runningBalance.toFixed(2)} Lakhs</td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="text-gray-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
