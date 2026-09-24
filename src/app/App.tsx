import { useState, useEffect, type ElementType } from 'react';
import { LayoutDashboard, ShoppingCart, Package, BarChart2, Settings, Menu, Monitor, Users, Receipt, ShieldCheck, Banknote } from 'lucide-react';
import { usePersistentState } from './hooks/usePersistentState';
import { ToastProvider } from './contexts/ToastContext';
import { Sidebar } from './components/Sidebar';
import { POSView } from './components/POSView';
import { Dashboard } from './components/Dashboard';
import { InventoryView } from './components/InventoryView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
import { MobileOwnerView } from './components/MobileOwnerView';
import { AuthView } from './components/AuthView';
import { DailySalesView } from './components/DailySalesView';
import { CustomersView } from './components/CustomersView';
import { OnboardingWalkthroughModal } from './components/OnboardingWalkthroughModal';
import { GuidedSetupModal } from './components/GuidedSetupModal';
import { PlatformAdminView } from './components/PlatformAdminView';
import type { BusinessType, ViewType, Product, RecentOrder, CartItem, OrderType, PaymentMethod, User, RolePermissions, Category, DiscountSettings, RefundSettings, Customer, LoyaltySettings, TaxRule, TerminalViewMode, PaymentMethodEntry, MerchantAccount, CheckoutResult, ServiceChargeSettings, RegisterSession, RegisterSettings, CashMovement, ReceiptNumberFormat } from './components/mockData';
import { PRODUCTS, RECENT_ORDERS, INITIAL_USERS, DEFAULT_PERMISSIONS, CATEGORIES, INITIAL_CUSTOMERS, INITIAL_LOYALTY_SETTINGS, INITIAL_TAX_RULES, INITIAL_PAYMENTS, INITIAL_MERCHANTS, INITIAL_SERVICE_CHARGE, INITIAL_REGISTER_SETTINGS } from './components/mockData';
import localforage from 'localforage';
import { purgeMerchantSupabaseData } from './services/supabaseSync';
import { reverseCustomerForOrder } from './lib/orders';
import { DEFAULT_RECEIPT_FORMAT, nextReceiptNumber } from './lib/receiptNumber';
import { isStale, summariseSession } from './lib/register';
import { pointsEarnedFor } from './lib/loyalty';
import { RegisterView } from './components/RegisterView';
import { OpenRegisterModal, CloseRegisterModal, CashMovementModal } from './components/RegisterModals';
import { AUTH_MODE, IS_LOCAL_DEMO, loadCloudUser, signOut, verifyManagerPin } from './lib/auth';
import { isSupabaseConfigured } from './lib/supabase';

const MOBILE_NAV: { id: ViewType; label: string; icon: ElementType }[] = [
  { id: 'superadmin',  label: 'Merchants',    icon: ShieldCheck     },
  { id: 'pos',         label: 'Checkout',     icon: Monitor         },
  { id: 'register',    label: 'Register',     icon: Banknote        },
  { id: 'dashboard',   label: 'Overview',     icon: LayoutDashboard },
  { id: 'inventory',   label: 'Stock',        icon: Package         },
  { id: 'reports',     label: 'Reports',      icon: BarChart2       },
  { id: 'daily-sales', label: 'Today',        icon: Receipt         },
  { id: 'customers',   label: 'Customers',    icon: Users           },
  { id: 'settings',    label: 'Settings',     icon: Settings        },
];


export default function App() {
  const [view, setView]               = useState<ViewType>('pos');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ─── Theme ────────────────────────────────────────────────────────────────
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    try { return localStorage.getItem('pos-dark') === 'true'; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem('pos-dark', String(darkMode)); } catch { /* ignore */ }
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // ─── Auth ──────────────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Cloud mode: restore the Supabase session after a reload instead of forcing a new sign-in.
  useEffect(() => {
    if (AUTH_MODE !== 'cloud') return;
    let cancelled = false;
    loadCloudUser()
      .then(u => { if (!cancelled && u) { setCurrentUser(u); setIsAuthenticated(true); } })
      .catch(err => console.warn('Could not restore session:', err));
    return () => { cancelled = true; };
  }, []);

  const handleLogout = () => {
    signOut().catch(err => console.warn('Sign-out failed:', err));
    setCurrentUser(null);
    setIsAuthenticated(false);
    setView('pos');
  };
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [showGuidedSetup, setShowGuidedSetup] = useState(false);
  const activeMerchantId = currentUser?.merchantId || 'm_default';
  const isDemoMerchant = activeMerchantId === 'm_default';

  // ─── Business Info (Persistent) ──────────────────────────────────────────
  const [bizName, setBizName, bnLoaded] = usePersistentState(
    'pos-bizname',
    isDemoMerchant ? 'My Store' : (currentUser?.businessName || ''),
    activeMerchantId
  );
  const [bizPhone, setBizPhone, bpLoaded] = usePersistentState(
    'pos-bizphone',
    isDemoMerchant ? '' : '',
    activeMerchantId
  );
  const [bizEmail, setBizEmail, beLoaded] = usePersistentState(
    'pos-bizemail',
    isDemoMerchant ? 'owner@vpos.app' : (currentUser?.email || ''),
    activeMerchantId
  );
  const [bizAddress, setBizAddress, baLoaded] = usePersistentState(
    'pos-bizaddress',
    isDemoMerchant ? '' : '',
    activeMerchantId
  );
  const [businessType, setBusinessType, btLoaded] = usePersistentState<BusinessType>(
    'pos-biztype',
    'fnb',
    activeMerchantId
  );
  const [hasCompletedOnboarding, setHasCompletedOnboarding, obLoaded] = usePersistentState<boolean>(
    'pos-onboarded',
    isDemoMerchant,
    activeMerchantId
  );

  useEffect(() => {
    if (currentUser?.businessName && !isDemoMerchant) {
      setBizName(prev => prev || currentUser.businessName || '');
    }
  }, [currentUser, isDemoMerchant, setBizName]);

  useEffect(() => {
    if (isAuthenticated && currentUser && activeMerchantId !== 'm_default' && !hasCompletedOnboarding) {
      setShowGuidedSetup(true);
    }
  }, [isAuthenticated, currentUser, activeMerchantId, hasCompletedOnboarding]);

  const defaultUsers = currentUser ? [currentUser] : INITIAL_USERS;
  const [users, setUsers, usersLoaded] = usePersistentState<User[]>('pos-users', defaultUsers, activeMerchantId);
  const [permissions, setPermissions, permsLoaded] = usePersistentState<RolePermissions>('pos-perms', DEFAULT_PERMISSIONS, activeMerchantId);

  // ─── Multi-Tenant Merchants Registry (Platform Level) ─────────────────────
  const [merchants, setMerchants, merchantsLoaded] = usePersistentState<MerchantAccount[]>(
    'pos-platform-merchants',
    INITIAL_MERCHANTS,
    'platform'
  );

  useEffect(() => {
    if (currentUser) {
      setUsers(prev => {
        if (!prev.some(u => u.id === currentUser.id)) {
          return [currentUser, ...prev];
        }
        return prev;
      });
    }
  }, [currentUser, setUsers]);

  // If user is superadmin, default view to superadmin
  useEffect(() => {
    if (currentUser?.role === 'superadmin' && view !== 'superadmin') {
      setView('superadmin');
    }
  }, [currentUser]);

  // ─── Data State (Persistent) ─────────────────────────────────────────────
  const defaultCategories: Category[] = isDemoMerchant
    ? [...CATEGORIES]
    : [{ id: 'cat-all', name: 'All', isTaxable: true, isDiscountable: true }];
  const defaultProducts: Product[] = isDemoMerchant ? [...PRODUCTS] : [];
  const defaultOrders: RecentOrder[] = isDemoMerchant ? [...RECENT_ORDERS] : [];
  const [categories, setCategories, catLoaded] = usePersistentState<Category[]>('pos-categories', defaultCategories, activeMerchantId);
  const [products, setProducts, prodLoaded] = usePersistentState<Product[]>('pos-products', defaultProducts, activeMerchantId);
  const [orders, setOrders, ordersLoaded] = usePersistentState<RecentOrder[]>('pos-orders', defaultOrders, activeMerchantId);
  const [paymentMethods, setPaymentMethods, pmLoaded] = usePersistentState<PaymentMethodEntry[]>('pos-payments', INITIAL_PAYMENTS, activeMerchantId);
  const [customers, setCustomers, custLoaded] = usePersistentState<Customer[]>('pos-customers', isDemoMerchant ? [...INITIAL_CUSTOMERS] : [], activeMerchantId);
  
  // ─── Taxes & Discounts (Persistent) ──────────────────────────────────────
  const defaultDiscountSettings: DiscountSettings = isDemoMerchant
    ? {
        enabled: true,
        allowItemDiscount: true,
        promoCodes: [{ id: '1', code: 'PROMO10', type: 'percent', value: 10, active: true }]
      }
    : {
        enabled: false,
        allowItemDiscount: false,
        promoCodes: []
      };
  const [discountSettings, setDiscountSettings, dsLoaded] = usePersistentState<DiscountSettings>('pos-discounts', defaultDiscountSettings, activeMerchantId);
  const [refundSettings, setRefundSettings, rsLoaded] = usePersistentState<RefundSettings>('pos-refunds', {
    managerPinRequired: true
  }, activeMerchantId);
  const [loyaltySettings, setLoyaltySettings, lsLoaded] = usePersistentState<LoyaltySettings>('pos-loyalty', { ...INITIAL_LOYALTY_SETTINGS }, activeMerchantId);
  const defaultTaxRules: TaxRule[] = isDemoMerchant ? INITIAL_TAX_RULES : [];
  const [taxRules, setTaxRules, trLoaded] = usePersistentState<TaxRule[]>('pos-taxrules', defaultTaxRules, activeMerchantId);
  const [terminalViewMode, setTerminalViewMode, tvmLoaded] = usePersistentState<TerminalViewMode>('pos-terminalview', 'grid', activeMerchantId);
  const [serviceCharge, setServiceCharge] = usePersistentState<ServiceChargeSettings>('pos-servicecharge', INITIAL_SERVICE_CHARGE, activeMerchantId);
  const [registerSessions, setRegisterSessions] = usePersistentState<RegisterSession[]>('pos-register-sessions', [], activeMerchantId);
  const [cashMovements, setCashMovements] = usePersistentState<CashMovement[]>('pos-cash-movements', [], activeMerchantId);
  const [registerSettings, setRegisterSettings] = usePersistentState<RegisterSettings>('pos-register-settings', INITIAL_REGISTER_SETTINGS, activeMerchantId);
  const [receiptFormat, setReceiptFormat] = usePersistentState<ReceiptNumberFormat>('pos-receipt-format', DEFAULT_RECEIPT_FORMAT, activeMerchantId);
  const [registerModal, setRegisterModal] = useState<'open' | 'close' | 'cash-in' | 'cash-out' | null>(null);

  const openSession = registerSessions.find(s => s.status === 'open');

  // A shift nobody closed is closed by the system at the next day's start, marked as uncounted,
  // so tomorrow's cash is never mixed into yesterday's report.
  useEffect(() => {
    if (!openSession || !isStale(openSession)) return;
    const summary = summariseSession(openSession, orders, cashMovements);
    setRegisterSessions(prev => prev.map(s => s.id === openSession.id ? {
      ...s,
      status: 'closed',
      autoClosed: true,
      closedAt: new Date().toISOString(),
      closedByName: 'System',
      expectedCash: summary.expectedCash,
      closingNote: 'Left open past the business day and closed without a count.',
    } : s));
  }, [openSession, orders, cashMovements, setRegisterSessions]);

  const handleOpenRegister = (session: Omit<RegisterSession, 'id' | 'status'>) => {
    setRegisterSessions(prev => [...prev, { ...session, id: `reg-${Date.now()}`, status: 'open', merchantId: activeMerchantId }]);
    setRegisterModal(null);
  };

  const handleCloseRegister = (result: Partial<RegisterSession>) => {
    if (!openSession) return;
    setRegisterSessions(prev => prev.map(s => s.id === openSession.id ? { ...s, ...result } : s));
    setRegisterModal(null);
  };

  const handleCashMovement = (movement: Omit<CashMovement, 'id'>) => {
    setCashMovements(prev => [...prev, { ...movement, id: `cm-${Date.now()}` }]);
    setRegisterModal(null);
  };

  /**
   * Refunds and voids undo everything the sale did: stock comes back, points earned are
   * taken back, points redeemed are returned, and customer spend/visit counts are reduced.
   * Before, refunds only restocked and voids did nothing, so loyalty balances drifted.
   */
  const reverseOrder = (orderId: string, status: 'refunded' | 'voided', reason: string) => {
    const order = orders.find(o => o.id === orderId);
    if (!order || order.status !== 'completed') return;

    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status, refundReason: reason } : o));

    if (order.items?.length) {
      setProducts(prev => prev.map(p => {
        const qty = order.items!.filter(i => i.product.id === p.id).reduce((s, i) => s + i.qty, 0);
        return qty > 0 && p.trackInventory ? { ...p, stock: p.stock + qty } : p;
      }));
    }

    if (order.customerId) {
      setCustomers(prev => prev.map(c => reverseCustomerForOrder(c, order)));
    }
  };

  const handleRefund = (orderId: string, reason: string) => reverseOrder(orderId, 'refunded', reason);
  const handleVoid = (orderId: string, reason: string) => reverseOrder(orderId, 'voided', reason);

  const handlePurgeAllData = async (ownerPin: string) => {
    const check = await verifyManagerPin(ownerPin, { merchantId: activeMerchantId, localUsers: users });
    if (!check.ok) return { success: false, error: check.error };
    if (check.approverRole !== 'owner') return { success: false, error: 'Only the owner can erase business data.' };

    try {
      // Only this merchant's keys — clearing the whole store wiped every business on the device.
      const keys = await localforage.keys();
      await Promise.all(keys.filter(k => k.endsWith(`_${activeMerchantId}`)).map(k => localforage.removeItem(k)));
      if (isSupabaseConfigured) {
        await purgeMerchantSupabaseData(activeMerchantId);
      }
      setOrders([]);
      setProducts([]);
      setCustomers([]);
      setCategories(CATEGORIES);
      return { success: true };
    } catch (err: unknown) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to erase data.' };
    }
  };


  const handleOrderComplete = (
    cart: CartItem[],
    orderType: OrderType,
    customerId: string | undefined,
    result: CheckoutResult,
  ) => {
    const { paymentMethod, promoCode, pricing } = result;
    const pointsRedeemed = result.pointsRedeemed;
    const pointsDiscountAmt = pricing.pointsDiscount;
    const subtotalBeforeDiscount = pricing.grossSubtotal;
    // Everything the merchant gave away (line + tier + promo). Points are tracked separately as a liability.
    const discountTotal = pricing.lineDiscountTotal + pricing.tierDiscount + pricing.promoDiscount;
    const finalSubtotal = pricing.netSubtotal;
    const finalTax = pricing.taxTotal;
    const total = pricing.total;

    // Earn on goods actually paid for — never on tax or service charge
    const pointsEarned = customerId ? pointsEarnedFor(finalSubtotal, loyaltySettings) : 0;

    const totalCost = cart.reduce((sum, item) => sum + (item.product.costPrice * item.qty), 0);

    const newOrder: RecentOrder = {
      id:            String(Date.now()),
      orderNumber:   nextReceiptNumber(orders, receiptFormat),
      sessionId:     openSession?.id,
      itemCount:     cart.reduce((s, i) => s + i.qty, 0),
      subtotalBeforeDiscount,
      discountTotal,
      promoCode,
      subtotal:      finalSubtotal,
      tax:           finalTax,
      total,
      totalCost,
      paymentMethod,
      orderType,
      status:        'completed',
      createdAt:     new Date().toISOString().slice(0, 19),
      cashier:       currentUser?.name || 'Cashier',
      items:         [...cart],
      customerId,
      pointsEarned,
      pointsRedeemed,
      pointsDiscountAmt,
      promoDiscountAmt: pricing.promoDiscount,
      serviceCharge: pricing.serviceCharge,
      taxBreakdown: pricing.taxes,
    };

    setOrders(prev => [newOrder, ...prev]);

    if (customerId) {
      setCustomers(prev => prev.map(c => {
        if (c.id === customerId) {
          const newTotalSpend = c.totalSpend + total;
          const newTotalTransactions = (c.totalTransactions || 0) + 1;
          const newAtv = Math.round(newTotalSpend / newTotalTransactions);
          
          let newTierId = c.tierId;
          const applicableTiers = loyaltySettings.tiers
            .filter(t => newTotalSpend >= t.minSpend)
            .sort((a, b) => b.minSpend - a.minSpend);
            
          if (applicableTiers.length > 0) {
            newTierId = applicableTiers[0].id;
          }

          return {
            ...c,
            totalSpend: newTotalSpend,
            pointsBalance: c.pointsBalance - (pointsRedeemed || 0) + pointsEarned,
            totalTransactions: newTotalTransactions,
            averageTransactionValue: newAtv,
            lastPurchaseDate: new Date().toISOString(),
            tierId: newTierId
          };
        }
        return c;
      }));
    }

    const updatedProducts = products.map(p => {
      const inCart = cart.filter(i => i.product.id === p.id).reduce((s, i) => s + i.qty, 0);
      if (inCart > 0 && p.trackInventory) {
        return { ...p, stock: Math.max(0, p.stock - inCart) };
      }
      return p;
    });
    setProducts(updatedProducts);
  };

  if (!isAuthenticated || !currentUser) {
    return (
      <div className={darkMode ? 'dark' : ''}>
        <AuthView
          users={users}
          darkMode={darkMode}
          onLogin={(u) => { setCurrentUser(u); setIsAuthenticated(true); }}
          onSignup={(u) => {
            setUsers(prev => [...prev, u]);
            // Local demo keeps its own merchant registry; in cloud mode create_merchant already did this server-side.
            if (IS_LOCAL_DEMO && u.merchantId) {
              const newMerchantAccount: MerchantAccount = {
                id: u.merchantId,
                name: u.businessName || 'My Store',
                ownerName: u.name,
                email: u.email,
                phone: '',
                type: 'fnb',
                ownerPin: u.pin,
                subscriptionPlan: 'trial',
                subscriptionStatus: 'trial',
                subscriptionStartsAt: new Date().toISOString(),
                subscriptionExpiresAt: new Date(Date.now() + 14 * 86400000).toISOString(),
                isEnabled: true,
                createdAt: new Date().toISOString()
              };
              setMerchants(prev => [newMerchantAccount, ...prev.filter(m => m.id !== u.merchantId)]);
            }
            setCurrentUser(u);
            setIsAuthenticated(true);
            setShowGuidedSetup(true);
          }}
        />
      </div>
    );
  }

  const isFullyLoaded = catLoaded && prodLoaded && ordersLoaded && pmLoaded && dsLoaded && rsLoaded && lsLoaded && trLoaded && tvmLoaded && bnLoaded && bpLoaded && beLoaded && baLoaded && usersLoaded && permsLoaded && custLoaded && btLoaded && obLoaded;

  if (!isFullyLoaded) {
    return <div className={`min-h-screen flex items-center justify-center ${darkMode ? 'bg-ink-900 text-ink-100' : 'bg-ink-50 text-ink-900'}`}>Loading...</div>;
  }

  // ─── Subscription Guard ──────────────────────────────────────────────────
  // Check active merchant subscription (bypass for superadmin)
  const currentMerchantRecord = merchants.find(m => m.id === activeMerchantId);
  const isMerchantDisabled = currentMerchantRecord && !currentMerchantRecord.isEnabled;
  const isMerchantExpired = currentMerchantRecord && new Date(currentMerchantRecord.subscriptionExpiresAt) < new Date();
  const isSubscriptionBlocked = currentUser.role !== 'superadmin' && (isMerchantDisabled || isMerchantExpired);

  const allowedViews = currentUser ? (permissions[currentUser.role] || DEFAULT_PERMISSIONS[currentUser.role] || DEFAULT_PERMISSIONS.owner) : [];

  const VIEW_TITLE: Record<ViewType, string> = {
    superadmin: 'Merchants',
    pos: 'Checkout', register: 'Register', dashboard: 'Overview',
    inventory: 'Products & stock', reports: 'Reports', settings: 'Settings',
    'daily-sales': "Today's sales", customers: 'Customers'
  };

  return (
    <ToastProvider darkMode={darkMode}>
      <div className={`h-screen flex overflow-hidden relative ${darkMode ? 'dark bg-ink-950 text-ink-100' : 'bg-ink-50 text-ink-900'}`}>
      <div className="z-10 flex w-full h-full">
      <Sidebar
        currentView={view}
        onViewChange={setView}
        businessType={businessType}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        currentUser={currentUser}
        onLogout={handleLogout}
        allowedViews={allowedViews}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(d => !d)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <header className={`md:hidden flex items-center justify-between px-4 h-14 border-b shrink-0 ${
          darkMode ? 'bg-ink-900 border-ink-800' : 'bg-white border-ink-200'
        }`}>
          <button
            onClick={() => setSidebarOpen(true)}
            className={`p-2 -ml-1 rounded-lg transition-colors ${darkMode ? 'hover:bg-ink-700 text-ink-300' : 'hover:bg-ink-100 text-ink-600'}`}
          >
            <Menu size={20} />
          </button>
          <span className={`text-sm font-semibold ${darkMode ? 'text-ink-100' : 'text-ink-800'}`}>
            {VIEW_TITLE[view] ?? 'VPos'}
          </span>
          <div className="w-8" />
        </header>

        {!hasCompletedOnboarding && activeMerchantId !== 'm_default' && (
          <div className="bg-brand-700 px-4 py-2.5 text-white text-xs sm:text-sm flex items-center justify-between shadow-md shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-bold">Store Setup Incomplete:</span>
              <span className="opacity-90 hidden sm:inline">Configure your store profile, categories, payments, tax, and promos.</span>
            </div>
            <button
              onClick={() => setShowGuidedSetup(true)}
              className="px-3 py-1 bg-white text-brand-700 font-bold rounded-lg text-xs hover:bg-brand-50 transition-colors shrink-0 shadow-sm"
            >
              Open setup guide
            </button>
          </div>
        )}

        <main className="flex-1 overflow-hidden flex">
          {/* Mobile */}
          <div className="flex md:hidden flex-1 overflow-hidden flex-col">
            {view === 'pos' && (
              <POSView
                businessType={businessType}
                terminalViewMode={terminalViewMode}
                products={products}
                categories={categories}
                discountSettings={discountSettings}
                taxRules={taxRules}
                currentUser={currentUser}
                bizName={bizName}
                darkMode={darkMode}
                customers={customers}
                setCustomers={setCustomers}
                loyaltySettings={loyaltySettings}
                paymentMethods={paymentMethods}
                serviceCharge={serviceCharge}
                registerReady={!registerSettings.requireOpenRegister || !!openSession}
                onOpenRegister={() => setRegisterModal('open')}
                onOrderComplete={handleOrderComplete}
              />
            )}
            {view === 'dashboard'  && <MobileOwnerView orders={orders} products={products} darkMode={darkMode} />}
            {view === 'inventory'  && <InventoryView products={products} onProductsChange={setProducts} categories={categories} setCategories={setCategories} darkMode={darkMode} />}
            {view === 'reports'    && <ReportsView orders={orders} products={products} customers={customers} loyaltySettings={loyaltySettings} categories={categories} darkMode={darkMode} />}
            {view === 'register' && currentUser && (
              <RegisterView
                sessions={registerSessions}
                movements={cashMovements}
                orders={orders}
                settings={registerSettings}
                currentUser={currentUser}
                businessName={bizName || 'VPos'}
                onOpenRegister={() => setRegisterModal('open')}
                onCloseRegister={() => setRegisterModal('close')}
                onCashMovement={type => setRegisterModal(type === 'in' ? 'cash-in' : 'cash-out')}
              />
            )}
            {view === 'daily-sales'&& (
              <DailySalesView users={users} merchantId={activeMerchantId} 
                orders={orders} 
                darkMode={darkMode} 
                refundSettings={refundSettings} 
                onRefund={handleRefund} 
                onVoid={handleVoid} 
              />
            )}
            {view === 'customers' && (
              <CustomersView
                customers={customers}
                setCustomers={setCustomers}
                loyaltySettings={loyaltySettings}
                darkMode={darkMode}
                orders={orders}
              />
            )}
            {view === 'settings'   && (
              <SettingsView
                currentUser={currentUser}
                businessType={businessType}
                onBusinessTypeChange={setBusinessType}
                users={users}
                setUsers={setUsers}
                permissions={permissions}
                setPermissions={setPermissions}
                categories={categories}
                setCategories={setCategories}
                discountSettings={discountSettings}
                setDiscountSettings={setDiscountSettings}
                taxRules={taxRules}
                serviceCharge={serviceCharge}
                setServiceCharge={setServiceCharge}
                registerSettings={registerSettings}
                setRegisterSettings={setRegisterSettings}
                receiptFormat={receiptFormat}
                setReceiptFormat={setReceiptFormat}
                setTaxRules={setTaxRules}
                paymentMethods={paymentMethods}
                setPaymentMethods={setPaymentMethods}
                products={products}
                terminalViewMode={terminalViewMode}
                setTerminalViewMode={setTerminalViewMode}
                refundSettings={refundSettings}
                setRefundSettings={setRefundSettings}
                loyaltySettings={loyaltySettings}
                setLoyaltySettings={setLoyaltySettings}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                bizName={bizName}   setBizName={setBizName}
                bizPhone={bizPhone} setBizPhone={setBizPhone}
                bizAddress={bizAddress} setBizAddress={setBizAddress}
                bizEmail={bizEmail}   setBizEmail={setBizEmail}
                onOpenSetupGuide={() => setShowGuidedSetup(true)}
                onPurgeAllData={handlePurgeAllData}
              />
            )}
            {view === 'superadmin' && (
              <PlatformAdminView
                merchants={merchants}
                setMerchants={setMerchants}
                orders={orders}
                users={users}
                setUsers={setUsers}
                darkMode={darkMode}
                onImpersonateMerchant={(merchId) => {
                  const m = merchants.find(item => item.id === merchId);
                  if (m) {
                    const mockOwner: User = {
                      id: `owner_${m.id}`,
                      name: m.ownerName,
                      email: m.email,
                      role: 'owner',
                      pin: m.ownerPin,
                      merchantId: m.id,
                      businessName: m.name
                    };
                    setCurrentUser(mockOwner);
                    setView('pos');
                  }
                }}
              />
            )}
          </div>

          {/* Tablet / desktop */}
          <div className="hidden md:flex flex-1 overflow-hidden">
            {view === 'superadmin' && (
              <PlatformAdminView
                merchants={merchants}
                setMerchants={setMerchants}
                orders={orders}
                users={users}
                setUsers={setUsers}
                darkMode={darkMode}
                onImpersonateMerchant={(merchId) => {
                  const m = merchants.find(item => item.id === merchId);
                  if (m) {
                    const mockOwner: User = {
                      id: `owner_${m.id}`,
                      name: m.ownerName,
                      email: m.email,
                      role: 'owner',
                      pin: m.ownerPin,
                      merchantId: m.id,
                      businessName: m.name
                    };
                    setCurrentUser(mockOwner);
                    setView('pos');
                  }
                }}
              />
            )}
            {view === 'pos' && (
              <POSView
                businessType={businessType}
                terminalViewMode={terminalViewMode}
                products={products}
                categories={categories}
                discountSettings={discountSettings}
                taxRules={taxRules}
                currentUser={currentUser}
                bizName={bizName}
                darkMode={darkMode}
                customers={customers}
                setCustomers={setCustomers}
                loyaltySettings={loyaltySettings}
                paymentMethods={paymentMethods}
                serviceCharge={serviceCharge}
                registerReady={!registerSettings.requireOpenRegister || !!openSession}
                onOpenRegister={() => setRegisterModal('open')}
                onOrderComplete={handleOrderComplete}
              />
            )}
            {view === 'dashboard' && <Dashboard orders={orders} products={products} customers={customers} loyaltySettings={loyaltySettings} darkMode={darkMode} />}
            {view === 'inventory' && <InventoryView products={products} onProductsChange={setProducts} categories={categories} setCategories={setCategories} darkMode={darkMode} />}
            {view === 'reports'   && <ReportsView orders={orders} products={products} customers={customers} loyaltySettings={loyaltySettings} categories={categories} darkMode={darkMode} />}
            {view === 'register' && currentUser && (
              <RegisterView
                sessions={registerSessions}
                movements={cashMovements}
                orders={orders}
                settings={registerSettings}
                currentUser={currentUser}
                businessName={bizName || 'VPos'}
                onOpenRegister={() => setRegisterModal('open')}
                onCloseRegister={() => setRegisterModal('close')}
                onCashMovement={type => setRegisterModal(type === 'in' ? 'cash-in' : 'cash-out')}
              />
            )}
            {view === 'daily-sales'&& (
              <DailySalesView users={users} merchantId={activeMerchantId} 
                orders={orders} 
                darkMode={darkMode} 
                refundSettings={refundSettings} 
                onRefund={handleRefund} 
                onVoid={handleVoid} 
              />
            )}
            {view === 'customers' && (
              <CustomersView
                customers={customers}
                setCustomers={setCustomers}
                loyaltySettings={loyaltySettings}
                darkMode={darkMode}
                orders={orders}
              />
            )}
            {view === 'settings'  && (
              <SettingsView
                currentUser={currentUser}
                businessType={businessType}
                onBusinessTypeChange={setBusinessType}
                users={users}
                setUsers={setUsers}
                permissions={permissions}
                setPermissions={setPermissions}
                categories={categories}
                setCategories={setCategories}
                discountSettings={discountSettings}
                setDiscountSettings={setDiscountSettings}
                taxRules={taxRules}
                serviceCharge={serviceCharge}
                setServiceCharge={setServiceCharge}
                registerSettings={registerSettings}
                setRegisterSettings={setRegisterSettings}
                receiptFormat={receiptFormat}
                setReceiptFormat={setReceiptFormat}
                setTaxRules={setTaxRules}
                paymentMethods={paymentMethods}
                setPaymentMethods={setPaymentMethods}
                products={products}
                terminalViewMode={terminalViewMode}
                setTerminalViewMode={setTerminalViewMode}
                refundSettings={refundSettings}
                setRefundSettings={setRefundSettings}
                loyaltySettings={loyaltySettings}
                setLoyaltySettings={setLoyaltySettings}
                darkMode={darkMode}
                onToggleDark={() => setDarkMode(d => !d)}
                bizName={bizName}   setBizName={setBizName}
                bizPhone={bizPhone} setBizPhone={setBizPhone}
                bizAddress={bizAddress} setBizAddress={setBizAddress}
                bizEmail={bizEmail}   setBizEmail={setBizEmail}
                onOpenSetupGuide={() => setShowGuidedSetup(true)}
                onPurgeAllData={handlePurgeAllData}
              />
            )}
          </div>
        </main>

        {/* Mobile bottom nav */}
        <nav className={`md:hidden flex border-t shrink-0 ${darkMode ? 'bg-ink-900 border-ink-800' : 'bg-white border-ink-200'}`}>
          {MOBILE_NAV.filter(item => allowedViews.includes(item.id)).map(({ id, label, icon: Icon }) => {
            const active = view === id;
            return (
              <button
                key={id}
                onClick={() => setView(id)}
                className={[
                  'flex-1 flex flex-col items-center justify-center py-2 gap-0.5 transition-colors focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:outline-none',
                  active
                    ? 'text-brand-500'
                    : darkMode ? 'text-ink-500 hover:text-ink-300' : 'text-ink-400 hover:text-ink-600',
                ].join(' ')}
              >
                <Icon size={20} />
                <span className="text-[10px] font-medium">{label}</span>
              </button>
            );
          })}
        </nav>
      </div>
      </div>
    </div>
    <OnboardingWalkthroughModal
      isOpen={showWalkthrough}
      onClose={() => setShowWalkthrough(false)}
      darkMode={darkMode}
      merchantName={currentUser?.name}
    />
    {currentUser && (
      <GuidedSetupModal
        isOpen={showGuidedSetup}
        onClose={() => setShowGuidedSetup(false)}
        darkMode={darkMode}
        currentUser={currentUser}
        initialData={{
          bizName,
          bizPhone,
          bizEmail,
          bizAddress,
          businessType,
          categories,
          paymentMethods,
          taxRules,
          discountSettings,
        }}
        onSaveSetup={(data) => {
          setBizName(data.bizName);
          setBizPhone(data.bizPhone);
          setBizEmail(data.bizEmail);
          setBizAddress(data.bizAddress);
          setBusinessType(data.businessType);
          setCategories(data.categories);
          setPaymentMethods(data.paymentMethods);
          setTaxRules(data.taxRules);
          setDiscountSettings(data.discountSettings);
          setHasCompletedOnboarding(true);
          setShowGuidedSetup(false);
        }}
      />
    )}

    {/* Subscription Expired / Suspended Paywall Modal */}
    {isSubscriptionBlocked && (
      <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
        <div className={`w-full max-w-lg rounded-2xl border shadow-2xl p-6 sm:p-8 text-center ${
          darkMode ? 'bg-ink-900 border-ink-800 text-ink-100' : 'bg-white border-ink-200 text-ink-900'
        }`}>
          <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center mb-4 bg-chili-500/10 text-chili-500 border border-chili-500/20">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold mb-2">
            {isMerchantDisabled ? 'Store License Disabled' : 'Subscription Expired'}
          </h3>
          <p className={`text-sm mb-6 ${darkMode ? 'text-ink-400' : 'text-ink-600'}`}>
            {isMerchantDisabled
              ? `The license for "${currentMerchantRecord?.name || 'this merchant'}" has been temporarily deactivated by the platform administration.`
              : `The subscription plan for "${currentMerchantRecord?.name || 'this merchant'}" expired on ${new Date(currentMerchantRecord?.subscriptionExpiresAt || '').toLocaleDateString('id-ID', { dateStyle: 'long' })}. Please renew your plan to continue taking orders.`}
          </p>

          <div className={`p-4 rounded-xl border text-left text-xs mb-6 space-y-2 ${
            darkMode ? 'bg-ink-800 border-ink-700 text-ink-300' : 'bg-ink-50 border-ink-200 text-ink-700'
          }`}>
            <div className="flex justify-between">
              <span className="text-ink-400">Merchant Account ID:</span>
              <span className="font-mono font-bold">{activeMerchantId}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Plan Type:</span>
              <span className="font-semibold capitalize">{currentMerchantRecord?.subscriptionPlan || 'Monthly'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-400">Owner Contact:</span>
              <span>{currentUser.email}</span>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleLogout}
              className={`flex-1 py-2.5 rounded-xl border font-semibold text-sm transition-colors ${
                darkMode ? 'border-ink-700 text-ink-300 hover:bg-ink-800' : 'border-ink-300 text-ink-700 hover:bg-ink-100'
              }`}
            >
              Sign Out
            </button>
            <button
              onClick={() => {
                alert(`Please contact your VPos representative or email admin@vpos.app with Merchant ID: ${activeMerchantId} to renew or extend your license.`);
              }}
              className="flex-1 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-semibold text-sm transition-colors shadow-lg"
            >
              Contact Support
            </button>
          </div>
        </div>
      </div>
    )}

      {currentUser && registerModal === 'open' && (
        <OpenRegisterModal settings={registerSettings} user={currentUser} onOpen={handleOpenRegister} onClose={() => setRegisterModal(null)} />
      )}
      {currentUser && registerModal === 'close' && openSession && (
        <CloseRegisterModal
          session={openSession}
          orders={orders}
          movements={cashMovements}
          settings={registerSettings}
          user={currentUser}
          users={users}
          merchantId={activeMerchantId}
          onCloseRegister={handleCloseRegister}
          onClose={() => setRegisterModal(null)}
        />
      )}
      {currentUser && openSession && (registerModal === 'cash-in' || registerModal === 'cash-out') && (
        <CashMovementModal
          type={registerModal === 'cash-in' ? 'in' : 'out'}
          sessionId={openSession.id}
          user={currentUser}
          onSave={handleCashMovement}
          onClose={() => setRegisterModal(null)}
        />
      )}
    </ToastProvider>
  );
}
