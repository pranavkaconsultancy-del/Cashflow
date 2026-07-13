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
  Plus
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
  const handleAddProject = (newProjData: { name: string; status: Project['status']; financialYear: string }) => {
    const newId = `proj-${Math.random().toString(36).substring(2, 9)}`;
    const newProj: Project = {
      id: newId,
      name: newProjData.name,
      status: newProjData.status,
      financialYear: newProjData.financialYear,
      periods: [
        {
          id: `per-${Math.random().toString(36).substring(2, 9)}`,
          name: 'Jan 2026',
          bankBalance: 50.0,
          cashInHand: 5.0,
          inflows: [
            { category: 'Booking Amount', budgeted: 10.0, actual: 10.0 },
            { category: 'Down Payment', budgeted: 15.0, actual: 15.0 },
            { category: 'Installment Collection', budgeted: 20.0, actual: 20.0 }
          ],
          outflows: [
            { category: 'Construction Cost', budgeted: 15.0, actual: 15.0 },
            { category: 'Material Purchase', budgeted: 10.0, actual: 10.0 },
            { category: 'Labour Cost', budgeted: 5.0, actual: 5.0 }
          ]
        }
      ],
      collections: [],
      payments: [],
      transactions: [],
      budgetVsActual: [
        { category: 'Construction Cost', budgeted: 15.0, actual: 15.0 },
        { category: 'Material Purchase', budgeted: 10.0, actual: 10.0 },
        { category: 'Labour Cost', budgeted: 5.0, actual: 5.0 }
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
        <header className="sticky top-0 z-20 bg-white border-b border-gray-200 py-3 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 shadow-xs">
          <div>
            <h1 className="text-sm font-black font-display uppercase tracking-widest text-blue-600">
              Vanguard Portfolio Co-pilot
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[11px] text-gray-400 font-mono uppercase tracking-wider font-semibold">Active Project Context:</span>
              <select
                id="global-project-switcher"
                value={activeProjectId}
                onChange={(e) => setActiveProjectId(e.target.value)}
                className="bg-[#2563EB]/10 border border-blue-200 text-[#2563EB] text-xs font-bold rounded-lg px-2.5 py-1 cursor-pointer focus:outline-hidden"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.status})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-[10px] text-gray-500 font-mono text-right hidden lg:block leading-relaxed">
            <div>Holding Company Portfolio Control Center</div>
            <div className="font-semibold text-gray-700">Currency: Rs. Lakhs (1 L = ₹1,00,000)</div>
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

        </main>

        {/* Dynamic Ask AI Chatbot floating dock */}
        <ChatbotPanel project={activeProject} />
      </div>
    </div>
  );
}
