import React, { useMemo } from 'react';
import { Project } from '../types';
import { Filter, RotateCcw, Building2, Calendar, Shield, MapPin, Tag } from 'lucide-react';

interface GlobalFilterBarProps {
  projects: Project[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  filters: {
    company: string;
    project: string;
    financialYear: string;
    month: string;
    department: string;
    startDate: string;
    endDate: string;
  };
  onChangeFilters: (newFilters: any) => void;
}

export default function GlobalFilterBar({
  projects,
  activeProjectId,
  onSelectProject,
  filters,
  onChangeFilters
}: GlobalFilterBarProps) {
  // Get all unique companies
  const companies = useMemo(() => {
    const list = new Set<string>();
    projects.forEach((p) => {
      if (p.company) list.add(p.company);
    });
    return ['All', ...Array.from(list)];
  }, [projects]);

  // Get all unique financial years
  const financialYears = useMemo(() => {
    const list = new Set<string>();
    projects.forEach((p) => {
      if (p.financialYear) list.add(p.financialYear);
    });
    return ['All', ...Array.from(list)];
  }, [projects]);

  // Get projects filtered by active company
  const availableProjects = useMemo(() => {
    if (filters.company === 'All') return projects;
    return projects.filter((p) => p.company === filters.company);
  }, [projects, filters.company]);

  // Get all unique period names/months from available projects
  const availableMonths = useMemo(() => {
    const list = new Set<string>();
    availableProjects.forEach((p) => {
      p.periods.forEach((per) => {
        if (per.name) list.add(per.name);
      });
    });
    return ['All', ...Array.from(list)];
  }, [availableProjects]);

  const departments = [
    'All',
    'Construction',
    'Finance',
    'Marketing',
    'Legal',
    'Design',
    'HR & Admin',
    'Operations'
  ];

  const handleReset = () => {
    onChangeFilters({
      company: 'All',
      project: activeProjectId,
      financialYear: 'All',
      month: 'All',
      department: 'All',
      startDate: '',
      endDate: ''
    });
  };

  const updateField = (field: string, value: string) => {
    const nextFilters = { ...filters, [field]: value };
    
    // Sync activeProjectId if project selection changes
    if (field === 'project') {
      if (value !== 'All') {
        onSelectProject(value);
      }
    }

    // Sync company project if company changes
    if (field === 'company') {
      if (value !== 'All') {
        const compProjs = projects.filter(p => p.company === value);
        if (compProjs.length > 0 && !compProjs.some(p => p.id === activeProjectId)) {
          onSelectProject(compProjs[0].id);
          nextFilters.project = compProjs[0].id;
        }
      } else {
        nextFilters.project = activeProjectId;
      }
    }

    onChangeFilters(nextFilters);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs space-y-3">
      {/* Title block */}
      <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-blue-600" />
          <span className="text-xs font-bold text-gray-900 uppercase tracking-wider font-mono">Global Portfolio Filter Console</span>
        </div>
        <button
          onClick={handleReset}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 hover:text-blue-600 transition-colors uppercase font-mono cursor-pointer"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Filters
        </button>
      </div>

      {/* Grid of Selectors */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {/* Company Filter */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">
            <Building2 className="h-3 w-3 text-gray-400" /> Company
          </label>
          <select
            value={filters.company}
            onChange={(e) => updateField('company', e.target.value)}
            className="w-full bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            {companies.map((c) => (
              <option key={c} value={c}>
                {c === 'All' ? 'All Companies' : c}
              </option>
            ))}
          </select>
        </div>

        {/* Project Context */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">
            <MapPin className="h-3 w-3 text-gray-400" /> Project Context
          </label>
          <select
            value={filters.project}
            onChange={(e) => updateField('project', e.target.value)}
            className="w-full bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 font-bold focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            <option value="All">All Projects</option>
            {availableProjects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {/* Financial Year */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-400" /> Fin Year
          </label>
          <select
            value={filters.financialYear}
            onChange={(e) => updateField('financialYear', e.target.value)}
            className="w-full bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            {financialYears.map((fy) => (
              <option key={fy} value={fy}>
                {fy === 'All' ? 'All FYs' : fy}
              </option>
            ))}
          </select>
        </div>

        {/* Month / Period */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">
            <Calendar className="h-3 w-3 text-gray-400" /> Reporting Month
          </label>
          <select
            value={filters.month}
            onChange={(e) => updateField('month', e.target.value)}
            className="w-full bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            {availableMonths.map((m) => (
              <option key={m} value={m}>
                {m === 'All' ? 'All Months' : m}
              </option>
            ))}
          </select>
        </div>

        {/* Department */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">
            <Shield className="h-3 w-3 text-gray-400" /> Department
          </label>
          <select
            value={filters.department}
            onChange={(e) => updateField('department', e.target.value)}
            className="w-full bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 font-semibold focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer"
          >
            {departments.map((dept) => (
              <option key={dept} value={dept}>
                {dept === 'All' ? 'All Departments' : dept}
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Start */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">
            Date From
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => updateField('startDate', e.target.value)}
            className="w-full bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1 text-xs text-gray-700 font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer"
          />
        </div>

        {/* Date Range End */}
        <div>
          <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1 font-mono flex items-center gap-1">
            Date To
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => updateField('endDate', e.target.value)}
            className="w-full bg-gray-50 border border-gray-250 rounded-lg px-2.5 py-1 text-xs text-gray-700 font-mono focus:outline-hidden focus:ring-1 focus:ring-blue-600 cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
}
