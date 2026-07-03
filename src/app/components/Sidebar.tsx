import { useState, type ElementType } from 'react';
import {
  ShoppingCart, LayoutDashboard, Package, BarChart2, Settings,
  ChevronLeft, ChevronRight, X, Coffee, ShoppingBag, LogOut, Moon, Sun, Users, Receipt, PieChart
} from 'lucide-react';
import type { BusinessType, ViewType, User } from './mockData';

interface SidebarProps {
  currentView: ViewType;
  onViewChange: (v: ViewType) => void;
  businessType: BusinessType;
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onLogout: () => void;
  allowedViews: ViewType[];
  darkMode: boolean;
  onToggleDark: () => void;
}

const NAV_ITEMS: { id: ViewType; label: string; icon: ElementType }[] = [
  { id: 'pos',         label: 'POS Terminal', icon: ShoppingCart    },
  { id: 'dashboard',   label: 'Dashboard',    icon: LayoutDashboard },
  { id: 'daily-sales', label: 'Daily Sales',  icon: Receipt         },
  { id: 'customers',   label: 'Customers',    icon: Users           },
  { id: 'inventory',   label: 'Inventory',    icon: Package         },
  { id: 'reports',     label: 'Reports',      icon: PieChart        },
];

export function Sidebar({ currentView, onViewChange, businessType, isOpen, onClose, currentUser, onLogout, allowedViews, darkMode, onToggleDark }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const handleNav = (id: ViewType) => {
    onViewChange(id);
    onClose();
  };

  const divider  = darkMode ? 'border-slate-800/50' : 'border-slate-200/50';
  const navHover = darkMode ? 'hover:bg-slate-800/50 hover:text-slate-200' : 'hover:bg-slate-100/50 hover:text-slate-800';
  const textInact = darkMode ? 'text-slate-400' : 'text-slate-600';

  return (
    <>
      {isOpen && (
        <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 h-full flex flex-col shrink-0 transition-all duration-300 backdrop-blur-xl ${
          darkMode ? 'bg-slate-900/60 text-slate-300 border-slate-800/50' : 'bg-white/60 text-slate-600 border-slate-200/50'
        } ${isOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 ${collapsed ? 'w-20' : 'w-64'} border-r`}
      >
        {/* Header */}
        <div className={`flex items-center gap-3 px-4 h-16 border-b ${divider} shrink-0`}>
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-blue-600 shrink-0">
            {businessType === 'fnb'
              ? <Coffee size={16} className="text-white" />
              : <ShoppingBag size={16} className="text-white" />
            }
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <div className={`truncate text-sm font-semibold ${darkMode ? 'text-white' : 'text-slate-900'}`}>POS Pro</div>
              <div className="text-xs text-slate-500 truncate">
                {businessType === 'fnb' ? 'F&B Mode' : 'Retail Mode'}
              </div>
            </div>
          )}
          <button onClick={onClose} className="md:hidden text-slate-500 hover:text-white p-1 transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 py-4 space-y-0.5 px-2 overflow-y-auto">
          {NAV_ITEMS.filter(item => allowedViews.includes(item.id)).map(({ id, label, icon: Icon }) => {
            const active = currentView === id;
            return (
              <button
                key={id}
                onClick={() => handleNav(id)}
                title={collapsed ? label : undefined}
                className={[
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left relative',
                  active
                    ? 'bg-blue-600/15 text-blue-400 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-blue-400'
                    : `${textInact} ${navHover}`,
                  collapsed ? 'justify-center' : '',
                ].join(' ')}
              >
                <Icon size={18} className="shrink-0" />
                {!collapsed && <span className="text-sm font-medium">{label}</span>}
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className={`border-t ${divider} p-2 space-y-0.5`}>
          {allowedViews.includes('settings') && (
            <button
              onClick={() => handleNav('settings')}
              title={collapsed ? 'Settings' : undefined}
              className={[
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left relative',
                currentView === 'settings'
                  ? 'bg-blue-600/15 text-blue-400 before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:h-5 before:w-0.5 before:rounded-full before:bg-blue-400'
                  : `${textInact} ${navHover}`,
                collapsed ? 'justify-center' : '',
              ].join(' ')}
            >
              <Settings size={18} className="shrink-0" />
              {!collapsed && <span className="text-sm font-medium">Settings</span>}
            </button>
          )}

          {/* Dark mode toggle */}
          <button
            onClick={onToggleDark}
            title={collapsed ? (darkMode ? 'Light Mode' : 'Dark Mode') : undefined}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${textInact} ${navHover} ${collapsed ? 'justify-center' : ''}`}
          >
            {darkMode ? <Sun size={18} className="shrink-0" /> : <Moon size={18} className="shrink-0" />}
            {!collapsed && <span className="text-sm font-medium">{darkMode ? 'Light Mode' : 'Dark Mode'}</span>}
          </button>

          {/* User profile */}
          <div className={`flex items-center gap-3 px-3 py-2.5 border-t ${divider} mt-1`}>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs shrink-0 font-bold">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${darkMode ? 'text-slate-200' : 'text-slate-700'}`}>{currentUser.name}</p>
                  <p className={`text-xs ${darkMode ? 'text-slate-400' : 'text-slate-500'} capitalize`}>{currentUser.role}</p>
                </div>
                <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors p-1" title="Logout">
                  <LogOut size={15} />
                </button>
              </>
            )}
            {collapsed && (
              <button onClick={onLogout} className="text-slate-500 hover:text-red-400 transition-colors" title="Logout">
                <LogOut size={15} />
              </button>
            )}
          </div>
        </div>

        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full ${darkMode ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200 shadow-sm'} border items-center justify-center ${darkMode ? 'hover:bg-slate-700' : 'hover:bg-slate-50'} transition-colors`}
        >
          {collapsed
            ? <ChevronRight size={12} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
            : <ChevronLeft  size={12} className={darkMode ? 'text-slate-400' : 'text-slate-500'} />
          }
        </button>
      </aside>
    </>
  );
}
