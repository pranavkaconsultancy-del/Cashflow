import React from 'react';
import {
  LayoutDashboard,
  Table,
  Percent,
  TrendingUp,
  FileText,
  Building2,
  Menu,
  X,
  FolderOpen,
  Coins,
  CreditCard,
  Landmark,
  Scale,
  RefreshCw
} from 'lucide-react';
import Logo from './Logo';

interface SidebarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export default function Sidebar({ currentTab, setCurrentTab }: SidebarProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const menuItems = [
    { id: 'projects', label: 'Projects Directory', icon: FolderOpen },
    { id: 'dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
    { id: 'cashflow', label: 'Cash Flow Ledgers', icon: Table },
    { id: 'collections', label: 'Customer Collections', icon: Coins },
    { id: 'payments', label: 'Vendor Payments', icon: CreditCard },
    { id: 'ledger', label: 'Checking Ledger', icon: Landmark },
    { id: 'budget', label: 'Budget vs Actuals', icon: Scale },
    { id: 'predictions', label: '30/90-Day Runway', icon: TrendingUp },
    { id: 'reports', label: 'Report & Statements', icon: FileText },
    { id: 'import', label: 'Tally & Data Import', icon: RefreshCw },
  ];

  const handleTabClick = (id: string) => {
    setCurrentTab(id);
    setIsOpen(false);
  };

  return (
    <>
      {/* Mobile Top Header with Hamburger */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-gray-200 sticky top-0 z-30">
        <Logo size="sm" />
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600 transition-colors"
        >
          {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Sidebar Container */}
      <aside
        className={`fixed md:sticky top-0 left-0 z-40 h-screen md:h-screen w-64 bg-gray-50 border-r border-gray-200 flex flex-col p-4 shrink-0 transition-transform duration-300 md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
         } md:block`}
      >
        {/* Brand */}
        <div className="hidden md:flex items-center gap-3 mb-8 px-2 pt-2">
          <Logo size="md" />
        </div>

        {/* Navigation */}
        <nav className="space-y-1.5 flex-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                  isActive
                    ? 'bg-white text-blue-600 border border-gray-200 shadow-xs'
                    : 'text-gray-600 hover:bg-gray-200/50 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`h-4 w-4 ${isActive ? 'text-blue-600' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </div>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="border-t border-gray-200 pt-4 mt-auto">
          <div className="px-2 text-[10px] text-gray-500 font-mono leading-relaxed">
            <div>Holding Company v1.0.0</div>
            <div>Currency: INR (₹)</div>
          </div>
        </div>
      </aside>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 z-30 bg-black/20 md:hidden transition-opacity"
        />
      )}
    </>
  );
}
