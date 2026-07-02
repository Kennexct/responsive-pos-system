import { useState, useMemo } from 'react';
import {
  Search, Plus, Minus, Trash2, ShoppingCart, Pause, ChevronDown,
  AlertTriangle, PlayCircle, X, Package
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { BusinessType, CartItem, HeldOrder, OrderType, PaymentMethod, Product } from './mockData';
import { CATEGORIES, formatIDR, TAX_RATE } from './mockData';
import { CheckoutModal } from './CheckoutModal';

interface POSViewProps {
  businessType: BusinessType;
  products: Product[];
  onOrderComplete: (cart: CartItem[], orderType: OrderType, paymentMethod: PaymentMethod, amountPaid: number) => void;
}

const ORDER_TYPES: { id: OrderType; label: string }[] = [
  { id: 'dine-in',  label: 'Dine-in'  },
  { id: 'takeaway', label: 'Takeaway' },
  { id: 'delivery', label: 'Delivery' },
];

export function POSView({ businessType, products, onOrderComplete }: POSViewProps) {
  const [category, setCategory]       = useState('All');
  const [search, setSearch]           = useState('');
  const [cart, setCart]               = useState<CartItem[]>([]);
  const [orderType, setOrderType]     = useState<OrderType>('dine-in');
  const [showCheckout, setShowCheckout] = useState(false);
  const [heldOrders, setHeldOrders]   = useState<HeldOrder[]>([]);
  const [cartOpen, setCartOpen]       = useState(false);
  const [showHeld, setShowHeld]       = useState(false);
  const [tableNote, setTableNote]     = useState('');

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
      if (existing) {
        return prev.map(i =>
          i.product.id === product.id ? { ...i, qty: i.qty + 1 } : i
        );
      }
      return [...prev, { product, qty: 1, discount: 0 }];
    });
  };

  const updateQty = (id: string, delta: number) => {
    setCart(prev =>
      prev.map(i => i.product.id === id ? { ...i, qty: i.qty + delta } : i).filter(i => i.qty > 0)
    );
  };

  const setDiscount = (id: string, pct: number) => {
    setCart(prev =>
      prev.map(i => i.product.id === id ? { ...i, discount: Math.max(0, Math.min(100, pct)) } : i)
    );
  };

  const removeItem = (id: string) => setCart(prev => prev.filter(i => i.product.id !== id));
  const clearCart  = () => setCart([]);

  const subtotal = cart.reduce((sum, item) => {
    const line = item.product.price * item.qty;
    return sum + line - line * (item.discount / 100);
  }, 0);
  const tax      = Math.round(subtotal * TAX_RATE);
  const total    = subtotal + tax;
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const holdOrder = () => {
    if (cart.length === 0) return;
    setHeldOrders(prev => [
      ...prev,
      { id: Date.now().toString(), items: [...cart], orderType, heldAt: new Date().toLocaleTimeString(), tableNote },
    ]);
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

  return (
    <div className="flex h-full w-full overflow-hidden bg-slate-100">
      {/* Left: product area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-slate-200 px-4 py-3 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search product or scan barcode…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm text-slate-700 bg-slate-50 focus:outline-none focus:border-blue-400"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <X size={14} />
                </button>
              )}
            </div>

            {businessType === 'fnb' && (
              <div className="hidden sm:flex border border-slate-200 rounded-xl overflow-hidden">
                {ORDER_TYPES.map(ot => (
                  <button
                    key={ot.id}
                    onClick={() => setOrderType(ot.id)}
                    className={[
                      'px-3 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                      orderType === ot.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50',
                    ].join(' ')}
                  >
                    {ot.label}
                  </button>
                ))}
              </div>
            )}

            {heldOrders.length > 0 && (
              <button
                onClick={() => setShowHeld(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm hover:bg-amber-100 transition-colors focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:outline-none"
              >
                <Pause size={14} />
                <span>{heldOrders.length} Held</span>
              </button>
            )}

            <button
              onClick={() => setCartOpen(true)}
              className="lg:hidden relative flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-xl text-sm focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-offset-2"
            >
              <ShoppingCart size={16} />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          {/* Category tabs */}
          <div className="flex gap-2 overflow-x-auto pb-0.5">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={[
                  'shrink-0 px-4 py-1.5 rounded-full text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                  category === cat ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
                ].join(' ')}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product grid */}
        <div className="flex-1 overflow-y-auto p-4">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-slate-400 gap-2">
              <Search size={32} />
              <p className="text-sm">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {filtered.map(product => {
                const inCart  = cart.find(i => i.product.id === product.id);
                const lowStock = product.stock <= product.lowStockThreshold;
                const outOfStock = product.stock === 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => !outOfStock && addToCart(product)}
                    disabled={outOfStock}
                    className={[
                      'relative bg-white rounded-2xl p-3 text-left shadow-sm border-2 transition-all focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none',
                      outOfStock
                        ? 'border-transparent opacity-40 cursor-not-allowed'
                        : inCart
                          ? 'border-blue-400 shadow-blue-100 active:scale-95'
                          : 'border-transparent hover:border-slate-200 hover:shadow-md active:scale-95',
                    ].join(' ')}
                  >
                    {lowStock && !outOfStock && (
                      <span className="absolute top-2 right-2">
                        <AlertTriangle size={12} className="text-amber-500" />
                      </span>
                    )}
                    {outOfStock && (
                      <span className="absolute top-2 right-2 text-xs text-red-500 bg-red-50 px-1 rounded">Out</span>
                    )}
                    {inCart && (
                      <span className="absolute top-2 left-2 w-5 h-5 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center">
                        {inCart.qty}
                      </span>
                    )}
                    <div className="w-12 h-12 rounded-full bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-2 mt-1">
                      <Package size={24} />
                    </div>
                    <p className="text-slate-800 text-sm leading-tight mb-1">{product.name}</p>
                    <p className="text-blue-600 text-sm tabular-nums">{formatIDR(product.price)}</p>
                    <p className={`text-xs mt-0.5 ${lowStock ? 'text-amber-500' : 'text-slate-400'}`}>
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
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40"
              onClick={() => setShowHeld(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative bg-white rounded-2xl p-5 w-full max-w-sm max-h-[80vh] overflow-y-auto shadow-2xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-slate-800">Held Orders</h3>
                <button
                  onClick={() => setShowHeld(false)}
                  className="p-2 -mr-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none"
                >
                  <X size={18} />
                </button>
              </div>
              {heldOrders.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No held orders</p>
              ) : (
                <div className="space-y-3">
                  {heldOrders.map(held => (
                    <div key={held.id} className="border border-slate-200 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-slate-600 capitalize">{held.orderType}</span>
                        <span className="text-xs text-slate-400 tabular-nums">{held.heldAt}</span>
                      </div>
                      {held.tableNote && <p className="text-xs text-slate-500 mb-1">{held.tableNote}</p>}
                      <p className="text-xs text-slate-500 mb-3 tabular-nums">
                        {held.items.reduce((s, i) => s + i.qty, 0)} items ·{' '}
                        {formatIDR(held.items.reduce((s, i) => s + i.product.price * i.qty, 0))}
                      </p>
                      <button
                        onClick={() => resumeOrder(held)}
                        className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg py-3 text-sm hover:bg-blue-700 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-offset-2"
                      >
                        <PlayCircle size={15} />
                        Resume
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
          onClose={() => setShowCheckout(false)}
          onConfirm={handleCheckoutDone}
        />
      )}
    </div>
  );
}

// ─── Cart Panel ───────────────────────────────────────────────────────────────

interface CartPanelProps {
  cart: CartItem[];
  orderType: OrderType;
  businessType: BusinessType;
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
  cart, orderType, businessType, onOrderTypeChange,
  onUpdateQty, onSetDiscount, onRemoveItem, onClearCart, onHoldOrder, onCheckout,
  tableNote, onTableNoteChange,
  subtotal, tax, total, isOpen, onClose,
}: CartPanelProps) {
  const [editDiscountId, setEditDiscountId] = useState<string | null>(null);
  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const ORDER_TYPES: { id: OrderType; label: string }[] = [
    { id: 'dine-in',  label: 'Dine-in'  },
    { id: 'takeaway', label: 'Takeaway' },
    { id: 'delivery', label: 'Delivery' },
  ];

  const panel = (
    <div className="flex flex-col h-full bg-white">
      <div className="flex items-center justify-between px-4 h-14 border-b border-slate-200 shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart size={18} className="text-slate-600" />
          <span className="text-slate-800 text-sm" style={{ fontWeight: 600 }}>
            Order {itemCount > 0 ? `(${itemCount})` : ''}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {cart.length > 0 && (
            <button onClick={onClearCart} className="text-xs text-red-500 hover:text-red-700 px-2 py-1 rounded hover:bg-red-50 transition-colors">
              Clear
            </button>
          )}
          <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
      </div>

      {businessType === 'fnb' && (
        <div className="px-4 py-3 border-b border-slate-100 shrink-0">
          <div className="flex border border-slate-200 rounded-xl overflow-hidden">
            {ORDER_TYPES.map(ot => (
              <button
                key={ot.id}
                onClick={() => onOrderTypeChange(ot.id)}
                className={[
                  'flex-1 py-2 text-sm transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset',
                  orderType === ot.id ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                {ot.label}
              </button>
            ))}
          </div>
          {orderType === 'dine-in' && (
            <input
              type="text"
              placeholder="Table note (e.g. Table 5, window seat)…"
              value={tableNote}
              onChange={e => onTableNoteChange(e.target.value)}
              className="mt-2 w-full text-sm border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:border-blue-400 text-slate-700 placeholder-slate-400"
            />
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-3 py-12">
            <ShoppingCart size={40} />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs text-center">Tap a product to add it to the order</p>
          </div>
        ) : (
          cart.map(item => {
            const linePrice = item.product.price * item.qty;
            const discounted = linePrice - linePrice * (item.discount / 100);
            return (
              <div key={item.product.id} className="flex flex-col gap-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-lg shrink-0">{item.product.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-800 leading-tight">{item.product.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {item.discount > 0 && (
                        <span className="text-xs line-through text-slate-400 tabular-nums">{formatIDR(linePrice)}</span>
                      )}
                      <span className="text-sm text-blue-600 tabular-nums">{formatIDR(discounted)}</span>
                    </div>
                  </div>
                  <button onClick={() => onRemoveItem(item.product.id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors p-2 -mr-2 rounded-lg focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:outline-none">
                    <Trash2 size={16} />
                  </button>
                </div>
                <div className="flex items-center gap-2 pl-7">
                  <div className="flex items-center gap-1 border border-slate-200 rounded-lg overflow-hidden">
                    <button onClick={() => onUpdateQty(item.product.id, -1)} className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset">
                      <Minus size={14} />
                    </button>
                    <span className="w-8 text-center text-sm text-slate-700 tabular-nums">{item.qty}</span>
                    <button onClick={() => onUpdateQty(item.product.id, 1)} className="w-11 h-11 flex items-center justify-center text-slate-500 hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:outline-none focus-visible:ring-inset">
                      <Plus size={14} />
                    </button>
                  </div>

                  {editDiscountId === item.product.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="number" min={0} max={100}
                        value={item.discount}
                        onChange={e => onSetDiscount(item.product.id, Number(e.target.value))}
                        className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-xs text-center focus:outline-none focus:border-blue-400"
                        autoFocus
                      />
                      <span className="text-xs text-slate-400">%</span>
                      <button onClick={() => setEditDiscountId(null)} className="text-xs text-blue-600 px-1">OK</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setEditDiscountId(item.product.id)}
                      className="text-xs text-slate-400 hover:text-orange-500 transition-colors flex items-center gap-0.5"
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

      <div className="border-t border-slate-200 px-4 py-4 space-y-3 shrink-0">
        <div className="space-y-1.5 tabular-nums">
          <div className="flex justify-between text-sm text-slate-500">
            <span>Subtotal</span><span>{formatIDR(subtotal)}</span>
          </div>
          <div className="flex justify-between text-sm text-slate-500">
            <span>Tax (PPN 11%)</span><span>{formatIDR(tax)}</span>
          </div>
          <div className="flex justify-between text-slate-800" style={{ fontWeight: 600 }}>
            <span>Total</span><span className="text-blue-600">{formatIDR(total)}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={onHoldOrder}
            disabled={cart.length === 0}
            className="flex-1 flex items-center justify-center gap-1.5 border border-slate-200 rounded-xl py-3 text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:outline-none"
          >
            <Pause size={15} />
            Hold
          </button>
          <button
            onClick={onCheckout}
            disabled={cart.length === 0}
            className="flex-[2] bg-emerald-600 text-white rounded-xl py-3 hover:bg-emerald-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:outline-none focus-visible:ring-offset-2 tabular-nums"
            style={{ fontWeight: 600 }}
          >
            Checkout · {formatIDR(total)}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="hidden lg:flex w-80 xl:w-96 border-l border-slate-200 flex-col">
        {panel}
      </div>
      <AnimatePresence>
        {isOpen && (
          <div className="lg:hidden fixed inset-0 z-40 flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 bg-black/40"
              onClick={onClose}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", bounce: 0, duration: 0.3 }}
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
