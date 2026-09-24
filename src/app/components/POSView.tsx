import { useState, useMemo } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Pause, ChevronDown,
  AlertTriangle, PlayCircle, X, Package, Percent, UserPlus, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { BusinessType, CartItem, HeldOrder, OrderType, Product, User, Category, SelectedOption, DiscountSettings, ProductVariant, Customer, LoyaltySettings, TaxRule, TerminalViewMode, PaymentMethodEntry, ServiceChargeSettings, CheckoutResult } from './mockData';
import { computeOrderTotals } from '../lib/pricing';
import { lineKey, optionsSummary, unitPriceOf } from '../lib/lineItems';
import { ItemBuilderModal } from './ItemBuilderModal';
import { cartToPricingLines, resolveCustomerTier } from '../lib/cartPricing';
import { formatIDR, formatNumberWithDots, formatIndonesianPhone } from './mockData';
import { CheckoutModal } from './CheckoutModal';
import { ConfirmationModal } from './ConfirmationModal';
import { useToast } from '../contexts/ToastContext';

interface POSViewProps {
  businessType: BusinessType;
  products: Product[];
  categories: Category[];
  discountSettings: DiscountSettings;
  currentUser: User;
  bizName: string;
  darkMode: boolean;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  loyaltySettings: LoyaltySettings;
  taxRules?: TaxRule[];
  terminalViewMode?: TerminalViewMode;
  paymentMethods: PaymentMethodEntry[];
  serviceCharge?: ServiceChargeSettings;
  /** False when a register must be opened before selling. */
  registerReady?: boolean;
  onOpenRegister?: () => void;
  onOrderComplete: (cart: CartItem[], orderType: OrderType, customerId: string | undefined, result: CheckoutResult) => string | void;
}

const ORDER_TYPES: { id: OrderType; label: string }[] = [
  { id: 'dine-in',  label: 'Dine-in'  },
  { id: 'takeaway', label: 'Takeaway' },
  { id: 'delivery', label: 'Delivery' },
];

export function POSView({ businessType, products, categories, discountSettings, currentUser, bizName, darkMode, customers, setCustomers, loyaltySettings, taxRules = [], terminalViewMode = 'grid', paymentMethods, serviceCharge, registerReady = true, onOpenRegister, onOrderComplete }: POSViewProps) {
  const [category, setCategory]       = useState('All');
  const [search, setSearch]           = useState('');
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [orderType, setOrderType]     = useState<OrderType>('dine-in');
  const [showCheckout, setShowCheckout] = useState(false);
  const [heldOrders, setHeldOrders]   = useState<HeldOrder[]>([]);
  const [cartOpen, setCartOpen]       = useState(false);
  const [showHeld, setShowHeld]       = useState(false);
  const [tableNote, setTableNote]     = useState('');
  const [popId, setPopId]             = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  
  // Toast notification
  const { showToast } = useToast();
  
  // Variant Selection State
  const [builderProduct, setBuilderProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'All') list = list.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        (p.variants && p.variants.some(v => (v.barcode && v.barcode.toLowerCase().includes(q)) || (v.sku && v.sku.toLowerCase().includes(q)) || v.name.toLowerCase().includes(q))) ||
        (p.optionGroups && p.optionGroups.some(g => g.choices.some(c => c.name.toLowerCase().includes(q))))
      );
    }
    return list;
  }, [products, category, search]);

  const handleProductClick = (product: Product) => {
    // Anything with a choice to make opens the builder; plain items go straight into the order.
    if ((product.variants?.length ?? 0) > 0 || (product.optionGroups?.length ?? 0) > 0) {
      setBuilderProduct(product);
    } else {
      addToCart(product);
    }
  };

  const addToCart = (
    product: Product,
    variant?: ProductVariant,
    options?: SelectedOption[],
    note?: string,
    qty = 1,
  ) => {
    setCart(prev => {
      const key = lineKey({ product, variant, selectedOptions: options, note });
      const existing = prev.find(i => lineKey(i) === key);
      const inCart = existing?.qty ?? 0;
      const allowed = product.trackInventory ? Math.max(0, product.stock - inCart) : qty;
      const addQty = Math.min(qty, allowed);
      if (addQty <= 0) return prev;
      if (existing) return prev.map(i => i.id === existing.id ? { ...i, qty: i.qty + addQty } : i);
      return [...prev, {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 11),
        product,
        qty: addQty,
        discount: 0,
        variant,
        selectedOptions: options,
        note,
      }];
    });
    setPopId(product.id);
    setTimeout(() => setPopId(null), 250);
    setBuilderProduct(null);
  };

  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const newQty = i.qty + delta;
        if (i.product.trackInventory && newQty > i.product.stock) return i;
        return { ...i, qty: newQty };
      }
      return i;
    }).filter(i => i.qty > 0));

  const setDiscount = (id: string, pct: number, nominal?: number) =>
    setCart(prev => prev.map(i => {
      if (i.id === id) {
        const basePrice = unitPriceOf(i);
        const finalNominal = nominal !== undefined ? Math.max(0, Math.min(basePrice, nominal)) : undefined;
        return {
          ...i, 
          discount: Math.max(0, Math.min(100, pct)),
          itemDiscountPercent: pct,
          itemDiscountNominal: finalNominal 
        };
      }
      return i;
    }));

  const [clearCartModalOpen, setClearCartModalOpen] = useState(false);

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart  = () => {
    if (cart.length === 0) return;
    setClearCartModalOpen(true);
  };

  // Totals come from the shared pricing engine so the cart, checkout and reports can never disagree.
  const pricingLines = useMemo(() => cartToPricingLines(cart, categories), [cart, categories]);
  const tierDiscountPercent = useMemo(() => {
    const customer = customers?.find(c => c.id === selectedCustomerId);
    return resolveCustomerTier(customer, loyaltySettings)?.discountPercent ?? 0;
  }, [customers, selectedCustomerId, loyaltySettings]);
  const cartTotals = useMemo(
    () => computeOrderTotals({ lines: pricingLines, taxRules, tierDiscountPercent, serviceCharge }),
    [pricingLines, taxRules, tierDiscountPercent, serviceCharge],
  );
  const { subtotal, tierDiscount: tierDiscountAmt, taxTotal: tax, total } = cartTotals;

  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const holdOrder = () => {
    if (cart.length === 0) return;
    const heldItems = cart.map(i => ({ ...i }));
    setHeldOrders(prev => [...prev, {
      id: Date.now().toString(),
      items: heldItems,
      orderType,
      heldAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      tableNote
    }]);
    setCart([]);
    setTableNote('');
  };

  const resumeOrder = (held: HeldOrder) => {
    setCart(held.items);
    setOrderType(held.orderType);
    setHeldOrders(prev => prev.filter(o => o.id !== held.id));
    setShowHeld(false);
  };

  const handleCheckoutDone = (result: CheckoutResult) => {
    const invoiceNum = onOrderComplete(cart, orderType, selectedCustomerId || undefined, result);
    setTableNote('');
    setSelectedCustomerId(null);
    return invoiceNum;
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
  };

  const dm = darkMode;
  const bg      = dm ? 'bg-ink-900' : 'bg-ink-100';
  const toolbar  = dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-200';
  const inputCls = dm ? 'bg-ink-700 border-ink-600 text-ink-100 placeholder-ink-500 focus:border-brand-400' : 'bg-ink-50 border-ink-200 text-ink-700 focus:border-brand-400';
  const catActive = dm ? 'bg-brand-500 text-white' : 'bg-brand-600 text-white';
  const catInact  = dm ? 'bg-ink-800 text-ink-300 hover:bg-ink-700' : 'bg-white text-ink-600 hover:bg-ink-50 border border-ink-200';
  const surface = dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-200';
  const t1      = dm ? 'text-ink-100' : 'text-ink-800';
  const t2      = dm ? 'text-ink-400' : 'text-ink-500';

  return (
    <div className={`flex h-full w-full overflow-hidden ${bg}`}>
      {/* Left: product area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {terminalViewMode === 'scanner' ? (
          <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
            <Package size={64} className={dm ? 'text-ink-700' : 'text-ink-300'} />
            <h2 className={`text-xl font-bold ${t1}`}>Scanner Mode Active</h2>
            <p className={`text-sm ${t2} text-center max-w-md`}>Use your barcode scanner or type a barcode / SKU below and press Enter to instantly add to cart.</p>
            <form onSubmit={(e) => {
              e.preventDefault();
              if (!search.trim()) return;
              const q = search.trim().toLowerCase();
              // Check exact variant match first
              let matchedProduct: Product | undefined;
              let matchedVariant: ProductVariant | undefined;

              for (const prod of products) {
                if (prod.variants && prod.variants.length > 0) {
                  const v = prod.variants.find(va => (va.barcode && va.barcode.toLowerCase() === q) || (va.sku && va.sku.toLowerCase() === q));
                  if (v) {
                    matchedProduct = prod;
                    matchedVariant = v;
                    break;
                  }
                }
              }

              if (!matchedProduct) {
                matchedProduct = products.find(p => (p.barcode?.toLowerCase() === q || p.sku?.toLowerCase() === q || p.name.toLowerCase() === q));
              }

              if (matchedProduct) {
                if (matchedProduct.trackInventory && matchedProduct.stock === 0) {
                  showToast('Product out of stock!', 'error');
                } else if (matchedVariant) {
                  // A scanned barcode identifies the variant. Options still need a choice,
                  // so open the builder with that variant already picked instead of guessing.
                  if ((matchedProduct.optionGroups?.length ?? 0) > 0) {
                    setBuilderProduct(matchedProduct);
                  } else {
                    addToCart(matchedProduct, matchedVariant);
                  }
                  setSearch('');
                } else {
                  handleProductClick(matchedProduct);
                  setSearch('');
                }
              } else {
                showToast('Product not found!', 'error');
              }
            }} className="w-full max-w-md relative">
              <input
                autoFocus
                type="text"
                placeholder="Scan barcode..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full text-center text-xl font-bold px-4 py-4 border-2 rounded-2xl focus:border-brand-500 focus:outline-none shadow-sm ${dm ? 'bg-ink-800 border-ink-700 text-white' : 'bg-white border-ink-200'}`}
              />
              <button type="submit" className="hidden" />
            </form>
          </div>
        ) : (
          <>
        {/* Toolbar */}
        <div className={`border-b px-4 py-3 flex flex-col gap-3 ${toolbar}`}>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search product or scan barcode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-8 py-2 border rounded-xl text-sm focus:outline-none transition-colors ${inputCls}`}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-400 hover:text-ink-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {businessType === 'fnb' && (
              <div className={`hidden sm:flex border rounded-xl overflow-hidden ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                {ORDER_TYPES.map(ot => (
                  <button
                    key={ot.id}
                    onClick={() => setOrderType(ot.id)}
                    className={`px-3 py-2 text-sm transition-colors ${orderType === ot.id ? 'bg-brand-600 text-white' : dm ? 'text-ink-400 hover:bg-ink-700' : 'text-ink-500 hover:bg-ink-50'}`}
                  >
                    {ot.label}
                  </button>
                ))}
              </div>
            )}

            {heldOrders.length > 0 && (
              <button
                onClick={() => setShowHeld(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-turmeric-500/10 border border-turmeric-500/30 rounded-xl text-turmeric-600 text-sm hover:bg-turmeric-500/20 transition-colors"
              >
                <Pause size={14} />
                <span>{heldOrders.length} Held</span>
              </button>
            )}

            <button
              onClick={() => setCartOpen(true)}
              className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 bg-brand-600 text-white rounded-xl text-sm"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-chili-500 text-white text-xs flex items-center justify-center font-bold">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.name)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat.name ? catActive : catInact}`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className={`flex flex-col items-center justify-center h-40 gap-2 ${dm ? 'text-ink-600' : 'text-ink-400'}`}>
              <Search size={32} />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 content-start">
              {filtered.map(product => {
                const inCartQty  = cart.filter(i => i.product.id === product.id).reduce((s, i) => s + i.qty, 0);
                const inCart     = inCartQty > 0;
                const lowStock   = product.trackInventory && product.stock <= product.lowStockThreshold && product.stock > 0;
                const outOfStock = product.trackInventory && product.stock === 0;
                const isPopping  = popId === product.id;

                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && handleProductClick(product)}
                    disabled={outOfStock}
                    className={[
                      'relative rounded-2xl p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 active:scale-95',
                      isPopping ? 'pop-animation' : '',
                      outOfStock
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer hover:shadow-md',
                      inCart
                        ? dm ? 'bg-brand-600/15 border-2 border-brand-500' : 'bg-brand-50 border-2 border-brand-400 shadow-brand-100'
                        : dm ? 'bg-ink-800 border-2 border-ink-700 hover:border-ink-600' : 'bg-white border-2 border-transparent hover:border-ink-200',
                    ].join(' ')}
                  >
                    {/* Qty badge */}
                    {inCart && (
                      <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-brand-600 text-white text-xs flex items-center justify-center font-bold z-10">
                        {inCartQty}
                      </span>
                    )}

                    {/* Low stock indicator */}
                    {lowStock && (
                      <span className="absolute top-2 right-2 z-10">
                        <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-turmeric-500" />
                      </span>
                    )}

                    {/* Out of stock overlay */}
                    {outOfStock && (
                      <span className={`absolute inset-0 rounded-2xl flex items-center justify-center text-xs font-bold z-10 ${dm ? 'bg-ink-800' : 'bg-white'}`}>
                        <span className="bg-chili-100 text-chili-600 px-2 py-1 rounded-full">Out of Stock</span>
                      </span>
                    )}
                    
                    {/* Tells the cashier a tap opens the builder rather than adding straight away */}
                    {((product.variants?.length ?? 0) > 0 || (product.optionGroups?.length ?? 0) > 0) && !outOfStock && (
                      <span className="absolute top-2 right-2 bg-brand-600 text-white text-[11px] px-1.5 py-0.5 rounded font-semibold z-10">
                        {(product.optionGroups?.length ?? 0) > 0 ? 'Options' : `${product.variants!.length} variants`}
                      </span>
                    )}

                    {/* Product image or emoji */}
                    <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-2.5 overflow-hidden ${dm ? 'bg-ink-700' : 'bg-ink-50'}`}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl select-none">{product.emoji}</span>
                      )}
                    </div>

                    {/* Category chip */}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1 inline-block ${dm ? 'bg-ink-700 text-ink-400' : 'bg-ink-100 text-ink-500'}`}>
                      {product.category}
                    </span>

                    <p className={`text-sm font-medium leading-tight mb-1 ${dm ? 'text-ink-100' : 'text-ink-800'}`}>
                      {product.name}
                    </p>
                    <p className="text-brand-500 text-sm font-semibold tabular-nums">{formatIDR(product.price)}</p>
                    {product.trackInventory && (
                      <p className={`text-xs mt-0.5 ${lowStock ? 'text-turmeric-500 font-medium' : dm ? 'text-ink-500' : 'text-ink-400'}`}>
                        Stock: {product.stock}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
        </>
        )}
      </div>

      {/* Right: Cart panel */}
      <CartPanel
        cart={cart}
        orderType={orderType}
        businessType={businessType}
        darkMode={darkMode}
        discountSettings={discountSettings}
        customers={customers}
        setCustomers={setCustomers}
        selectedCustomerId={selectedCustomerId}
        onSelectCustomer={setSelectedCustomerId}
        onOrderTypeChange={setOrderType}
        onUpdateQty={updateQty}
        onSetDiscount={setDiscount}
        onRemoveItem={removeItem}
        onClearCart={clearCart}
        onHoldOrder={holdOrder}
        onCheckout={() => setShowCheckout(true)}
        tableNote={tableNote}
        onTableNoteChange={setTableNote}
        subtotal={subtotal}
        tierDiscountAmt={tierDiscountAmt}
        tax={tax}
        serviceChargeAmt={cartTotals.serviceCharge}
        registerReady={registerReady}
        onOpenRegister={onOpenRegister}
        total={total}
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
      />

      {/* Held orders panel */}
      <AnimatePresence>
        {showHeld && (
          <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50" onClick={() => setShowHeld(false)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`relative rounded-2xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl ${dm ? 'bg-ink-800 border border-ink-700' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${dm ? 'text-white' : 'text-ink-800'}`}>Held Orders</h3>
                <button onClick={() => setShowHeld(false)} className={`p-2 -mr-2 rounded-full transition-colors ${dm ? 'text-ink-400 hover:bg-ink-700' : 'text-ink-400 hover:bg-ink-100'}`}>
                  <X size={18} />
                </button>
              </div>
              {heldOrders.length === 0 ? (
                <p className={`text-sm text-center py-8 ${dm ? 'text-ink-500' : 'text-ink-400'}`}>No held orders</p>
              ) : (
                <div className="space-y-3">
                  {heldOrders.map(held => (
                    <div key={held.id} className={`border rounded-xl p-3 ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm capitalize ${dm ? 'text-ink-300' : 'text-ink-600'}`}>{held.orderType}</span>
                        <span className={`text-xs tabular-nums ${dm ? 'text-ink-500' : 'text-ink-400'}`}>{held.heldAt}</span>
                      </div>
                      {held.tableNote && <p className={`text-xs mb-1 ${dm ? 'text-ink-400' : 'text-ink-500'}`}>{held.tableNote}</p>}
                      <p className={`text-xs mb-3 tabular-nums ${dm ? 'text-ink-500' : 'text-ink-400'}`}>
                        {held.items.reduce((s, i) => s + i.qty, 0)} items, {formatIDR(held.items.reduce((s, i) => s + unitPriceOf(i) * i.qty, 0))}
                      </p>
                      <button
                        onClick={() => resumeOrder(held)}
                        className="w-full flex items-center justify-center gap-2 bg-brand-600 text-white rounded-lg py-2.5 text-sm hover:bg-brand-700 transition-colors"
                      >
                        <PlayCircle size={15} /> Resume
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      <AnimatePresence>
        {builderProduct && (
          <ItemBuilderModal
            product={builderProduct}
            darkMode={darkMode}
            onClose={() => setBuilderProduct(null)}
            onAdd={({ variant, options, note, qty }) => addToCart(builderProduct, variant, options, note, qty)}
          />
        )}
      </AnimatePresence>

      {showCheckout && (
        <CheckoutModal
          cart={cart}
          orderType={orderType}
          cashierName={currentUser.name}
          bizName={bizName}
          darkMode={darkMode}
          discountSettings={discountSettings}
          categories={categories}
          customers={customers}
          loyaltySettings={loyaltySettings}
          selectedCustomerId={selectedCustomerId}
          pricingLines={pricingLines}
          taxRules={taxRules}
          tierDiscountPercent={tierDiscountPercent}
          serviceCharge={serviceCharge}
          paymentMethods={paymentMethods}
          onClose={(completed) => {
            setShowCheckout(false);
            if (completed) {
              setCart([]);
              setTableNote('');
              setSelectedCustomerId(null);
            }
          }}
          onConfirm={handleCheckoutDone}
        />
      )}

      <ConfirmationModal
        isOpen={clearCartModalOpen}
        title="Clear Cart?"
        message="Are you sure you want to remove all items from the current order?"
        confirmText="Clear Cart"
        cancelText="Cancel"
        isDestructive={true}
        darkMode={darkMode}
        onCancel={() => setClearCartModalOpen(false)}
        onConfirm={() => {
          setCart([]);
          setTableNote('');
          setClearCartModalOpen(false);
        }}
      />
    </div>
  );
}

// ─── Cart Panel ──────────────────────────────────────────────────────────────

interface CartPanelProps {
  cart: CartItem[];
  orderType: OrderType;
  businessType: BusinessType;
  darkMode: boolean;
  discountSettings: DiscountSettings;
  customers: Customer[];
  setCustomers: React.Dispatch<React.SetStateAction<Customer[]>>;
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string | null) => void;
  onOrderTypeChange: (t: OrderType) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onSetDiscount: (id: string, pct: number, nominal?: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onCheckout: () => void;
  tableNote: string;
  onTableNoteChange: (v: string) => void;
  subtotal: number;
  tierDiscountAmt: number;
  tax: number;
  serviceChargeAmt: number;
  registerReady: boolean;
  onOpenRegister?: () => void;
  total: number;
  isOpen: boolean;
  onClose: () => void;
}

function CartPanel({
  cart, orderType, businessType, darkMode, discountSettings,
  customers, setCustomers, selectedCustomerId, onSelectCustomer,
  onOrderTypeChange, onUpdateQty, onSetDiscount, onRemoveItem, onClearCart, onHoldOrder, onCheckout,
  tableNote, onTableNoteChange, subtotal, tierDiscountAmt, tax, serviceChargeAmt, registerReady, onOpenRegister, total, isOpen, onClose,
}: CartPanelProps) {
  const [editDiscountId, setEditDiscountId] = useState<string | null>(null);
  const [discountVal, setDiscountVal] = useState('');
  const [discountType, setDiscountType] = useState<'percent'|'nominal'>('percent');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerModalTab, setCustomerModalTab] = useState<'search' | 'add'>('search');
  const [customerSearch, setCustomerSearch] = useState('');
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddPhone, setQuickAddPhone] = useState('+62 ');
  const [quickAddConsent, setQuickAddConsent] = useState(false);
  
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const ORDER_TYPES: { id: OrderType; label: string }[] = [
    { id: 'dine-in', label: 'Dine-in' }, { id: 'takeaway', label: 'Takeaway' }, { id: 'delivery', label: 'Delivery' },
  ];

  const dm = darkMode;
  const surface = dm ? 'bg-ink-800' : 'bg-white';
  const border  = dm ? 'border-ink-700' : 'border-ink-200';
  const t1      = dm ? 'text-ink-100' : 'text-ink-800';
  const t2      = dm ? 'text-ink-400' : 'text-ink-500';

  const applyDiscount = (id: string) => {
    if (discountType === 'percent') {
      onSetDiscount(id, Number(discountVal), undefined);
    } else {
      onSetDiscount(id, 0, Number(discountVal));
    }
    setEditDiscountId(null);
  };

  const panel = (
    <div className={`flex flex-col h-full ${surface}`}>
      {/* Cart header */}
      <div className={`flex items-center justify-between px-4 h-14 border-b shrink-0 ${border}`}>
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className={t2} />
          <span className={`text-sm font-semibold ${t1}`}>Order {itemCount > 0 ? `(${itemCount})` : ''}</span>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={onClearCart} className={`text-xs text-chili-500 hover:text-chili-700 px-2 py-1 rounded transition-colors ${dm ? 'hover:bg-chili-900/20' : 'hover:bg-chili-50'}`}>
              Clear
            </button>
          )}
          <button onClick={onClose} className={`lg:hidden p-1 ${t2}`}><X size={18} /></button>
        </div>
      </div>

      {/* Customer Attach */}
      <div className={`px-4 py-3 border-b shrink-0 flex items-center justify-between ${border}`}>
        {selectedCustomerId ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dm ? 'bg-brand-900/30 text-brand-400' : 'bg-brand-100 text-brand-600'}`}>
                <Users size={14} />
              </div>
              <div>
                <p className={`text-xs font-semibold ${t1}`}>{customers.find(c => c.id === selectedCustomerId)?.name}</p>
                <p className={`text-[10px] ${t2}`}>{customers.find(c => c.id === selectedCustomerId)?.pointsBalance} pts</p>
              </div>
            </div>
            <button onClick={() => onSelectCustomer(null)} className={`text-xs ${t2} hover:text-chili-500`}>Remove</button>
          </div>
        ) : (
          <button onClick={() => setShowCustomerModal(true)} className={`w-full flex items-center justify-center gap-2 py-2 border border-dashed rounded-xl transition-colors text-sm font-medium ${dm ? 'border-ink-600 text-ink-400 hover:text-ink-200 hover:border-ink-400 hover:bg-ink-700/50' : 'border-ink-300 text-ink-500 hover:text-ink-700 hover:border-ink-400 hover:bg-ink-50'}`}>
            <UserPlus size={16} /> Add Customer
          </button>
        )}
      </div>

      {/* Order type */}
      {businessType === 'fnb' && (
        <div className={`px-4 py-3 border-b shrink-0 ${border}`}>
          <div className={`flex border rounded-xl overflow-hidden ${border}`}>
            {ORDER_TYPES.map(ot => (
              <button
                key={ot.id}
                onClick={() => onOrderTypeChange(ot.id)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${orderType === ot.id ? 'bg-brand-600 text-white' : dm ? 'text-ink-400 hover:bg-ink-700' : 'text-ink-500 hover:bg-ink-50'}`}
              >
                {ot.label}
              </button>
            ))}
          </div>
          {orderType === 'dine-in' && (
            <input
              type="text"
              placeholder="Table note (e.g. Table 5)…"
              value={tableNote}
              onChange={e => onTableNoteChange(e.target.value)}
              className={`mt-2 w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:border-brand-400 ${dm ? 'bg-ink-700 border-ink-600 text-ink-200 placeholder-ink-500' : 'border-ink-200 text-ink-700 placeholder-ink-400'}`}
            />
          )}
        </div>
      )}

      {/* Cart items */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {cart.length === 0 ? (
          <div className={`flex flex-col items-center justify-center h-full gap-3 py-12 ${t2}`}>
            <ShoppingCart size={36} className="opacity-40" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs text-center opacity-70">Tap a product to add it</p>
          </div>
        ) : (
          cart.map(item => {
            const basePrice = unitPriceOf(item);
            const linePrice = basePrice * item.qty;
            let discounted = linePrice;
            
            if (item.itemDiscountNominal) {
              discounted -= (item.itemDiscountNominal * item.qty);
            } else if (item.discount) {
              discounted -= linePrice * (item.discount / 100);
            }

            return (
              <div key={item.id} className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  {/* Thumbnail */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${dm ? 'bg-ink-700' : 'bg-ink-100'}`}>
                    {item.product.image
                      ? <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      : <span className="text-base">{item.product.emoji}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${t1}`}>{item.product.name}</p>
                    {optionsSummary(item) && (
                      <p className={`text-xs leading-tight mt-0.5 ${t2}`}>{optionsSummary(item)}</p>
                    )}
                    {item.note && (
                      <p className={`text-xs leading-tight mt-0.5 italic ${dm ? 'text-turmeric-300' : 'text-turmeric-700'}`}>{item.note}</p>
                    )}
                    <div className="flex items-center gap-1 mt-0.5">
                      {(item.discount > 0 || item.itemDiscountNominal) && <span className={`text-xs line-through tabular-nums ${t2}`}>{formatIDR(linePrice)}</span>}
                      <span className="text-sm text-brand-500 tabular-nums font-semibold">{formatIDR(discounted)}</span>
                    </div>
                  </div>
                  <button onClick={() => onRemoveItem(item.id)} className={`p-1.5 -mr-1 rounded-lg transition-colors ${t2} hover:text-chili-500 ${dm ? 'hover:bg-chili-900/20' : 'hover:bg-chili-50'}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-11">
                  <div className={`flex items-center border rounded-lg overflow-hidden ${border}`}>
                    <button onClick={() => onUpdateQty(item.id, -1)} className={`w-9 h-9 flex items-center justify-center transition-colors ${dm ? 'text-ink-400 hover:bg-ink-700' : 'text-ink-500 hover:bg-ink-100'}`}>
                      <Minus size={13} />
                    </button>
                    <span className={`w-7 text-center text-sm tabular-nums font-semibold ${t1}`}>{item.qty}</span>
                    <button onClick={() => onUpdateQty(item.id, 1)} className={`w-9 h-9 flex items-center justify-center transition-colors ${dm ? 'text-ink-400 hover:bg-ink-700' : 'text-ink-500 hover:bg-ink-100'}`}>
                      <Plus size={13} />
                    </button>
                  </div>

                  {discountSettings.enabled && item.product.allowDiscount && (
                    editDiscountId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="text"
                          inputMode="numeric"
                          value={discountType === 'nominal' ? (discountVal ? formatNumberWithDots(discountVal) : '') : discountVal}
                          onChange={e => setDiscountVal(discountType === 'nominal' ? e.target.value.replace(/\D/g, '') : e.target.value)}
                          placeholder={discountType === 'nominal' ? "10.000" : "Amt"}
                          className={`w-20 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-brand-400 ${dm ? 'bg-ink-700 border-ink-600 text-ink-200' : 'border-ink-200'}`}
                          autoFocus
                        />
                        <button onClick={() => setDiscountType(t => t === 'percent' ? 'nominal' : 'percent')} className={`px-1.5 py-1 text-xs border rounded ${dm ? 'border-ink-600' : 'border-ink-300'}`}>
                          {discountType === 'percent' ? '%' : 'Rp'}
                        </button>
                        <button onClick={() => applyDiscount(item.id)} className="text-xs text-brand-500 px-1 font-medium">OK</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditDiscountId(item.id); setDiscountVal(String(item.itemDiscountNominal || item.discount || '')); setDiscountType(item.itemDiscountNominal ? 'nominal' : 'percent'); }}
                        className={`text-xs flex items-center gap-0.5 transition-colors ${item.discount > 0 || item.itemDiscountNominal ? 'text-turmeric-500' : `${t2} hover:text-turmeric-500`}`}
                      >
                        <Percent size={11} />
                        {item.itemDiscountNominal ? `-Rp${item.itemDiscountNominal}` : item.discount > 0 ? `-${item.discount}%` : 'Disc'}
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Order totals + actions — the one figure a cashier reads aloud */}
      <div className={`border-t shrink-0 ${border} ${dm ? 'bg-ink-900' : 'bg-ink-50'}`}>
        <div className={`px-4 pt-4 pb-3 space-y-1 text-sm tabular-nums ${t2}`}>
          <div className="flex justify-between"><span>Subtotal</span><span>{formatIDR(subtotal)}</span></div>
          {tierDiscountAmt > 0 && (
            <div className={`flex justify-between ${dm ? 'text-turmeric-300' : 'text-turmeric-700'}`}>
              <span>Member discount</span><span>−{formatIDR(tierDiscountAmt)}</span>
            </div>
          )}
          {serviceChargeAmt > 0 && (
            <div className="flex justify-between"><span>Service charge</span><span>{formatIDR(serviceChargeAmt)}</span></div>
          )}
          <div className="flex justify-between"><span>Tax</span><span>{formatIDR(tax)}</span></div>
        </div>

        <div className={`mx-4 border-t border-dashed ${dm ? 'border-ink-700' : 'border-ink-300'}`} />
        <div className="px-4 pt-3 pb-4 flex items-baseline justify-between gap-3" aria-live="polite">
          <span className={`text-sm font-semibold ${t1}`}>Total</span>
          <span className={`text-[28px] leading-none font-extrabold tracking-tight tabular-nums ${dm ? 'text-ink-50' : 'text-ink-900'}`}>{formatIDR(total)}</span>
        </div>

        {!registerReady && (
          <div className="mx-4 mb-3 rounded-md border border-turmeric-300 bg-turmeric-50 p-3 dark:border-turmeric-500/40 dark:bg-turmeric-500/10">
            <p className="text-sm font-medium text-turmeric-900 dark:text-turmeric-100">Open the register first</p>
            <p className="text-xs mt-0.5 text-turmeric-800 dark:text-turmeric-200">Count the cash in the drawer so this shift can be balanced later.</p>
            <button type="button" onClick={onOpenRegister} className="mt-2 h-9 px-3 rounded-md bg-turmeric-500 text-ink-950 text-sm font-semibold cursor-pointer hover:bg-turmeric-400">
              Open register
            </button>
          </div>
        )}

        <div className="px-4 pb-4 flex gap-2">
          <button
            type="button"
            onClick={onHoldOrder}
            disabled={cart.length === 0}
            className={`flex-1 flex items-center justify-center gap-1.5 border rounded-md h-12 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium ${dm ? 'border-ink-700 text-ink-300 hover:bg-ink-800' : 'border-ink-300 text-ink-700 bg-white hover:bg-ink-100'}`}
          >
            <Pause size={14} /> Hold
          </button>
          <button
            type="button"
            onClick={onCheckout}
            disabled={cart.length === 0 || !registerReady}
            className={`flex-[2] rounded-md h-12 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed text-base font-semibold ${dm ? 'bg-brand-400 text-ink-950 hover:bg-brand-300' : 'bg-brand-600 text-white hover:bg-brand-700'}`}
          >
            Take payment
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`hidden lg:flex w-80 xl:w-96 border-l flex-col ${darkMode ? 'border-ink-700' : 'border-ink-200'}`}>
        {panel}
      </div>
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50" onClick={onClose} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
              className="relative w-80 sm:w-96 h-full flex flex-col shadow-2xl"
            >
              {panel}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className={`w-full max-w-md rounded-2xl p-5 shadow-2xl ${dm ? 'bg-ink-800 border border-ink-700' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${t1}`}>Add Customer to Order</h3>
              <button onClick={() => setShowCustomerModal(false)} className={t2}><X size={18} /></button>
            </div>

            {/* Mode Tabs */}
            <div className={`flex rounded-xl p-1 mb-4 ${dm ? 'bg-ink-900' : 'bg-ink-100'}`}>
              <button
                type="button"
                onClick={() => setCustomerModalTab('search')}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${customerModalTab === 'search' ? (dm ? 'bg-ink-800 text-white shadow-sm' : 'bg-white text-ink-800 shadow-sm') : t2}`}
              >
                Existing Customer
              </button>
              <button
                type="button"
                onClick={() => {
                  setCustomerModalTab('add');
                  if (!quickAddPhone) setQuickAddPhone('+62 ');
                }}
                className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors ${customerModalTab === 'add' ? (dm ? 'bg-ink-800 text-white shadow-sm' : 'bg-white text-ink-800 shadow-sm') : t2}`}
              >
                + New Customer
              </button>
            </div>

            {customerModalTab === 'search' ? (
              <>
                <input 
                  value={customerSearch} 
                  onChange={e => setCustomerSearch(e.target.value)} 
                  placeholder="Search customer name or phone number..." 
                  className={`w-full p-2.5 mb-3 rounded-xl border outline-none text-sm ${dm ? 'bg-ink-900 border-ink-700 focus:border-brand-500 text-ink-200' : 'bg-ink-50 border-ink-200 focus:border-brand-400 text-ink-800'}`}
                />
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).map(c => (
                    <button
                      key={c.id}
                      onClick={() => { onSelectCustomer(c.id); setShowCustomerModal(false); }}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${dm ? 'border-ink-700 hover:bg-ink-700/60' : 'border-ink-100 hover:bg-ink-50'}`}
                    >
                      <div>
                        <p className={`text-sm font-semibold ${t1}`}>{c.name}</p>
                        <p className={`text-xs ${t2}`}>{c.phone || 'No phone'}</p>
                      </div>
                      <div className={`text-xs font-medium px-2 py-1 rounded-lg ${dm ? 'bg-ink-900 text-turmeric-400' : 'bg-turmeric-100 text-turmeric-700'}`}>
                        {c.pointsBalance} pts
                      </div>
                    </button>
                  ))}
                  {customers.filter(c => c.name.toLowerCase().includes(customerSearch.toLowerCase()) || c.phone.includes(customerSearch)).length === 0 && (
                    <div className="text-center py-6">
                      <p className={`text-sm ${t2} mb-3`}>No customer found matching "{customerSearch}"</p>
                      <button
                        type="button"
                        onClick={() => {
                          setQuickAddName(customerSearch);
                          setCustomerModalTab('add');
                          if (!quickAddPhone) setQuickAddPhone('+62 ');
                        }}
                        className="text-xs text-brand-600 font-medium hover:underline"
                      >
                        Add "{customerSearch}" as a new customer
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className={`block text-xs font-medium mb-1 ${t2}`}>Customer Name *</label>
                  <input
                    type="text"
                    value={quickAddName}
                    onChange={e => setQuickAddName(e.target.value)}
                    placeholder="e.g. Budi Santoso"
                    className={`w-full p-2.5 rounded-xl border outline-none text-sm ${dm ? 'bg-ink-900 border-ink-700 text-ink-200 focus:border-brand-500' : 'bg-ink-50 border-ink-200 text-ink-800 focus:border-brand-400'}`}
                  />
                </div>
                <div>
                  <label className={`block text-xs font-medium mb-1 ${t2}`}>Phone Number *</label>
                  <input
                    type="tel"
                    value={quickAddPhone}
                    onChange={e => setQuickAddPhone(formatIndonesianPhone(e.target.value))}
                    onFocus={() => {
                      if (!quickAddPhone) setQuickAddPhone('+62 ');
                    }}
                    placeholder="+62 812-3456-7890"
                    className={`w-full p-2.5 rounded-xl border outline-none text-sm ${dm ? 'bg-ink-900 border-ink-700 text-ink-200 focus:border-brand-500' : 'bg-ink-50 border-ink-200 text-ink-800 focus:border-brand-400'}`}
                  />
                </div>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={quickAddConsent} onChange={e => setQuickAddConsent(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-600" />
                  <span className={`text-xs ${t2}`}>Agrees to receive promotions</span>
                </label>
                <button
                  type="button"
                  disabled={!quickAddName.trim() || quickAddPhone.trim().length <= 4}
                  onClick={() => {
                    if (!quickAddName.trim()) return;
                    const newId = Date.now().toString();
                    const newCust: Customer = {
                      id: newId,
                      name: quickAddName.trim(),
                      phone: quickAddPhone.trim(),
                      email: '',
                      tags: [],
                      pointsBalance: 0,
                      totalSpend: 0,
                      totalTransactions: 0,
                      averageTransactionValue: 0,
                      marketingConsent: quickAddConsent,
                      registrationDate: new Date().toISOString()
                    };
                    setCustomers(prev => [...prev, newCust]);
                    onSelectCustomer(newId);
                    setShowCustomerModal(false);
                    setCustomerSearch('');
                    setQuickAddName('');
                    setQuickAddConsent(false);
                    setQuickAddPhone('+62 ');
                    setCustomerModalTab('search');
                  }}
                  className="w-full py-2.5 mt-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors shadow-sm"
                >
                  Add & Select
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
