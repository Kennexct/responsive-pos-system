import { useState, useRef } from 'react';
import { Search, Plus, AlertTriangle, TrendingDown, TrendingUp, X, Trash2, ImagePlus, Pencil, PlusCircle, Layers } from 'lucide-react';
import { formatIDR } from './mockData';
import type { Product, Category, ProductVariant } from './mockData';
import { ConfirmationModal } from './ConfirmationModal';
import { resizeImage } from './utils';

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
  categories: Category[];
  darkMode: boolean;
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

export function InventoryView({ products, onProductsChange, categories, darkMode }: Props) {
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
  const [newImage, setNewImage]   = useState<string | undefined>(undefined);
  const [newSku, setNewSku]       = useState('');
  const [newBarcode, setNewBarcode] = useState('');
  const [newTrackInventory, setNewTrackInventory] = useState(true);
  const [newAllowDiscount, setNewAllowDiscount] = useState(true);
  const [newVariants, setNewVariants] = useState<ProductVariant[]>([]);

  const fileInputRef              = useRef<HTMLInputElement>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const lowStockItems = products.filter(p => p.trackInventory && p.stock <= p.lowStockThreshold);

  const filtered = products.filter(p => {
    const searchLower = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(searchLower) || (p.sku && p.sku.toLowerCase().includes(searchLower)) || (p.barcode && p.barcode.toLowerCase().includes(searchLower));
    const matchTab    = tab === 'all' || (p.trackInventory && p.stock <= p.lowStockThreshold);
    return matchSearch && matchTab;
  });

  const openAdjust = (p: Product) => {
    setSelected(p); setAdjQty(''); setAdjNote(''); setAdjType('in'); setAdjModal(true);
  };

  const saveAdjustment = () => {
    if (!selected || !adjQty || Number(adjQty) <= 0) return;
    const qty = Number(adjQty);
    onProductsChange(products.map(p =>
      p.id === selected.id
        ? { ...p, stock: adjType === 'in' ? p.stock + qty : Math.max(0, p.stock - qty) }
        : p
    ));
    setStockLog(prev => [{
      id: Date.now().toString(), product: selected.name, type: adjType, qty,
      note: adjNote || (adjType === 'in' ? 'Manual stock-in' : 'Manual stock-out'),
      date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
    }, ...prev]);
    setAdjModal(false);
  };

  const handleImageUpload = async (file: File) => {
    try {
      const resized = await resizeImage(file, 300);
      setNewImage(resized);
    } catch (e) {
      console.error('Image resize failed:', e);
    }
  };

  const openAddProduct = () => {
    setEditingId(null);
    setNewName(''); setNewPrice(''); setNewCostPrice(''); setNewStock(''); setNewThreshold('10'); setNewEmoji('☕'); setNewImage(undefined);
    setNewSku(''); setNewBarcode(''); setNewTrackInventory(true); setNewAllowDiscount(true); setNewVariants([]);
    setProductModal(true);
  };

  const openEditProduct = (p: Product) => {
    setEditingId(p.id);
    setNewName(p.name); setNewPrice(String(p.price)); setNewCostPrice(String(p.costPrice));
    setNewCat(p.category); setNewStock(String(p.stock)); setNewThreshold(String(p.lowStockThreshold));
    setNewEmoji(p.emoji); setNewImage(p.image);
    setNewSku(p.sku || ''); setNewBarcode(p.barcode || '');
    setNewTrackInventory(p.trackInventory !== false); setNewAllowDiscount(p.allowDiscount !== false);
    setNewVariants(p.variants || []);
    setProductModal(true);
  };

  const addVariant = () => {
    setNewVariants([...newVariants, { id: Date.now().toString(), name: '', priceModifier: 0 }]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updated = [...newVariants];
    updated[index] = { ...updated[index], [field]: value };
    setNewVariants(updated);
  };

  const removeVariant = (index: number) => {
    setNewVariants(newVariants.filter((_, i) => i !== index));
  };

  const saveProduct = () => {
    if (!newName.trim() || !newPrice || !newCostPrice || (!editingId && newTrackInventory && !newStock)) return;

    const baseProductData = {
      name: newName.trim(),
      price: Number(newPrice),
      costPrice: Number(newCostPrice),
      category: newCat,
      lowStockThreshold: Number(newThreshold) || 10,
      emoji: newEmoji,
      image: newImage,
      sku: newSku.trim() || undefined,
      barcode: newBarcode.trim() || undefined,
      trackInventory: newTrackInventory,
      allowDiscount: newAllowDiscount,
      variants: newVariants.length > 0 ? newVariants : undefined,
    };

    if (editingId) {
      onProductsChange(products.map(p => p.id === editingId ? { ...p, ...baseProductData } : p));
    } else {
      const product: Product = {
        id: Date.now().toString(),
        stock: newTrackInventory ? Number(newStock) : 0,
        ...baseProductData
      };
      onProductsChange([...products, product]);
      if (newTrackInventory) {
        setStockLog(prev => [{
          id: Date.now().toString(), product: product.name, type: 'in', qty: product.stock,
          note: 'Initial stock', date: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }),
        }, ...prev]);
      }
    }
    setProductModal(false);
  };

  const deleteProduct = (id: string) => setConfirmDeleteId(id);
  const handleConfirmDelete = () => {
    if (confirmDeleteId) { onProductsChange(products.filter(p => p.id !== confirmDeleteId)); setConfirmDeleteId(null); }
  };

  const dm = darkMode;
  const bg      = dm ? 'bg-slate-900' : 'bg-slate-50';
  const surface = dm ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-100';
  const t1      = dm ? 'text-slate-100' : 'text-slate-800';
  const t2      = dm ? 'text-slate-400' : 'text-slate-500';
  const inputCls = dm ? 'bg-slate-700 border-slate-600 text-slate-100 placeholder-slate-500 focus:border-blue-400' : 'bg-white border-slate-200 text-slate-700 focus:border-blue-400';

  return (
    <div className={`flex-1 overflow-y-auto ${bg}`}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={t1}>Inventory</h1>
            <p className={`text-sm mt-0.5 ${t2}`}>{products.length} products · {lowStockItems.length} low stock</p>
          </div>
          <button
            onClick={openAddProduct}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors text-sm font-semibold"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {lowStockItems.length > 0 && (
          <div className={`border rounded-2xl p-4 flex items-center gap-3 ${dm ? 'bg-amber-900/20 border-amber-800/40' : 'bg-amber-50 border-amber-200'}`}>
            <AlertTriangle size={18} className="text-amber-600 shrink-0" />
            <p className={`text-sm ${dm ? 'text-amber-400' : 'text-amber-700'}`}>
              <span className="font-semibold">{lowStockItems.length} items</span> are running low and need restocking.
            </p>
          </div>
        )}

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search size={15} className={`absolute left-3 top-1/2 -translate-y-1/2 ${t2}`} />
            <input
              type="text" placeholder="Search products or SKU…" value={search} onChange={e => setSearch(e.target.value)}
              className={`w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm focus:outline-none transition-colors ${inputCls}`}
            />
          </div>
          <div className={`flex border rounded-xl overflow-hidden ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
            {(['all', 'low'] as StockTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'bg-blue-600 text-white' : dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50'}`}
              >
                {t === 'low' ? 'Low Stock' : 'All'}
              </button>
            ))}
          </div>
        </div>

        {/* Product table */}
        <div className={`rounded-2xl shadow-sm border overflow-hidden ${surface}`}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className={`text-left border-b ${dm ? 'bg-slate-700/50 border-slate-700' : 'bg-slate-50 border-slate-100'}`}>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Product</th>
                  <th className={`px-5 py-3 text-xs font-semibold hidden lg:table-cell ${t2}`}>Category / SKU</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Price / Margin</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Stock</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Status</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${dm ? 'divide-slate-700' : 'divide-slate-50'}`}>
                {filtered.map(product => {
                  const isLow     = product.trackInventory && product.stock <= product.lowStockThreshold;
                  const stockPct  = product.trackInventory ? Math.min(100, (product.stock / (product.lowStockThreshold * 3)) * 100) : 100;
                  const marginPct = product.price > 0 ? Math.round(((product.price - product.costPrice) / product.price) * 100) : 0;
                  return (
                    <tr key={product.id} className={`transition-colors ${dm ? 'hover:bg-slate-700/40' : 'hover:bg-slate-50/80'}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
                            {product.image
                              ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              : <span className="text-lg">{product.emoji}</span>
                            }
                          </div>
                          <div>
                            <span className={`font-medium block ${t1}`}>{product.name}</span>
                            {product.variants && product.variants.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-blue-500/10 text-blue-500 px-1.5 py-0.5 rounded mt-0.5">
                                <Layers size={10} /> {product.variants.length} Variants
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className={`px-5 py-3 hidden lg:table-cell ${t2}`}>
                        <div className="flex flex-col">
                          <span>{product.category}</span>
                          {product.sku && <span className="text-xs font-mono">{product.sku}</span>}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <span className={t1}>{formatIDR(product.price)}</span>
                        <span className="ml-2 text-xs text-emerald-600 bg-emerald-500/10 px-1.5 py-0.5 rounded-full font-semibold">{marginPct}%</span>
                      </td>
                      <td className="px-5 py-3">
                        {product.trackInventory ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-16 h-1.5 rounded-full overflow-hidden ${dm ? 'bg-slate-700' : 'bg-slate-100'}`}>
                              <div className={`h-full rounded-full ${isLow ? 'bg-red-400' : 'bg-emerald-400'}`} style={{ width: `${stockPct}%` }} />
                            </div>
                            <span className={`text-sm tabular-nums ${isLow ? 'text-red-500 font-semibold' : t1}`}>{product.stock}</span>
                          </div>
                        ) : (
                          <span className={`text-xs ${t2}`}>Untracked</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {product.trackInventory && isLow
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-500 text-xs font-semibold"><AlertTriangle size={10} />Low</span>
                          : <span className="inline-flex px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 text-xs font-semibold">OK</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {product.trackInventory && (
                            <button
                              onClick={() => openAdjust(product)}
                              className={`text-xs px-2.5 py-1.5 border rounded-lg transition-colors font-medium ${dm ? 'border-slate-600 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                            >
                              Adjust
                            </button>
                          )}
                          <button
                            onClick={() => openEditProduct(product)}
                            className="text-xs text-blue-600 hover:text-blue-800 px-2.5 py-1.5 border border-blue-200 dark:border-blue-800 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors font-medium"
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-slate-300 hover:text-red-400 transition-colors p-1.5"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className={`px-5 py-10 text-center text-sm ${t2}`}>No products found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Stock movement log */}
        <div className={`rounded-2xl shadow-sm border overflow-hidden ${surface}`}>
          <div className={`px-5 py-4 border-b ${dm ? 'border-slate-700' : 'border-slate-100'}`}>
            <h3 className={t1}>Stock Movement Log</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: dm ? '#1E2330' : '#F8FAFC' }}>
            {stockLog.map(log => (
              <div key={log.id} className={`flex items-center gap-3 px-5 py-3 ${dm ? 'divide-slate-700' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.type === 'in' ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                  {log.type === 'in'
                    ? <TrendingUp size={14} className="text-emerald-600" />
                    : <TrendingDown size={14} className="text-red-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${t1}`}>{log.product}</p>
                  <p className={`text-xs ${t2}`}>{log.note}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${log.type === 'in' ? 'text-emerald-600' : 'text-red-500'}`}>
                    {log.type === 'in' ? '+' : '-'}{log.qty}
                  </p>
                  <p className={`text-xs ${t2}`}>{log.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ─── Stock adjustment modal ─────────────────────────────────────────── */}
      {adjModal && selected && (
        <Modal title="Adjust Stock" onClose={() => setAdjModal(false)} darkMode={dm} maxWidth="max-w-sm">
          <p className={`text-sm mb-4 ${t2}`}>{selected.emoji} {selected.name} · Current stock: <span className="font-semibold">{selected.stock}</span></p>

          <div className={`flex border rounded-xl overflow-hidden mb-4 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
            {(['in', 'out'] as ('in' | 'out')[]).map(t => (
              <button
                key={t}
                onClick={() => setAdjType(t)}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors capitalize',
                  adjType === t ? (t === 'in' ? 'bg-emerald-600 text-white' : 'bg-red-500 text-white') : dm ? 'text-slate-400 hover:bg-slate-700' : 'text-slate-500 hover:bg-slate-50',
                ].join(' ')}
              >
                {t === 'in' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                Stock {t}
              </button>
            ))}
          </div>

          <label className={`text-sm block mb-1 ${t2}`}>Quantity</label>
          <input
            type="number" min={1} value={adjQty} onChange={e => setAdjQty(e.target.value)} placeholder="0" autoFocus
            className={`w-full border rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-blue-400 ${inputCls}`}
          />

          {adjQty && Number(adjQty) > 0 && (
            <div className={`mb-3 px-3 py-2 rounded-xl text-sm ${adjType === 'in' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>
              New stock: <span className="font-semibold">{adjType === 'in' ? selected.stock + Number(adjQty) : Math.max(0, selected.stock - Number(adjQty))}</span>
            </div>
          )}

          <label className={`text-sm block mb-1 ${t2}`}>Note (optional)</label>
          <input
            type="text" value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="e.g. Restocked from supplier"
            className={`w-full border rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-blue-400 ${inputCls}`}
          />

          <button
            disabled={!adjQty || Number(adjQty) <= 0}
            onClick={saveAdjustment}
            className={`w-full py-3 rounded-xl text-white transition-colors font-semibold ${adjType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Save Adjustment
          </button>
        </Modal>
      )}

      {/* ─── Product modal (Add/Edit) ───────────────────────────────────────── */}
      {productModal && (
        <Modal title={editingId ? 'Edit Product' : 'Add New Product'} onClose={() => setProductModal(false)} darkMode={dm} maxWidth="max-w-2xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {/* Image upload */}
              <div>
                <label className={`text-sm block mb-2 font-medium ${t2}`}>Product Image</label>
                <div className="flex items-center gap-4">
                  <div
                    className={`w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed cursor-pointer transition-colors ${
                      newImage ? 'border-transparent' : dm ? 'border-slate-600 hover:border-blue-500' : 'border-slate-300 hover:border-blue-400'
                    }`}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {newImage
                      ? <img src={newImage} alt="preview" className="w-full h-full object-cover rounded-xl" />
                      : <span className="text-3xl">{newEmoji}</span>
                    }
                  </div>
                  <div className="flex-1">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${dm ? 'border-slate-700 text-slate-300 hover:bg-slate-700' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                    >
                      <ImagePlus size={15} /> Upload Image
                    </button>
                    <p className={`text-xs mt-1.5 ${t2}`}>Auto-resized to 300×300 WebP</p>
                    {newImage && (
                      <button onClick={() => setNewImage(undefined)} className="text-xs text-red-500 hover:text-red-700 mt-1">Remove image</button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className={`text-sm block mb-1 ${t2}`}>Product Name *</label>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Espresso" autoFocus
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm block mb-1 ${t2}`}>Selling Price (IDR) *</label>
                  <input type="number" min={0} value={newPrice} onChange={e => setNewPrice(e.target.value)} placeholder="25000"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`} />
                </div>
                <div>
                  <label className={`text-sm block mb-1 ${t2}`}>Cost Price (IDR) *</label>
                  <input type="number" min={0} value={newCostPrice} onChange={e => setNewCostPrice(e.target.value)} placeholder="10000"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`} />
                </div>
              </div>

              {/* Margin preview */}
              {newPrice && newCostPrice && Number(newPrice) > 0 && (
                <div className="flex items-center gap-2 text-sm text-emerald-600">
                  <span className="bg-emerald-500/10 px-2.5 py-1 rounded-full font-semibold">
                    {Math.round(((Number(newPrice) - Number(newCostPrice)) / Number(newPrice)) * 100)}% margin
                  </span>
                  <span className={`text-xs ${t2}`}>Profit: {formatIDR(Number(newPrice) - Number(newCostPrice))} per unit</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm block mb-1 ${t2}`}>Category *</label>
                  <select value={newCat} onChange={e => setNewCat(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`}>
                    {categories.filter(c => c.id !== 'cat-all').map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                {!newImage && (
                  <div>
                    <label className={`text-sm block mb-1 ${t2}`}>Emoji Icon</label>
                    <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`}>
                      {PRODUCT_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`text-sm block mb-1 ${t2}`}>SKU (Optional)</label>
                  <input type="text" value={newSku} onChange={e => setNewSku(e.target.value)} placeholder="e.g. COF-ESP-01"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`} />
                </div>
                <div>
                  <label className={`text-sm block mb-1 ${t2}`}>Barcode (Optional)</label>
                  <input type="text" value={newBarcode} onChange={e => setNewBarcode(e.target.value)} placeholder="Scan barcode"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`} />
                </div>
              </div>

              <div className={`border rounded-xl p-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className={`text-sm font-medium ${t1}`}>Track Inventory</p>
                    <p className={`text-xs ${t2}`}>Monitor stock levels for this item</p>
                  </div>
                  <Toggle checked={newTrackInventory} onChange={() => setNewTrackInventory(!newTrackInventory)} />
                </div>
                
                {newTrackInventory && (
                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-dashed border-slate-300 dark:border-slate-600">
                    {!editingId && (
                      <div>
                        <label className={`text-xs block mb-1 ${t2}`}>Initial Stock *</label>
                        <input type="number" min={0} value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="50"
                          className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`} />
                      </div>
                    )}
                    <div>
                      <label className={`text-xs block mb-1 ${t2}`}>Low Stock Alert</label>
                      <input type="number" min={1} value={newThreshold} onChange={e => setNewThreshold(e.target.value)} placeholder="10"
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-blue-400 ${inputCls}`} />
                    </div>
                  </div>
                )}
              </div>

              <div className={`flex items-center justify-between border rounded-xl p-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                <div>
                  <p className={`text-sm font-medium ${t1}`}>Allow Discounts</p>
                  <p className={`text-xs ${t2}`}>Item eligible for manual and promo discounts</p>
                </div>
                <Toggle checked={newAllowDiscount} onChange={() => setNewAllowDiscount(!newAllowDiscount)} />
              </div>

              {/* Variants Section */}
              <div className={`border rounded-xl p-3 ${dm ? 'border-slate-700' : 'border-slate-200'}`}>
                <div className="flex items-center justify-between mb-3">
                  <h4 className={`text-sm font-medium ${t1}`}>Variants (Sizes, Add-ons)</h4>
                  <button onClick={addVariant} className="text-xs flex items-center gap-1 text-blue-500 hover:text-blue-700">
                    <PlusCircle size={14} /> Add
                  </button>
                </div>
                
                {newVariants.length === 0 ? (
                  <p className={`text-xs ${t2}`}>No variants added. E.g., Size Large (+Rp 5.000)</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto">
                    {newVariants.map((v, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input type="text" placeholder="Name (e.g. Large)" value={v.name} onChange={e => updateVariant(i, 'name', e.target.value)}
                          className={`flex-1 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 ${inputCls}`} />
                        <input type="number" placeholder="Price Mod (+)" value={v.priceModifier} onChange={e => updateVariant(i, 'priceModifier', Number(e.target.value))}
                          className={`w-24 border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-blue-400 ${inputCls}`} />
                        <button onClick={() => removeVariant(i)} className="text-slate-400 hover:text-red-500">
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 flex justify-end">
            <button
              disabled={!newName.trim() || !newPrice || !newCostPrice || (!editingId && newTrackInventory && !newStock)}
              onClick={saveProduct}
              className="w-full md:w-auto px-6 bg-blue-600 text-white rounded-xl py-2.5 hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              {editingId ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
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

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, position: 'relative', flexShrink: 0 }}
      className={`rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-600'}`}>
      <span style={{ position: 'absolute', width: 18, height: 18, top: 2, left: 2, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transform: checked ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
    </button>
  );
}

function Modal({ title, children, onClose, darkMode, maxWidth = "max-w-sm" }: { title: string; children: React.ReactNode; onClose: () => void; darkMode: boolean; maxWidth?: string; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative rounded-2xl p-5 w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl ${darkMode ? 'bg-slate-800 border border-slate-700' : 'bg-white'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-400 hover:text-slate-600'}`}>
          <X size={18} />
        </button>
        <h3 className={`mb-4 font-semibold ${darkMode ? 'text-slate-100' : 'text-slate-800'}`}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
