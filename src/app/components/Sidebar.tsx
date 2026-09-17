import { useState, type ElementType } from 'react';
import {
  ShoppingCart, LayoutDashboard, Package, Settings,
  ChevronLeft, ChevronRight, X, LogOut, Moon, Sun, Users, Receipt, PieChart, ShieldCheck
} from 'lucide-react';
import type { BusinessType, ViewType, User } from './mockData';
import { VPosLogo } from './VPosLogo';

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

type NavItem = { id: ViewType; label: string; icon: ElementType };

// Grouped by the job at hand: selling at the counter vs. running the business.
const SELL: NavItem[] = [
  { id: 'pos',         label: 'Checkout',    icon: ShoppingCart },
  { id: 'daily-sales', label: 'Today\'s sales', icon: Receipt },
  { id: 'customers',   label: 'Customers',   icon: Users },
];
const MANAGE: NavItem[] = [
  { id: 'dashboard',   label: 'Overview',    icon: LayoutDashboard },
  { id: 'inventory',   label: 'Products & stock', icon: Package },
  { id: 'reports',     label: 'Reports',     icon: PieChart },
];
const PLATFORM: NavItem[] = [
  { id: 'superadmin',  label: 'Merchants',   icon: ShieldCheck },
];

export function Sidebar({ currentView, onViewChange, businessType, isOpen, onClose, currentUser, onLogout, allowedViews, darkMode, onToggleDark }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);

  const go = (id: ViewType) => { onViewChange(id); onClose(); };

  const NavButton = ({ id, label, icon: Icon }: NavItem) => {
    const active = currentView === id;
    return (
      <button
        type="button"
        onClick={() => go(id)}
        title={collapsed ? label : undefined}
        aria-current={active ? 'page' : undefined}
        className={[
          'group relative w-full flex items-center gap-3 rounded-md px-3 h-10 text-left text-sm cursor-pointer',
          active
            ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-brand-500/15 dark:text-brand-200'
            : 'text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 font-medium',
          collapsed ? 'justify-center px-0' : '',
        ].join(' ')}
      >
        {active && <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-r bg-brand-600 dark:bg-brand-400" />}
        <Icon size={18} strokeWidth={active ? 2.25 : 1.75} className="shrink-0" />
        {!collapsed && <span className="truncate">{label}</span>}
      </button>
    );
  };

  const Group = ({ title, items }: { title: string; items: NavItem[] }) => {
    const visible = items.filter(i => allowedViews.includes(i.id));
    if (visible.length === 0) return null;
    return (
      <div className="space-y-0.5">
        {!collapsed && <p className="px-3 pt-4 pb-1.5 text-xs font-medium text-ink-400 dark:text-ink-500">{title}</p>}
        {collapsed && <div className="mx-3 my-3 h-px bg-ink-200 dark:bg-ink-800" />}
        {visible.map(i => <NavButton key={i.id} {...i} />)}
      </div>
    );
  };

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-40 bg-ink-950/50 md:hidden" onClick={onClose} aria-hidden />}

      <aside
        aria-label="Main navigation"
        className={`fixed md:static inset-y-0 left-0 z-50 h-full flex flex-col shrink-0 border-r bg-white border-ink-200 dark:bg-ink-900 dark:border-ink-800 transition-[width,transform] duration-200 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:translate-x-0 ${collapsed ? 'w-[72px]' : 'w-60'}`}
      >
        <div className={`flex items-center gap-3 h-16 px-4 shrink-0 border-b border-ink-200 dark:border-ink-800 ${collapsed ? 'justify-center px-0' : ''}`}>
          <VPosLogo size={32} />
          {!collapsed && (
            <div className="flex-1 min-w-0 leading-tight">
              <div className="truncate font-bold text-ink-900 dark:text-ink-50">VPos</div>
              <div className="text-xs text-ink-500 truncate">{businessType === 'fnb' ? 'Café & restaurant' : 'Retail shop'}</div>
            </div>
          )}
          <button type="button" onClick={onClose} aria-label="Close menu" className="md:hidden p-1.5 rounded-md text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800 cursor-pointer">
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 pb-4">
          <Group title="Platform" items={PLATFORM} />
          <Group title="Sell" items={SELL} />
          <Group title="Manage" items={MANAGE} />
        </nav>

        <div className="border-t border-ink-200 dark:border-ink-800 p-2 space-y-0.5">
          {allowedViews.includes('settings') && <NavButton id="settings" label="Settings" icon={Settings} />}
          <button
            type="button"
            onClick={onToggleDark}
            title={collapsed ? (darkMode ? 'Light mode' : 'Dark mode') : undefined}
            className={`w-full flex items-center gap-3 rounded-md px-3 h-10 text-sm font-medium cursor-pointer text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-ink-100 ${collapsed ? 'justify-center px-0' : ''}`}
          >
            {darkMode ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
            {!collapsed && <span>{darkMode ? 'Light mode' : 'Dark mode'}</span>}
          </button>

          <div className={`flex items-center gap-3 mt-1 pt-3 px-2 border-t border-ink-200 dark:border-ink-800 ${collapsed ? 'flex-col px-0' : ''}`}>
            <div aria-hidden className="w-8 h-8 rounded-full bg-ink-900 text-ink-50 dark:bg-ink-100 dark:text-ink-900 flex items-center justify-center text-xs font-bold shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate text-ink-800 dark:text-ink-100">{currentUser.name}</p>
                <p className="text-xs text-ink-500 capitalize">{currentUser.role}</p>
              </div>
            )}
            <button type="button" onClick={onLogout} aria-label="Sign out" title="Sign out" className="p-2 rounded-md text-ink-500 hover:text-chili-600 hover:bg-chili-50 dark:hover:bg-chili-500/10 cursor-pointer">
              <LogOut size={16} />
            </button>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Expand menu' : 'Collapse menu'}
          className="hidden md:flex absolute -right-3 top-[76px] w-6 h-6 rounded-full border items-center justify-center cursor-pointer bg-white border-ink-200 text-ink-500 hover:text-ink-900 dark:bg-ink-800 dark:border-ink-700 dark:text-ink-400 dark:hover:text-ink-100"
        >
          {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>
      </aside>
    </>
  );
}
