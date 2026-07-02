import { useState, type ElementType } from 'react';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Settings, Menu } from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { POSView } from './components/POSView';
import { Dashboard } from './components/Dashboard';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { MobileOwnerView } from './components/MobileOwnerView';
import type { BusinessType, ViewType, Product, RecentOrder, CartItem, OrderType, PaymentMethod } from './components/mockData';
import { PRODUCTS, RECENT_ORDERS } from './components/mockData';

const MOBILE_NAV: { id: ViewType; label: string; icon: ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'inventory', label: 'Inventory',  icon: Package         },
  { id: 'reports',   label: 'Reports',    icon: BarChart2       },
  { id: 'settings',  label: 'Settings',   icon: Settings        },
];

let orderCounter = 1242;

function nextOrderNumber(): string {
  return `INV-00${orderCounter++}`;
}

export default function App() {
  const [view, setView]               = useState<ViewType>('pos');
  const [businessType, setBusinessType] = useState<BusinessType>('fnb');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Shared mutable state
  const [products, setProducts]   = useState<Product[]>([...PRODUCTS]);
  const [orders, setOrders]       = useState<RecentOrder[]>([...RECENT_ORDERS]);

  const handleOrderComplete = (
    cart: CartItem[],
    orderType: OrderType,
    paymentMethod: PaymentMethod,
    amountPaid: number,
  ) => {
    const subtotal = cart.reduce((sum, item) => {
      const line = item.product.price * item.qty;
      return sum + line - line * (item.discount / 100);
    }, 0);
    const tax   = Math.round(subtotal * 0.11);
    const total = subtotal + tax;

    const newOrder: RecentOrder = {
      id:            String(Date.now()),
      orderNumber:   nextOrderNumber(),
      itemCount:     cart.reduce((s, i) => s + i.qty, 0),
      subtotal,
      tax,
      total,
      paymentMethod,
      orderType,
      status:        'completed',
      createdAt:     new Date().toISOString(),
      cashier:       'Budi',
    };
    setOrders(prev => [newOrder, ...prev]);

    // Decrement stock for each cart item
    setProducts(prev =>
      prev.map(p => {
        const cartItem = cart.find(c => c.product.id === p.id);
        if (!cartItem) return p;
        return { ...p, stock: Math.max(0, p.stock - cartItem.qty) };
      })
    );
  };

  const mobileView = view === 'pos' ? 'dashboard' : view;

  return (
    <div className="h-screen flex overflow-hidden bg-slate-100">
      <Sidebar
        currentView={view}
        onViewChange={setView}
        businessType={businessType}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile top bar */}
        <header className="md:hidden flex items-center justify-between px-4 h-14 bg-white border-b border-slate-200 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-1 rounded-lg hover:bg-slate-100 text-slate-600 transition-colors"
          >
            <Menu size={20} />
          </button>
          <span className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>
            {view === 'pos' || view === 'dashboard' ? 'Overview' :
             view === 'inventory' ? 'Inventory' :
             view === 'reports'   ? 'Reports'   : 'Settings'}
          </span>
          <div className="w-8" />
        </header>

        <main className="flex-1 overflow-hidden flex">
          {/* Mobile */}
          <div className="flex md:hidden flex-1 overflow-hidden flex-col">
            {mobileView === 'dashboard'  && <MobileOwnerView orders={orders} />}
            {mobileView === 'inventory'  && <InventoryView products={products} onProductsChange={setProducts} />}
            {mobileView === 'reports'    && <ReportsView orders={orders} />}
            {mobileView === 'settings'   && (
              <SettingsView businessType={businessType} onBusinessTypeChange={setBusinessType} />
            )}
          </div>

          {/* Tablet / desktop */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {view === 'pos'       && (
              <POSView
                businessType={businessType}
                products={products}
                onOrderComplete={handleOrderComplete}
              />
            )}
            {view === 'dashboard' && <Dashboard orders={orders} />}
            {view === 'inventory' && <InventoryView products={products} onProductsChange={setProducts} />}
            {view === 'reports'   && <ReportsView orders={orders} />}
            {view === 'settings'  && (
              <SettingsView businessType={businessType} onBusinessTypeChange={setBusinessType} />
            )}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className="md:hidden flex border-t border-slate-200 bg-white shrink-0">
          {MOBILE_NAV.map(({ id, label, icon: Icon }) => {
            const active = mobileView === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={[
                  'flex-1 flex flex-col items-center justify-center py-2 gap-1 transition-colors',
                  active ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600',
                ].join(' ')}
              >
                <Icon size={20} />
                <span className="text-xs">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
