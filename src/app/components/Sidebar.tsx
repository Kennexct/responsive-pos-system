import { useState, type ElementType } from 'react';
import {
  ShoppingCart, LayoutDashboard, Package, BarChart2, Settings,
  Store, ChevronLeft, ChevronRight, X, Coffee, ShoppingBag,
} from 'lucide-react';
import type { BusinessType, ViewType } from './mockData';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (v: ViewType) => void;
  businessType: BusinessType;
  isOpen: boolean;
  onClose: () => void;
}

const NAV_ITEMS: { id: ViewType; label: string; icon: ElementType }[] = [
  { id: 'pos',       label: 'POS Terminal', icon: ShoppingCart    },
  { id: 'dashboard', label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory',    icon: Package         },
  { id: 'reports',   label: 'Reports',      icon: BarChart2       },
];

export function Sidebar({ currentView, onViewChange, businessType, isOpen, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleNav = (id: ViewType) => {
    onViewChange(id);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={[
          'fixed top-0 left-0 z-50 h-full flex flex-col bg-slate-900 text-white transition-all duration-300',
          // Mobile: slide in/out
          'md:relative md:translate-x-0',
          isOpen ? 'translate-x-0 w-64' : '-translate-x-full w-64',
          // Desktop: collapsible
          'md:flex',
          collapsed ? 'md:w-16' : 'md:w-60',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-slate-700 shrink-0">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
            {businessType === 'fnb' ? (
              <Coffee size={16} className="text-white" />
            ) : (
              <ShoppingBag size={16} className="text-white" />
            )}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className="truncate text-sm text-white" style={{ fontWeight: 600 }}>
                Warung Kopi
              </div>
              <div className="text-xs text-slate-400 truncate">
                {businessType === 'fnb' ? 'F&B Mode' : 'Retail Mode'}
              </div>
            </div>
          )}
          {/* Close on mobile */}
          <button
            onClick={onClose}
            className="md:hidden text-slate-400 hover:text-white p-1"
          >
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-1 px-2 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                title={collapsed ? label : undefined}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
                  active
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                  collapsed ? 'justify-center' : '',
                ].join(' ')}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && <span className="text-sm">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-slate-700 p-2 space-y-1">
          <button
            onClick={() => handleNav('settings')}
            title={collapsed ? 'Settings' : undefined}
            className={[
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-left',
              currentView === 'settings'
                ? 'bg-blue-600 text-white'
                : 'text-slate-300 hover:bg-slate-800 hover:text-white',
              collapsed ? 'justify-center' : '',
            ].join(' ')}
          >
            <Settings size={20} className="shrink-0" />
            {!collapsed && <span className="text-sm">Settings</span>}
          </button>

          {!collapsed && (
            <div className="flex items-center gap-3 px-3 py-2">
              <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-xs shrink-0">
                B
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white truncate">Budi Santoso</div>
                <div className="text-xs text-slate-400">Cashier</div>
              </div>
              <Store size={14} className="text-slate-400 shrink-0" />
            </div>
          )}
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-slate-700 border border-slate-600 items-center justify-center hover:bg-slate-600 transition-colors"
        >
          {collapsed ? (
            <ChevronRight size={12} className="text-white" />
          ) : (
            <ChevronLeft size={12} className="text-white" />
          )}
        </button>
      </aside>
    </>
  );
}
