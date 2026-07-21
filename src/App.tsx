/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Project } from './types';
import { getSeedProjects } from './initialData';

// Modular Components
import Sidebar from './components/Sidebar';
import ProjectsView from './components/ProjectsView';
import DashboardView from './components/DashboardView';
import CashFlowView from './components/CashFlowView';
import CollectionsView from './components/CollectionsView';
import PaymentsView from './components/PaymentsView';
import BankLedgerView from './components/BankLedgerView';
import BudgetVsActualView from './components/BudgetVsActualView';
import PredictionsView from './components/PredictionsView';
import ReportsView from './components/ReportsView';
import ChatbotPanel from './components/ChatbotPanel';
import ImportView from './components/ImportView';
import Logo from './components/Logo';

import {
  Building2,
  LayoutDashboard,
  Table,
  Coins,
  CreditCard,
  Landmark,
  ShieldCheck,
  TrendingUp,
  FileText,
  Plus,
  Search,
  Bell
} from 'lucide-react';

const STORAGE_KEY = 'real_estate_portfolio_projects_v2';
const ACTIVE_PROJECT_KEY = 'real_estate_portfolio_active_project_id_v2';

export default function App() {
  // 1. Current Tab State
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // 2. Full Projects Database State
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error('Failed to parse saved projects state', e);
      }
    }
    return getSeedProjects();
  });

  // 3. Active Project Selection State
  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    const saved = localStorage.getItem(ACTIVE_PROJECT_KEY);
    if (saved && projects.some((p) => p.id === saved)) {
      return saved;
    }
    return projects[0]?.id || '';
  });

  // Sync state to local storage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    localStorage.setItem(ACTIVE_PROJECT_KEY, activeProjectId);
  }, [activeProjectId]);

  // Lookup active project
  const activeProject = useMemo(() => {
    return projects.find((p) => p.id === activeProjectId) || projects[0];
  }, [projects, activeProjectId]);

  // Handle Project Property Update
  const handleUpdateProject = (projectId: string, updatedFields: Partial<Project>) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === projectId) {
          return { ...proj, ...updatedFields };
        }
        return proj;
      })
    );
  };

  // Add New Project Action
  const handleAddProject = (newProjData: { name: string; status: Project['status']; financialYear: string; company?: string }) => {
    const newId = `proj-${Math.random().toString(36).substring(2, 9)}`;
    const newProj: Project = {
      id: newId,
      name: newProjData.name,
      company: newProjData.company || 'SyncAI Consultancy Pvt. Ltd.',
      status: newProjData.status,
      financialYear: newProjData.financialYear,
      periods: [
        {
          id: `per-${Math.random().toString(36).substring(2, 9)}`,
          name: 'Jan 2026',
          bankBalance: 5000000,
          cashInHand: 500000,
          inflows: [
            { category: 'Booking Amount', budgeted: 1000000, actual: 1000000 },
            { category: 'Down Payment', budgeted: 1500000, actual: 1500000 },
            { category: 'Installment Collection', budgeted: 2000000, actual: 2000000 }
          ],
          outflows: [
            { category: 'Construction Cost', budgeted: 1500000, actual: 1500000 },
            { category: 'Material Purchase', budgeted: 1000000, actual: 1000000 },
            { category: 'Labour Cost', budgeted: 500000, actual: 500000 }
          ]
        }
      ],
      collections: [],
      payments: [],
      transactions: [],
      budgetVsActual: [
        { category: 'Construction Cost', budgeted: 1500000, actual: 1500000 },
        { category: 'Material Purchase', budgeted: 1000000, actual: 1000000 },
        { category: 'Labour Cost', budgeted: 500000, actual: 500000 }
      ]
    };

    setProjects((prev) => [...prev, newProj]);
    setActiveProjectId(newId);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8F9FA] text-[#1A1A1A] font-sans antialiased">
      
      {/* Responsive sidebar navigation */}
      <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-[#F8F9FA]">
        
        {/* Global sticky header with project switcher switcher ALWAYS visible! */}
        <header className="sticky top-0 z-20 bg-gradient-to-r from-[#0F1F3D] to-[#0EA5B7] text-white py-3 px-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4 shadow-md border-b border-white/10">
          {/* Left: Brand/Context Switcher */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 shrink-0">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Logo size="sm" variant="dark" />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] text-white/75 font-mono uppercase tracking-wider font-semibold">Context:</span>
                <select
                  id="global-project-switcher"
                  value={activeProjectId}
                  onChange={(e) => setActiveProjectId(e.target.value)}
                  className="bg-white/15 border border-white/20 text-white text-xs font-bold rounded-lg px-2 py-0.5 cursor-pointer focus:outline-hidden focus:bg-[#0F1F3D] transition-colors"
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id} className="text-gray-900 bg-white">
                      {p.name} ({p.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Center: Search Bar with subtle translucent/glassy look */}
          <div className="flex-1 max-w-sm md:max-w-md mx-auto w-full relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-white/60" />
            <input
              type="text"
              placeholder="Search accounts, ledgers, bills..."
              className="w-full bg-white/15 placeholder-white/60 text-white text-xs pl-9 pr-4 py-2 rounded-lg border border-white/10 focus:outline-hidden focus:bg-white/25 focus:border-white/30 transition-all backdrop-blur-xs"
            />
          </div>

          {/* Right side: Bell icon, User avatar/profile chip */}
          <div className="flex items-center justify-between md:justify-end gap-4 shrink-0">
            <div className="flex items-center gap-3">
              {/* Notification Bell */}
              <button className="relative p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute top-1 right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                </span>
              </button>

              {/* User profile chip */}
              <div className="flex items-center gap-2 px-3 py-1 bg-white/10 rounded-full border border-white/10">
                <div className="h-6 w-6 rounded-full bg-[#0EA5B7] border border-white/20 flex items-center justify-center overflow-hidden">
                  <span className="text-[10px] font-black text-white">PK</span>
                </div>
                <span className="text-xs font-semibold text-white hidden sm:inline">Pranav K.</span>
              </div>
            </div>

            <div className="text-[10px] text-white/90 font-mono text-right hidden xl:block leading-relaxed">
              <div>Portfolio Control Center</div>
              <div className="font-bold text-[#0EA5B7]">INR (₹)</div>
            </div>
          </div>
        </header>

        {/* Content Pane */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          
          {/* Conditional view loading */}
          {currentTab === 'projects' && (
            <ProjectsView
              projects={projects}
              activeProjectId={activeProjectId}
              onSelectProject={setActiveProjectId}
              onAddProject={handleAddProject}
            />
          )}

          {currentTab === 'dashboard' && (
            <DashboardView
              project={activeProject}
              projects={projects}
            />
          )}

          {currentTab === 'cashflow' && (
            <CashFlowView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentTab === 'collections' && (
            <CollectionsView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentTab === 'payments' && (
            <PaymentsView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentTab === 'ledger' && (
            <BankLedgerView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

          {currentTab === 'budget' && (
            <BudgetVsActualView
              project={activeProject}
            />
          )}

          {currentTab === 'predictions' && (
            <PredictionsView
              project={activeProject}
            />
          )}

          {currentTab === 'reports' && (
            <ReportsView
              project={activeProject}
              projects={projects}
            />
          )}

          {currentTab === 'import' && (
            <ImportView
              project={activeProject}
              onUpdateProject={handleUpdateProject}
            />
          )}

        </main>

        {/* Dynamic Ask AI Chatbot floating dock */}
        <ChatbotPanel project={activeProject} />
      </div>
    </div>
  );
}
