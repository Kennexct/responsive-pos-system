import { useState, useMemo } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Pause, ChevronDown,
  AlertTriangle, PlayCircle, X, Package,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { BusinessType, CartItem, HeldOrder, OrderType, PaymentMethod, Product, User } from './mockData';
import { CATEGORIES, formatIDR, TAX_RATE } from './mockData';
import { CheckoutModal } from './CheckoutModal';

interface POSViewProps {
  businessType: BusinessType;
  products: Product[];
  currentUser: User;
  bizName: string;
  darkMode: boolean;
  onOrderComplete: (cart: CartItem[], orderType: OrderType, paymentMethod: PaymentMethod, amountPaid: number) => void;
}

const ORDER_TYPES: { id: OrderType; label: string }[] = [
  { id: 'dine-in',  label: 'Dine-in'  },
  { id: 'takeaway', label: 'Takeaway' },
  { id: 'delivery', label: 'Delivery' },
];

export function POSView({ businessType, products, currentUser, bizName, darkMode, onOrderComplete }: POSViewProps) {
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

  const filtered = useMemo(() => {
    let list = products;
    if (category !== 'All') list = list.filter(p => p.category === category);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [products, category, search]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i);
      return [...prev, { product, qty: 1, discount: 0 }];
    });
    setPopId(product.id);
    setTimeout(() => setPopId(null), 250);
  };

  const updateQty = (id: string, delta: number) =>
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0));

  const setDiscount = (id: string, pct: number) =>
    setCart(prev => prev.map(i => i.product.id === id ? { ...i, discount: Math.max(0, Math.min(100, pct)) } : i));

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const clearCart  = () => setCart([]);

  const subtotal  = cart.reduce((sum, item) => { const l = item.product.price * item.qty; return sum + l - l * (item.discount / 100); }, 0);
  const tax       = Math.round(subtotal * TAX_RATE);
  const total     = subtotal + tax;
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

  const handleCheckoutDone = (method: PaymentMethod, amountPaid: number) => {
    onOrderComplete(cart, orderType, method, amountPaid);
    clearCart();
    setShowCheckout(false);
    setTableNote('');
  };

  const dm = darkMode;
  const bg      = dm ? 'bg-slate-900' : 'bg-slate-100';
  const toolbar  = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200';
  const inputCls = dm ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-400' : 'bg-slate-50 border-slate-200 text-slate-700 focus:border-blue-400';
  const catActive = dm ? 'bg-blue-600 text-white' : 'bg-blue-600 text-white';
  const catInact  = dm ? 'bg-slate-700 text-slate-300 hover:bg-slate-600' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200';

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
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${category === cat ? catActive : catInact}`}
              >
                {cat}
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
                const inCart     = cart.find(i => i.product.id === product.id);
                const lowStock   = product.stock <= product.lowStockThreshold && product.stock > 0;
                const outOfStock = product.stock === 0;
                const isPopping  = popId === product.id;

                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
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
                        {inCart.qty}
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
                    <p className={`text-xs mt-0.5 ${lowStock ? 'text-amber-500 font-medium' : dm ? 'text-slate-500' : 'text-slate-400'}`}>
                      Stock: {product.stock}
                    </p>
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
                        {held.items.reduce((s, i) => s + i.qty, 0)} items · {formatIDR(held.items.reduce((s, i) => s + i.product.price * i.qty, 0))}
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

      {showCheckout && cart.length > 0 && (
        <CheckoutModal
          cart={cart}
          orderType={orderType}
          cashierName={currentUser.name}
          bizName={bizName}
          darkMode={darkMode}
          onClose={() => setShowCheckout(false)}
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
  onOrderTypeChange: (t: OrderType) => void;
  onUpdateQty: (id: string, delta: number) => void;
  onSetDiscount: (id: string, pct: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  onHoldOrder: () => void;
  onCheckout: () => void;
  tableNote: string;
  onTableNoteChange: (v: string) => void;
  subtotal: number;
  tax: number;
  total: number;
  isOpen: boolean;
  onClose: () => void;
}

function CartPanel({
  cart, orderType, businessType, darkMode,
  onOrderTypeChange, onUpdateQty, onSetDiscount, onRemoveItem, onClearCart, onHoldOrder, onCheckout,
  tableNote, onTableNoteChange, subtotal, tax, total, isOpen, onClose,
}: CartPanelProps) {
  const [editDiscountId, setEditDiscountId] = useState<string | null>(null);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const ORDER_TYPES: { id: OrderType; label: string }[] = [
    { id: 'dine-in', label: 'Dine-in' }, { id: 'takeaway', label: 'Takeaway' }, { id: 'delivery', label: 'Delivery' },
  ];

  const dm = darkMode;
  const surface = dm ? 'bg-slate-800' : 'bg-white';
  const border  = dm ? 'border-slate-700' : 'border-slate-200';
  const t1      = dm ? 'text-slate-100' : 'text-slate-800';
  const t2      = dm ? 'text-slate-400' : 'text-slate-500';

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
            const linePrice = item.product.price * item.qty;
            const discounted = linePrice - linePrice * (item.discount / 100);
            return (
              <div key={item.product.id} className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  {/* Thumbnail */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
                    {item.product.image
                      ? <img src={item.product.image} alt={item.product.name} className="w-full h-full object-cover" />
                      : <span className="text-base">{item.product.emoji}</span>
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium leading-tight ${t1}`}>{item.product.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {item.discount > 0 && <span className={`text-xs line-through tabular-nums ${t2}`}>{formatIDR(linePrice)}</span>}
                      <span className="text-sm text-blue-500 tabular-nums font-semibold">{formatIDR(discounted)}</span>
                    </div>
                  </div>
                  <button onClick={() => onRemoveItem(item.product.id)} className={`p-1.5 -mr-1 rounded-lg transition-colors ${t2} hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20`}>
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-11">
                  <div className={`flex items-center border rounded-lg overflow-hidden ${border}`}>
                    <button onClick={() => onUpdateQty(item.product.id, -1)} className={`w-9 h-9 flex items-center justify-center transition-colors ${dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                      <Minus size={13} />
                    </button>
                    <span className={`w-7 text-center text-sm tabular-nums font-semibold ${t1}`}>{item.qty}</span>
                    <button onClick={() => onUpdateQty(item.product.id, 1)} className={`w-9 h-9 flex items-center justify-center transition-colors ${dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-100'}`}>
                      <Plus size={13} />
                    </button>
                  </div>

                  {editDiscountId === item.product.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={100}
                        value={item.discount}
                        onChange={e => onSetDiscount(item.product.id, Number(e.target.value))}
                        className={`w-14 border rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-blue-400 ${dm ? 'bg-slate-700 border-slate-600 text-slate-200' : 'border-slate-200'}`}
                        autoFocus
                      />
                      <span className={`text-xs ${t2}`}>%</span>
                      <button onClick={() => setEditDiscountId(null)} className="text-xs text-blue-500 px-1 font-medium">OK</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditDiscountId(item.product.id)}
                      className={`text-xs flex items-center gap-0.5 transition-colors ${item.discount > 0 ? 'text-orange-500' : `${t2} hover:text-orange-500`}`}
                    >
                      <ChevronDown size={11} />
                      {item.discount > 0 ? `${item.discount}% off` : 'Discount'}
                    </button>
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
          <div className={`flex justify-between text-sm ${t2}`}>
            <span>Tax (PPN 11%)</span><span>{formatIDR(tax)}</span>
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
    </>
  );
}
