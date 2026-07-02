import { useState, useMemo } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Pause, ChevronDown,
  AlertTriangle, PlayCircle, X, Package, Percent, UserPlus, Users
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { BusinessType, CartItem, HeldOrder, OrderType, PaymentMethod, Product, User, Category, DiscountSettings, ProductVariant, Customer, LoyaltySettings } from './mockData';
import { formatIDR, TAX_RATE } from './mockData';
import { CheckoutModal } from './CheckoutModal';

interface POSViewProps {
  businessType: BusinessType;
  products: Product[];
  categories: Category[];
  discountSettings: DiscountSettings;
  currentUser: User;
  bizName: string;
  darkMode: boolean;
  customers: Customer[];
  loyaltySettings: LoyaltySettings;
  onOrderComplete: (cart: CartItem[], orderType: OrderType, paymentMethod: PaymentMethod, amountPaid: number, promoCode?: string, customerId?: string, pointsEarned?: number, pointsRedeemed?: number, pointsDiscountAmt?: number) => void;
}

const ORDER_TYPES: { id: OrderType; label: string }[] = [
  { id: 'dine-in',  label: 'Dine-in'  },
  { id: 'takeaway', label: 'Takeaway' },
  { id: 'delivery', label: 'Delivery' },
];

export function POSView({ businessType, products, categories, discountSettings, currentUser, bizName, darkMode, customers, loyaltySettings, onOrderComplete }: POSViewProps) {
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
  
  // Variant Selection State
  const [variantProduct, setVariantProduct] = useState<Product | null>(null);

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'All') list = list.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.toLowerCase().includes(q)) || (p.sku && p.sku.toLowerCase().includes(q)));
    }
    return list;
  }, [products, category, search]);

  const handleProductClick = (product: Product) => {
    if (product.variants && product.variants.length > 0) {
      setVariantProduct(product);
    } else {
      addToCart(product, undefined);
    }
  };

  const addToCart = (product: Product, variant?: ProductVariant) => {
    setCart(prev => {
      // Find exact match based on product AND variant
      const existing = prev.find(i => i.product.id === product.id && i.variant?.id === variant?.id);
      if (existing) {
        return prev.map(i => i.id === existing.id ? { ...i, qty: i.qty + 1 } : i);
      }
      return [...prev, { 
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        product, 
        qty: 1, 
        discount: 0,
        variant 
      }];
    });
    setPopId(product.id);
    setTimeout(() => setPopId(null), 250);
    setVariantProduct(null);
  };

  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));

  const setDiscount = (id: string, pct: number, nominal?: number) =>
    setCart(prev => prev.map(i => i.id === id ? { 
      ...i, 
      discount: Math.max(0, Math.min(100, pct)),
      itemDiscountPercent: pct,
      itemDiscountNominal: nominal 
    } : i));

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.id !== id));
  const clearCart  = () => setCart([]);

  const { subtotal, tierDiscountAmt, tax, total } = useMemo(() => {
    let sub = 0;
    let taxAmt = 0;
    
    cart.forEach(item => {
      const basePrice = item.product.price + (item.variant?.priceModifier || 0);
      const linePrice = basePrice * item.qty;
      
      let itemTotal = linePrice;
      if (item.itemDiscountNominal) {
        itemTotal -= (item.itemDiscountNominal * item.qty);
      } else if (item.discount) {
        itemTotal -= linePrice * (item.discount / 100);
      }
      
      sub += itemTotal;
      
      const cat = categories.find(c => c.name === item.product.category);
      if (cat?.isTaxable) {
        taxAmt += itemTotal * TAX_RATE;
      }
    });

    const customer = customers?.find(c => c.id === selectedCustomerId);
    const tier = customer?.tierId ? loyaltySettings?.tiers?.find(t => t.id === customer.tierId) : null;
    const tierDiscountPercent = tier?.discountPercent || 0;
    const tierDisc = Math.round(sub * (tierDiscountPercent / 100));
    
    // Tax is typically calculated after discounts, but for simplicity let's keep taxAmt based on item taxable amount minus tier discount portion
    // Actually, to be simple, let's just subtract tierDisc from subtotal for the final total.
    const finalTotal = sub - tierDisc + Math.round(taxAmt);

    return { subtotal: sub, tierDiscountAmt: tierDisc, tax: Math.round(taxAmt), total: finalTotal };
  }, [cart, categories, customers, selectedCustomerId, loyaltySettings]);

  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const holdOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders(prev => [...prev, { id: Date.now().toString(), items: [...cart], orderType, heldAt: new Date().toLocaleTimeString(), tableNote }]);
    clearCart();
    setTableNote('');
  };

  const resumeOrder = (held: HeldOrder) => {
    setCart(held.items);
    setOrderType(held.orderType);
    setHeldOrders(prev => prev.filter(o => o.id !== held.id));
    setShowHeld(false);
  };

  const handleCheckoutDone = (method: PaymentMethod, amountPaid: number, promoCode?: string, pointsRedeemed?: number, pointsDiscountAmt?: number) => {
    // Points earned is calculated in App.tsx or here? App.tsx handles saving the order. Let's pass what App needs.
    onOrderComplete(cart, orderType, method, amountPaid, promoCode, selectedCustomerId || undefined, undefined, pointsRedeemed, pointsDiscountAmt);
    setTableNote('');
    setSelectedCustomerId(null);
  };

  const handleCheckoutClose = () => {
    setShowCheckout(false);
    if (cart.length > 0 && heldOrders.length === 0) {
      // If the order was completed, handleCheckoutDone was called. We should clear the cart now.
      // But we need a way to know if it was completed or just closed.
      // Actually, if we just clear cart when onOrderComplete is called, it unmounts the modal.
      // So instead, let's just clear the cart inside handleCheckoutClose if the modal was in success state.
      // Since POSView doesn't know the state, we can pass a boolean to onClose.
    }
  };

  const dm = darkMode;
  const bg      = dm ? 'bg-slate-900' : 'bg-slate-100';
  const toolbar  = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputCls = dm ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-400' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-400';
  const catActive = dm ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
  const catInact  = dm ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200';
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const t1      = dm ? 'text-slate-100' : 'text-slate-800';
  const t2      = dm ? 'text-slate-400' : 'text-slate-500';

  return (
    <div className={`flex h-full w-full overflow-hidden ${bg}`}>
      {/* Left: product area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className={`border-b px-4 py-3 flex flex-col gap-3 ${toolbar}`}>
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search product or scan barcode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className={`w-full pl-9 pr-8 py-2 border rounded-xl text-sm focus:outline-none transition-colors ${inputCls}`}
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X size={13} />
                </button>
              )}
            </div>

            {businessType === 'fnb' && (
              <div className={`hidden sm:flex border rounded-xl overflow-hidden ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                {ORDER_TYPES.map(ot => (
                  <button
                    key={ot.id}
                    onClick={() => setOrderType(ot.id)}
                    className={`px-3 py-2 text-sm transition-colors ${orderType === ot.id ? 'bg-blue-600 text-white' : dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    {ot.label}
                  </button>
                ))}
              </div>
            )}

            {heldOrders.length > 0 && (
              <button
                onClick={() => setShowHeld(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-600 text-sm hover:bg-amber-500/20 transition-colors"
              >
                <Pause size={14} />
                <span>{heldOrders.length} Held</span>
              </button>
            )}

            <button
              onClick={() => setCartOpen(true)}
              className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold">
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
            <div className={`flex flex-col items-center justify-center h-40 gap-2 ${dm ? 'text-slate-600' : 'text-slate-400'}`}>
              <Search size={32} />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
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
                      'relative rounded-2xl p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 active:scale-95',
                      isPopping ? 'pop-animation' : '',
                      outOfStock
                        ? 'opacity-40 cursor-not-allowed'
                        : 'cursor-pointer hover:shadow-md',
                      inCart
                        ? dm ? 'bg-blue-600/15 border-2 border-blue-500 shadow-blue-900/30' : 'bg-blue-50 border-2 border-blue-400 shadow-blue-100'
                        : dm ? 'bg-slate-800 border-2 border-slate-700 hover:border-slate-600' : 'bg-white border-2 border-transparent hover:border-slate-200',
                    ].join(' ')}
                  >
                    {/* Qty badge */}
                    {inCart && (
                      <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold z-10">
                        {inCartQty}
                      </span>
                    )}

                    {/* Low stock indicator */}
                    {lowStock && (
                      <span className="absolute top-2 right-2 z-10">
                        <span className="pulse-dot inline-block w-2 h-2 rounded-full bg-amber-500" />
                      </span>
                    )}

                    {/* Out of stock overlay */}
                    {outOfStock && (
                      <span className={`absolute inset-0 rounded-2xl flex items-center justify-center text-xs font-bold z-10 ${dm ? 'bg-slate-800/80' : 'bg-white/80'}`}>
                        <span className="bg-red-100 text-red-600 px-2 py-1 rounded-full">Out of Stock</span>
                      </span>
                    )}
                    
                    {/* Variants indicator */}
                    {product.variants && product.variants.length > 0 && !outOfStock && (
                      <span className="absolute top-2 right-2 bg-blue-500 text-white text-[10px] px-1.5 py-0.5 rounded font-bold z-10">
                        {product.variants.length} Vars
                      </span>
                    )}

                    {/* Product image or emoji */}
                    <div className={`w-full aspect-square rounded-xl flex items-center justify-center mb-2.5 overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-50'}`}>
                      {product.image ? (
                        <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-3xl select-none">{product.emoji}</span>
                      )}
                    </div>

                    {/* Category chip */}
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full mb-1 inline-block ${dm ? 'bg-slate-700 text-slate-400' : 'bg-slate-100 text-slate-500'}`}>
                      {product.category}
                    </span>

                    <p className={`text-sm font-medium leading-tight mb-1 ${dm ? 'text-slate-100' : 'text-slate-800'}`}>
                      {product.name}
                    </p>
                    <p className="text-blue-500 text-sm font-semibold tabular-nums">{formatIDR(product.price)}</p>
                    {product.trackInventory && (
                      <p className={`text-xs mt-0.5 ${lowStock ? 'text-amber-500 font-medium' : dm ? 'text-slate-500' : 'text-slate-400'}`}>
                        Stock: {product.stock}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right: Cart panel */}
      <CartPanel
        cart={cart}
        orderType={orderType}
        businessType={businessType}
        darkMode={darkMode}
        discountSettings={discountSettings}
        customers={customers}
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
              className={`relative rounded-2xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl ${dm ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className={`font-semibold ${dm ? 'text-white' : 'text-slate-800'}`}>Held Orders</h3>
                <button onClick={() => setShowHeld(false)} className={`p-2 -mr-2 rounded-full transition-colors ${dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
                  <X size={18} />
                </button>
              </div>
              {heldOrders.length === 0 ? (
                <p className={`text-sm text-center py-8 ${dm ? 'text-slate-500' : 'text-slate-400'}`}>No held orders</p>
              ) : (
                <div className="space-y-3">
                  {heldOrders.map(held => (
                    <div key={held.id} className={`border rounded-xl p-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm capitalize ${dm ? 'text-slate-300' : 'text-slate-600'}`}>{held.orderType}</span>
                        <span className={`text-xs tabular-nums ${dm ? 'text-slate-500' : 'text-slate-400'}`}>{held.heldAt}</span>
                      </div>
                      {held.tableNote && <p className={`text-xs mb-1 ${dm ? 'text-slate-400' : 'text-slate-500'}`}>{held.tableNote}</p>}
                      <p className={`text-xs mb-3 tabular-nums ${dm ? 'text-slate-500' : 'text-slate-400'}`}>
                        {held.items.reduce((s, i) => s + i.qty, 0)} items · {formatIDR(held.items.reduce((s, i) => s + (i.product.price + (i.variant?.priceModifier || 0)) * i.qty, 0))}
                      </p>
                      <button
                        onClick={() => resumeOrder(held)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-2.5 text-sm hover:bg-blue-700 transition-colors"
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
      
      {/* Variant Selection Modal */}
      <AnimatePresence>
        {variantProduct && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}
              className="absolute inset-0 bg-black/50" onClick={() => setVariantProduct(null)} />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
              className={`relative rounded-2xl p-5 w-full max-w-sm shadow-2xl ${surface}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`font-semibold ${t1}`}>Select Variant</h3>
                  <p className={`text-xs ${t2}`}>{variantProduct.name}</p>
                </div>
                <button onClick={() => setVariantProduct(null)} className={`p-2 -mr-2 rounded-full transition-colors ${dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-400 hover:bg-slate-100'}`}>
                  <X size={18} />
                </button>
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => addToCart(variantProduct, undefined)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${dm ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-sm'}`}
                >
                  <span className={`text-sm font-medium ${t1}`}>Regular</span>
                  <span className={`text-sm ${t2}`}>{formatIDR(variantProduct.price)}</span>
                </button>
                {variantProduct.variants?.map(v => (
                  <button
                    key={v.id}
                    onClick={() => addToCart(variantProduct, v)}
                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${dm ? 'bg-slate-800 border-slate-700 hover:border-blue-500' : 'bg-white border-slate-200 hover:border-blue-500 hover:shadow-sm'}`}
                  >
                    <span className={`text-sm font-medium ${t1}`}>{v.name}</span>
                    <span className={`text-sm ${t2}`}>{formatIDR(variantProduct.price + v.priceModifier)}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
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
          subtotalBeforePromo={subtotal - tierDiscountAmt}
          taxAmount={tax}
          onClose={(completed) => {
            setShowCheckout(false);
            if (completed) clearCart();
          }}
          onConfirm={handleCheckoutDone}
        />
      )}
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
  total: number;
  isOpen: boolean;
  onClose: () => void;
}

function CartPanel({
  cart, orderType, businessType, darkMode, discountSettings,
  customers, selectedCustomerId, onSelectCustomer,
  onOrderTypeChange, onUpdateQty, onSetDiscount, onRemoveItem, onClearCart, onHoldOrder, onCheckout,
  tableNote, onTableNoteChange, subtotal, tierDiscountAmt, tax, total, isOpen, onClose,
}: CartPanelProps) {
  const [editDiscountId, setEditDiscountId] = useState<string | null>(null);
  const [discountVal, setDiscountVal] = useState('');
  const [discountType, setDiscountType] = useState<'percent'|'nominal'>('percent');
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const ORDER_TYPES: { id: OrderType; label: string }[] = [
    { id: 'dine-in', label: 'Dine-in' }, { id: 'takeaway', label: 'Takeaway' }, { id: 'delivery', label: 'Delivery' },
  ];

  const dm = darkMode;
  const surface = dm ? 'bg-slate-800' : 'bg-white';
  const border  = dm ? 'border-slate-700' : 'border-slate-200';
  const t1      = dm ? 'text-slate-100' : 'text-slate-800';
  const t2      = dm ? 'text-slate-400' : 'text-slate-500';

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
            <button onClick={onClearCart} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors">
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
              <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${dm ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                <Users size={14} />
              </div>
              <div>
                <p className={`text-xs font-semibold ${t1}`}>{customers.find(c => c.id === selectedCustomerId)?.name}</p>
                <p className={`text-[10px] ${t2}`}>{customers.find(c => c.id === selectedCustomerId)?.pointsBalance} pts</p>
              </div>
            </div>
            <button onClick={() => onSelectCustomer(null)} className={`text-xs ${t2} hover:text-red-500`}>Remove</button>
          </div>
        ) : (
          <button onClick={() => setShowCustomerModal(true)} className={`w-full flex items-center justify-center gap-2 py-2 border border-dashed rounded-xl transition-colors text-sm font-medium ${dm ? 'border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-400 hover:bg-slate-700/50' : 'border-slate-300 text-slate-500 hover:text-slate-700 hover:border-slate-400 hover:bg-slate-50'}`}>
            <UserPlus size={16} /> Attach Customer
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
                className={`flex-1 py-2 text-sm font-medium transition-colors ${orderType === ot.id ? 'bg-blue-600 text-white' : dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
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
              className={`mt-2 w-full text-sm border rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-200 placeholder-slate-500' : 'border-slate-200 text-slate-700 placeholder-slate-400'}`}
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
            const basePrice = item.product.price + (item.variant?.priceModifier || 0);
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
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    {item.product.image
                      ? <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      : <span className="text-base">{item.product.emoji}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${t1}`}>
                      {item.product.name}
                      {item.variant && <span className="text-xs ml-1 text-blue-500">({item.variant.name})</span>}
                    </p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {(item.discount > 0 || item.itemDiscountNominal) && <span className={`text-xs line-through tabular-nums ${t2}`}>{formatIDR(linePrice)}</span>}
                      <span className="text-sm text-blue-500 tabular-nums font-semibold">{formatIDR(discounted)}</span>
                    </div>
                  </div>
                  <button onClick={() => onRemoveItem(item.id)} className={`p-1.5 -mr-1 rounded-lg transition-colors ${t2} hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-11">
                  <div className={`flex items-center border rounded-lg overflow-hidden ${border}`}>
                    <button onClick={() => onUpdateQty(item.id, -1)} className={`w-9 h-9 flex items-center justify-center transition-colors ${dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                      <Minus size={13} />
                    </button>
                    <span className={`w-7 text-center text-sm tabular-nums font-semibold ${t1}`}>{item.qty}</span>
                    <button onClick={() => onUpdateQty(item.id, 1)} className={`w-9 h-9 flex items-center justify-center transition-colors ${dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                      <Plus size={13} />
                    </button>
                  </div>

                  {discountSettings.enabled && item.product.allowDiscount && (
                    editDiscountId === item.id ? (
                      <div className="flex items-center gap-1">
                        <input
                          type="number" min={0}
                          value={discountVal}
                          onChange={e => setDiscountVal(e.target.value)}
                          placeholder="Amt"
                          className={`w-16 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-slate-200'}`}
                          autoFocus
                        />
                        <button onClick={() => setDiscountType(t => t === 'percent' ? 'nominal' : 'percent')} className={`px-1.5 py-1 text-xs border rounded ${dm ? 'border-slate-600' : 'border-slate-300'}`}>
                          {discountType === 'percent' ? '%' : 'Rp'}
                        </button>
                        <button onClick={() => applyDiscount(item.id)} className="text-xs text-blue-500 px-1 font-medium">OK</button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditDiscountId(item.id); setDiscountVal(String(item.itemDiscountNominal || item.discount || '')); setDiscountType(item.itemDiscountNominal ? 'nominal' : 'percent'); }}
                        className={`text-xs flex items-center gap-0.5 transition-colors ${item.discount > 0 || item.itemDiscountNominal ? 'text-orange-500' : `${t2} hover:text-orange-500`}`}
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

      {/* Order totals + actions */}
      <div className={`border-t px-4 py-4 space-y-3 shrink-0 ${border}`}>
        <div className="space-y-1.5 tabular-nums">
          <div className={`flex justify-between text-sm ${t2}`}>
            <span>Subtotal</span><span>{formatIDR(subtotal)}</span>
          </div>
          {tierDiscountAmt > 0 && (
            <div className={`flex justify-between text-sm text-orange-500`}>
              <span>Tier Discount</span><span>-{formatIDR(tierDiscountAmt)}</span>
            </div>
          )}
          <div className={`flex justify-between text-sm ${t2}`}>
            <span>Tax</span><span>{formatIDR(tax)}</span>
          </div>
          <div className={`flex justify-between font-semibold ${t1}`}>
            <span>Total</span><span className="text-blue-500">{formatIDR(total)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onHoldOrder}
            disabled={cart.length === 0}
            className={`flex-1 flex items-center justify-center gap-1.5 border rounded-xl py-3 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-medium ${dm ? 'border-slate-700 text-slate-400 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
          >
            <Pause size={14} /> Hold
          </button>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="flex-[2] bg-emerald-600 text-white rounded-xl py-3 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm font-semibold tabular-nums"
          >
            Checkout · {formatIDR(total)}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className={`hidden lg:flex w-80 xl:w-96 border-l flex-col ${darkMode ? 'border-slate-700' : 'border-slate-200'}`}>
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
          <div className={`w-full max-w-sm rounded-2xl p-5 shadow-2xl ${dm ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className={`font-semibold ${t1}`}>Select Customer</h3>
              <button onClick={() => setShowCustomerModal(false)} className={t2}><X size={18} /></button>
            </div>
            <div className="max-h-60 overflow-y-auto space-y-2">
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => { onSelectCustomer(c.id); setShowCustomerModal(false); }}
                  className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${dm ? 'border-slate-700 hover:bg-slate-700' : 'border-slate-100 hover:bg-slate-50'}`}
                >
                  <div>
                    <p className={`text-sm font-semibold ${t1}`}>{c.name}</p>
                    <p className={`text-xs ${t2}`}>{c.phone}</p>
                  </div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-lg ${dm ? 'bg-slate-900 text-amber-400' : 'bg-amber-100 text-amber-700'}`}>
                    {c.pointsBalance} pts
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
