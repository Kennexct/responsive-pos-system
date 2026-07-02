import { useState } from 'react';
import { Search, Plus, AlertTriangle, TrendingDown, TrendingUp, X, Trash2 } from 'lucide-react';
import { CATEGORIES, formatIDR } from './mockData';
import type { Product } from './mockData';
import { ConfirmationModal } from './ConfirmationModal';

const STOCK_LOG_INITIAL = [
  { id: '1', product: 'Americano',    type: 'in',  qty: 50, note: 'Restocked beans',   date: '2026-07-01 08:00' },
  { id: '2', product: 'Matcha Latte', type: 'out', qty: 5,  note: 'Morning sales',      date: '2026-07-01 10:30' },
  { id: '3', product: 'Cheesecake',   type: 'in',  qty: 10, note: 'New delivery',       date: '2026-06-30 15:00' },
  { id: '4', product: 'Cold Brew',    type: 'out', qty: 12, note: 'Yesterday sales',    date: '2026-06-30 20:00' },
  { id: '5', product: 'Croissant',    type: 'in',  qty: 20, note: 'Morning batch',      date: '2026-06-30 07:00' },
];

const PRODUCT_EMOJIS = ['☕','🥛','🍵','🧊','🫖','🍳','🍜','🥪','🥑','🍌','🥟','🥐','🍫','🍰','🍮','🍊','🍓','💧','💦','🥤','🍋','🥗'];

interface Props {
  products: Product[];
  onProductsChange: (p: Product[]) => void;
}

type StockTab = 'all' | 'low';

interface StockLogEntry {
  id: string;
  product: string;
  type: 'in' | 'out';
  qty: number;
  note: string;
  date: string;
}

export function InventoryView({ products, onProductsChange }: Props) {
  const [search, setSearch]       = useState('');
  const [tab, setTab]             = useState<StockTab>('all');
  const [stockLog, setStockLog]   = useState<StockLogEntry[]>(STOCK_LOG_INITIAL);

  // Adjust stock modal
  const [adjModal, setAdjModal]   = useState(false);
  const [selected, setSelected]   = useState<Product | null>(null);
  const [adjQty, setAdjQty]       = useState('');
  const [adjType, setAdjType]     = useState<'in' | 'out'>('in');
  const [adjNote, setAdjNote]     = useState('');

  // Product modal (Add/Edit)
  const [productModal, setProductModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newName, setNewName]     = useState('');
  const [newPrice, setNewPrice]   = useState('');
  const [newCostPrice, setNewCostPrice] = useState('');
  const [newCat, setNewCat]       = useState('Coffee');
  const [newStock, setNewStock]   = useState('');
  const [newThreshold, setNewThreshold] = useState('10');
  const [newEmoji, setNewEmoji]   = useState('☕');

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const lowStockItems = products.filter(p => p.stock <= p.lowStockThreshold);

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchTab    = tab === 'all' || p.stock <= p.lowStockThreshold;
    return matchSearch && matchTab;
  });

  const openAdjust = (p: Product) => {
    setSelected(p);
    setAdjQty('');
    setAdjNote('');
    setAdjType('in');
    setAdjModal(true);
  };

  const saveAdjustment = () => {
    if (!selected || !adjQty || Number(adjQty) <= 0) return;
    const qty = Number(adjQty);
    onProductsChange(
      products.map(p =>
        p.id === selected.id
          ? { ...p, stock: adjType === 'in' ? p.stock + qty : Math.max(0, p.stock - qty) }
          : p
      )
    );
    setStockLog(prev => [
      {
        id: Date.now().toString(),
        product: selected.name,
        type: adjType,
        qty,
        note: adjNote || (adjType === 'in' ? 'Manual stock-in' : 'Manual stock-out'),
        date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
      },
      ...prev,
    ]);
    setAdjModal(false);
  };

  const openAddProduct = () => {
    setEditingId(null);
    setNewName(''); setNewPrice(''); setNewCostPrice(''); setNewStock(''); setNewThreshold('10'); setNewEmoji('☕');
    setProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingId(p.id);
    setNewName(p.name);
    setNewPrice(String(p.price));
    setNewCostPrice(String(p.costPrice));
    setNewCat(p.category);
    setNewStock(String(p.stock));
    setNewThreshold(String(p.lowStockThreshold));
    setNewEmoji(p.emoji);
    setProductModal(true);
  };

  const saveProduct = () => {
    if (!newName.trim() || !newPrice || !newCostPrice || (!editingId && !newStock)) return;
    
    if (editingId) {
      onProductsChange(
        products.map(p => p.id === editingId ? {
          ...p,
          name: newName.trim(),
          price: Number(newPrice),
          costPrice: Number(newCostPrice),
          category: newCat,
          lowStockThreshold: Number(newThreshold) || 10,
          emoji: newEmoji,
        } : p)
      );
    } else {
      const product: Product = {
        id:                Date.now().toString(),
        name:              newName.trim(),
        price:             Number(newPrice),
        costPrice:         Number(newCostPrice),
        category:          newCat,
        stock:             Number(newStock),
        emoji:             newEmoji,
        lowStockThreshold: Number(newThreshold) || 10,
      };
      onProductsChange([...products, product]);
      setStockLog(prev => [
        {
          id: Date.now().toString(),
          product: product.name,
          type: 'in',
          qty: product.stock,
          note: 'Initial stock',
          date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        },
        ...prev,
      ]);
    }
    setProductModal(false);
  };

  const deleteProduct = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleConfirmDelete = () => {
    if (confirmDeleteId) {
      onProductsChange(products.filter(p => p.id !== confirmDeleteId));
      setConfirmDeleteId(null);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-50">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-slate-800">Inventory</h1>
            <p className="text-slate-500 text-sm mt-0.5">{products.length} products · {lowStockItems.length} low stock</p>
          </div>
          <button
            onClick={openAddProduct}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {lowStockItems.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center gap-3">
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700">
              <span style={{ fontWeight: 600 }}>{lowStockItems.length} items</span> are running low and need restocking.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search products…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:border-blue-400 text-slate-700"
            />
          </div>
          <div className="flex border border-slate-200 rounded-xl overflow-hidden bg-white">
            {(['all', 'low'] as StockTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={[
                  'px-4 py-2.5 text-sm transition-colors',
                  tab === t ? 'bg-blue-600 text-white' : 'text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                {t === 'low' ? 'Low Stock' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Product table */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left border-b border-slate-100">
                  <th className="px-5 py-3 text-slate-500 text-xs" style={{ fontWeight: 500 }}>Product</th>
                  <th className="px-5 py-3 text-slate-500 text-xs hidden sm:table-cell" style={{ fontWeight: 500 }}>Category</th>
                  <th className="px-5 py-3 text-slate-500 text-xs" style={{ fontWeight: 500 }}>Price</th>
                  <th className="px-5 py-3 text-slate-500 text-xs" style={{ fontWeight: 500 }}>Stock</th>
                  <th className="px-5 py-3 text-slate-500 text-xs" style={{ fontWeight: 500 }}>Status</th>
                  <th className="px-5 py-3 text-slate-500 text-xs" style={{ fontWeight: 500 }}>Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filtered.map(product => {
                  const isLow = product.stock <= product.lowStockThreshold;
                  const stockPct = Math.min(100, (product.stock / (product.lowStockThreshold * 3)) * 100);
                  const marginPct = product.price > 0 ? Math.round(((product.price - product.costPrice) / product.price) * 100) : 0;
                  
                  return (
                    <tr key={product.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{product.emoji}</span>
                          <span className="text-slate-700">{product.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-slate-500 hidden sm:table-cell">{product.category}</td>
                      <td className="px-5 py-3 text-slate-700">
                        {formatIDR(product.price)}
                        <span className="ml-2 text-xs text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">{marginPct}%</span>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${isLow ? 'bg-red-400' : 'bg-emerald-400'}`}
                              style={{ width: `${stockPct}%` }}
                            />
                          </div>
                          <span className={`text-sm ${isLow ? 'text-red-600' : 'text-slate-700'}`} style={isLow ? { fontWeight: 600 } : undefined}>
                            {product.stock}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-600 text-xs">
                            <AlertTriangle size={10} />Low
                          </span>
                        ) : (
                          <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-xs">OK</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => openAdjust(product)}
                            className="text-xs text-blue-600 hover:text-blue-800 px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-colors"
                          >
                            Adjust
                          </button>
                          <button
                            onClick={() => openEditProduct(product)}
                            className="text-xs text-emerald-600 hover:text-emerald-800 px-3 py-1.5 border border-emerald-200 rounded-lg hover:bg-emerald-50 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-slate-300 hover:text-red-400 transition-colors p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-sm">
                      No products found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock movement log */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-100">
            <h3 className="text-slate-700">Stock Movement Log</h3>
          </div>
          <div className="divide-y divide-slate-50 max-h-64 overflow-y-auto">
            {stockLog.map(log => (
              <div key={log.id} className="flex items-center gap-3 px-5 py-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.type === 'in' ? 'bg-emerald-50' : 'bg-red-50'}`}>
                  {log.type === 'in'
                    ? <TrendingUp size={14} className="text-emerald-600" />
                    : <TrendingDown size={14} className="text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{log.product}</p>
                  <p className="text-xs text-slate-400">{log.note}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm ${log.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`} style={{ fontWeight: 500 }}>
                    {log.type === 'in' ? '+' : '-'}{log.qty}
                  </p>
                  <p className="text-xs text-slate-400">{log.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Stock adjustment modal ──────────────────────────── */}
      {adjModal && selected && (
        <Modal title="Adjust Stock" onClose={() => setAdjModal(false)}>
          <p className="text-sm text-slate-500 mb-4">{selected.emoji} {selected.name} · Current stock: <span style={{ fontWeight: 600 }}>{selected.stock}</span></p>

          <div className="flex border border-slate-200 rounded-xl overflow-hidden mb-4">
            {(['in', 'out'] as ('in' | 'out')[]).map(t => (
              <button
                key={t}
                onClick={() => setAdjType(t)}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm transition-colors capitalize',
                  adjType === t
                    ? t === 'in' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white'
                    : 'text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                {t === 'in' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                Stock {t}
              </button>
            ))}
          </div>

          <label className="text-sm text-slate-500 block mb-1">Quantity</label>
          <input
            type="number"
            min={1}
            value={adjQty}
            onChange={e => setAdjQty(e.target.value)}
            placeholder="0"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-blue-400 text-slate-700"
            autoFocus
          />

          {adjQty && Number(adjQty) > 0 && (
            <div className={`mb-3 px-3 py-2 rounded-xl text-sm ${adjType === 'in' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
              New stock: <span style={{ fontWeight: 600 }}>
                {adjType === 'in' ? selected.stock + Number(adjQty) : Math.max(0, selected.stock - Number(adjQty))}
              </span>
            </div>
          )}

          <label className="text-sm text-slate-500 block mb-1">Note (optional)</label>
          <input
            type="text"
            value={adjNote}
            onChange={e => setAdjNote(e.target.value)}
            placeholder="e.g. Restocked from supplier"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-400 text-slate-700"
          />

          <button
            disabled={!adjQty || Number(adjQty) <= 0}
            onClick={saveAdjustment}
            className={[
              'w-full py-3 rounded-xl text-white transition-colors',
              adjType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600',
              (!adjQty || Number(adjQty) <= 0) ? 'opacity-40 cursor-not-allowed' : '',
            ].join(' ')}
          >
            Save Adjustment
          </button>
        </Modal>
      )}

      {/* ─── Product modal (Add/Edit) ───────────────────────────────── */}
      {productModal && (
        <Modal title={editingId ? "Edit Product" : "Add New Product"} onClose={() => setProductModal(false)}>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-slate-500 block mb-1">Product Name *</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="e.g. Espresso"
                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 text-slate-700"
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-500 block mb-1">Selling Price (IDR) *</label>
                <input
                  type="number"
                  min={0}
                  value={newPrice}
                  onChange={e => setNewPrice(e.target.value)}
                  placeholder="25000"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 text-slate-700"
                />
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Cost Price (IDR) *</label>
                <input
                  type="number"
                  min={0}
                  value={newCostPrice}
                  onChange={e => setNewCostPrice(e.target.value)}
                  placeholder="10000"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 text-slate-700"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm text-slate-500 block mb-1">Category *</label>
                <select
                  value={newCat}
                  onChange={e => setNewCat(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 text-slate-700 bg-white"
                >
                  {CATEGORIES.filter(c => c !== 'All').map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-slate-500 block mb-1">Low Stock Alert</label>
                <input
                  type="number"
                  min={1}
                  value={newThreshold}
                  onChange={e => setNewThreshold(e.target.value)}
                  placeholder="10"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 text-slate-700"
                />
              </div>
            </div>

            {!editingId && (
              <div>
                <label className="text-sm text-slate-500 block mb-1">Initial Stock *</label>
                <input
                  type="number"
                  min={0}
                  value={newStock}
                  onChange={e => setNewStock(e.target.value)}
                  placeholder="50"
                  className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 text-slate-700"
                />
              </div>
            )}

            <div>
              <label className="text-sm text-slate-500 block mb-1">Icon</label>
              <div className="flex flex-wrap gap-2">
                {PRODUCT_EMOJIS.map(e => (
                  <button
                    key={e}
                    onClick={() => setNewEmoji(e)}
                    className={[
                      'w-9 h-9 rounded-lg text-lg flex items-center justify-center border-2 transition-all',
                      newEmoji === e ? 'border-blue-500 bg-blue-50' : 'border-transparent hover:border-slate-200',
                    ].join(' ')}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            disabled={!newName.trim() || !newPrice || !newCostPrice || (!editingId && !newStock)}
            onClick={saveProduct}
            className="mt-5 w-full bg-blue-600 text-white rounded-xl py-3 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {editingId ? "Save Changes" : "Add Product"}
          </button>
        </Modal>
      )}

      <ConfirmationModal
        isOpen={confirmDeleteId !== null}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText="Delete"
        isDestructive={true}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDeleteId(null)}
      />
    </div>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl p-5 w-full max-w-sm max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">
          <X size={18} />
        </button>
        <h3 className="text-slate-800 mb-4">{title}</h3>
        {children}
      </div>
    </div>
  );
}
