import React, { useState } from 'react';
import { Project } from '../types';
import { Building2, Plus, Clock, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

interface ProjectsViewProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onAddProject: (project: { name: string; status: Project['status']; financialYear: string }) => void;
}

export default function ProjectsView({ projects, activeProjectId, onSelectProject, onAddProject }: ProjectsViewProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [name, setName] = useState('');
  const [status, setStatus] = useState<Project['status']>('Planning');
  const [financialYear, setFinancialYear] = useState('FY 2026-27');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAddProject({ name, status, financialYear });
    setName('');
    setShowAddForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header and Add Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-display">Real Estate Projects Directory</h2>
          <p className="text-xs text-gray-500">
            Create, track, and select real estate projects. All other screens in this app are filtered by your active selected project.
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Add Project</span>
        </button>
      </div>

      {/* Add Project Dialog/Form Overlay */}
      {showAddForm && (
        <div className="bg-white border border-gray-250 p-5 rounded-xl shadow-md space-y-4 max-w-md">
          <h3 className="text-sm font-bold text-gray-900">Add New Real Estate Project</h3>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                Project Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Aurelia Heights Phase 2"
                className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Project['status'])}
                  className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                >
                  <option value="Planning">Planning</option>
                  <option value="Ongoing">Ongoing</option>
                  <option value="Completed">Completed</option>
                  <option value="On Hold">On Hold</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-gray-500 mb-1">
                  Financial Year
                </label>
                <input
                  type="text"
                  required
                  value={financialYear}
                  onChange={(e) => setFinancialYear(e.target.value)}
                  placeholder="e.g. FY 2026-27"
                  className="w-full bg-gray-50 border border-gray-250 rounded-lg p-2 text-xs focus:ring-1 focus:ring-blue-600 focus:outline-hidden"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="bg-white border border-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Create Project
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {projects.map((proj) => {
          const isActive = proj.id === activeProjectId;
          const totalIn = proj.periods.reduce((s, p) => s + p.inflows.reduce((sum, i) => sum + i.actual, 0), 0);
          const totalOut = proj.periods.reduce((s, p) => s + p.outflows.reduce((sum, o) => sum + o.actual, 0), 0);
          
          return (
            <div
              key={proj.id}
              onClick={() => onSelectProject(proj.id)}
              className={`rounded-xl border p-5 shadow-xs transition-all cursor-pointer relative flex flex-col justify-between ${
                isActive
                  ? 'bg-white border-blue-600 ring-1 ring-blue-600/40'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}
            >
              {isActive && (
                <div className="absolute top-3 right-3 bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Active
                </div>
              )}

              <div className="space-y-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
                    <Building2 className="h-4.5 w-4.5" />
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900 tracking-tight leading-tight">{proj.name}</h3>
                    <span className="text-[10px] text-gray-400 font-medium">{proj.financialYear}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                  <span className="text-gray-400 font-mono uppercase tracking-wider">Status:</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md ${
                      proj.status === 'Ongoing'
                        ? 'bg-blue-50 text-blue-700'
                        : proj.status === 'Planning'
                        ? 'bg-amber-50 text-amber-700'
                        : proj.status === 'Completed'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-rose-50 text-rose-700'
                    }`}
                  >
                    {proj.status === 'Ongoing' && <Clock className="h-3 w-3" />}
                    {proj.status === 'Planning' && <Clock className="h-3 w-3" />}
                    {proj.status === 'Completed' && <CheckCircle2 className="h-3 w-3" />}
                    {proj.status === 'On Hold' && <AlertCircle className="h-3 w-3" />}
                    {proj.status}
                  </span>
                </div>

                <div className="border-t border-gray-100 pt-3 mt-3 grid grid-cols-2 gap-2 text-center">
                  <div className="p-1.5 bg-gray-50 rounded-lg">
                    <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Inflow (Total)</span>
                    <span className="text-xs font-bold text-gray-900">{formatCurrency(totalIn)}</span>
                  </div>
                  <div className="p-1.5 bg-gray-50 rounded-lg">
                    <span className="block text-[9px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Outflow (Total)</span>
                    <span className="text-xs font-bold text-gray-900 font-medium">{formatCurrency(totalOut)}</span>
                  </div>
                </div>
              </div>


            </div>
          );
        })}
      </div>
    </div>
  );
}
