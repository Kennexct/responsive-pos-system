import { useState, useRef, useEffect } from 'react';
import { Search, Plus, AlertTriangle, TrendingDown, TrendingUp, X, Trash2, ImagePlus, Pencil, PlusCircle, Layers, ArrowUpDown } from 'lucide-react';
import { formatIDR, formatNumberWithDots } from './mockData';
import type { Product, Category, ProductVariant, OptionGroup, OptionChoice } from './mockData';
import { ConfirmationModal } from './ConfirmationModal';
import { resizeImage } from './utils';

const STOCK_LOG_INITIAL: StockLogEntry[] = [];

const PRODUCT_EMOJIS = ['☕','🥛','🍵','🧊','🫖','🍳','🍜','🥪','🥑','🍌','🥟','🥐','🍫','🍰','🍮','🍊','🍓','💧','💦','🥤','🍋','🥗'];

interface Props {
  products: Product[];
  onProductsChange: (p: Product[]) => void;
  categories: Category[];
  setCategories?: React.Dispatch<React.SetStateAction<Category[]>>;
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

export function InventoryView({ products, onProductsChange, categories, setCategories, darkMode }: Props) {
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
  const [newTrackInventory, setNewTrackInventory] = useState(false);
  const [newAllowDiscount, setNewAllowDiscount] = useState(false);
  const [newVariants, setNewVariants] = useState<ProductVariant[]>([]);
  const [newOptionGroups, setNewOptionGroups] = useState<OptionGroup[]>([]);

  // Quick Add Category Modal inside Add Product
  const [showQuickCategoryModal, setShowQuickCategoryModal] = useState(false);
  const [quickCategoryName, setQuickCategoryName] = useState('');

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const fileInputRef              = useRef<HTMLInputElement>(null);

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const lowStockItems = products.filter(p => p.trackInventory && p.stock <= p.lowStockThreshold);

  const filtered = products.filter(p => {
    const searchLower = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(searchLower) || (p.sku && p.sku.toLowerCase().includes(searchLower)) || (p.barcode && p.barcode.toLowerCase().includes(searchLower));
    const matchTab    = tab === 'all' || (p.trackInventory && p.stock <= p.lowStockThreshold);
    return matchSearch && matchTab;
  }).sort((a, b) => {
    if (!sortConfig) return 0;
    const { key, direction } = sortConfig;
    const aVal = key === 'name' ? a.name : key === 'price' ? a.price : key === 'stock' ? a.stock : 0;
    const bVal = key === 'name' ? b.name : key === 'price' ? b.price : key === 'stock' ? b.stock : 0;
    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });
  };

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
    setNewSku(''); setNewBarcode(''); setNewTrackInventory(false); setNewAllowDiscount(true); setNewVariants([]); setNewOptionGroups([]);
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
    setNewOptionGroups(p.optionGroups || []);
    setProductModal(true);
  };

  const addVariant = () => {
    setNewVariants([...newVariants, { id: Date.now().toString(), name: '', priceModifier: 0, sku: '', barcode: '' }]);
  };

  const updateVariant = (index: number, field: keyof ProductVariant, value: string | number) => {
    const updated = [...newVariants];
    updated[index] = { ...updated[index], [field]: value };
    setNewVariants(updated);
  };

  const removeVariant = (index: number) => {
    setNewVariants(newVariants.filter((_, i) => i !== index));
  };

  const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

  const addOptionGroup = (preset?: Partial<OptionGroup>) => {
    setNewOptionGroups(prev => [...prev, {
      id: uid('grp'),
      name: preset?.name ?? '',
      selection: preset?.selection ?? 'single',
      required: preset?.required ?? true,
      maxSelect: preset?.maxSelect,
      choices: preset?.choices?.map(c => ({ ...c, id: uid('opt') }))
        ?? [{ id: uid('opt'), name: '', priceDelta: 0, isDefault: true }],
    }]);
  };

  const updateGroup = (id: string, patch: Partial<OptionGroup>) =>
    setNewOptionGroups(prev => prev.map(g => g.id === id ? { ...g, ...patch } : g));

  const removeGroup = (id: string) => setNewOptionGroups(prev => prev.filter(g => g.id !== id));

  const addChoice = (groupId: string) =>
    updateGroupChoices(groupId, choices => [...choices, { id: uid('opt'), name: '', priceDelta: 0 }]);

  const updateChoice = (groupId: string, choiceId: string, patch: Partial<OptionChoice>) =>
    updateGroupChoices(groupId, choices => choices.map(c => c.id === choiceId ? { ...c, ...patch } : c));

  const removeChoice = (groupId: string, choiceId: string) =>
    updateGroupChoices(groupId, choices => choices.filter(c => c.id !== choiceId));

  const setDefaultChoice = (group: OptionGroup, choiceId: string) =>
    updateGroupChoices(group.id, choices => choices.map(c => ({
      ...c,
      // Only one default makes sense when the cashier can pick just one.
      isDefault: group.selection === 'single' ? c.id === choiceId : c.id === choiceId ? !c.isDefault : c.isDefault,
    })));

  const updateGroupChoices = (groupId: string, fn: (choices: OptionChoice[]) => OptionChoice[]) =>
    setNewOptionGroups(prev => prev.map(g => g.id === groupId ? { ...g, choices: fn(g.choices) } : g));

  /** Common F&B groups, so a café doesn't type the same three groups for every drink. */
  const OPTION_PRESETS: { label: string; group: Partial<OptionGroup> }[] = [
    { label: 'Size', group: { name: 'Size', selection: 'single', required: true, choices: [
      { id: '', name: 'Small', priceDelta: -3000 }, { id: '', name: 'Medium', priceDelta: 0, isDefault: true }, { id: '', name: 'Large', priceDelta: 6000 },
    ] } },
    { label: 'Hot / Ice', group: { name: 'Temperature', selection: 'single', required: true, choices: [
      { id: '', name: 'Hot', priceDelta: 0, isDefault: true }, { id: '', name: 'Ice', priceDelta: 2000 },
    ] } },
    { label: 'Extra shots', group: { name: 'Extra shots', selection: 'single', required: false, choices: [
      { id: '', name: '+1 shot', priceDelta: 8000 }, { id: '', name: '+2 shots', priceDelta: 15000 },
    ] } },
    { label: 'Add-ons', group: { name: 'Add-ons', selection: 'multi', required: false, maxSelect: 3, choices: [
      { id: '', name: 'Oat milk', priceDelta: 10000 }, { id: '', name: 'Extra cheese', priceDelta: 5000 },
    ] } },
  ];

  const saveProduct = () => {
    if (!newName.trim() || !newPrice || (!editingId && newTrackInventory && !newStock)) return;

    const baseProductData = {
      name: newName.trim(),
      price: Number(newPrice),
      costPrice: Number(newCostPrice) || 0,
      category: newCat,
      lowStockThreshold: Number(newThreshold) || 10,
      emoji: newEmoji,
      image: newImage,
      sku: newSku.trim() || undefined,
      barcode: newBarcode.trim() || undefined,
      trackInventory: newTrackInventory,
      allowDiscount: newAllowDiscount,
      variants: newVariants.length > 0 ? newVariants.filter(v => v.name.trim()) : undefined,
      optionGroups: newOptionGroups.length > 0
        ? newOptionGroups
            .filter(g => g.name.trim() && g.choices.some(c => c.name.trim()))
            .map(g => ({ ...g, name: g.name.trim(), choices: g.choices.filter(c => c.name.trim()) }))
        : undefined,
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
  const bg      = dm ? 'bg-ink-900' : 'bg-ink-50';
  const surface = dm ? 'bg-ink-800 border-ink-700' : 'bg-white border-ink-100';
  const t1      = dm ? 'text-ink-100' : 'text-ink-800';
  const t2      = dm ? 'text-ink-400' : 'text-ink-500';
  const inputCls = dm ? 'bg-ink-700 border-ink-600 text-ink-100 placeholder-ink-500 focus:border-brand-400' : 'bg-white border-ink-200 text-ink-700 focus:border-brand-400';

  return (
    <div className={`flex-1 overflow-y-auto w-full ${bg}`}>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-xl sm:text-2xl font-bold ${t1}`}>Inventory</h1>
            <p className={`text-sm mt-0.5 ${t2}`}>{products.length} products, {lowStockItems.length} running low</p>
          </div>
          <button
            onClick={openAddProduct}
            className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-xl hover:bg-brand-700 transition-colors text-sm font-semibold"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>

        {lowStockItems.length > 0 && (
          <div className={`border rounded-2xl p-4 flex items-center gap-3 ${dm ? 'bg-turmeric-900/20 border-turmeric-800/40' : 'bg-turmeric-50 border-turmeric-200'}`}>
            <AlertTriangle size={18} className="text-turmeric-600 shrink-0" />
            <p className={`text-sm ${dm ? 'text-turmeric-400' : 'text-turmeric-700'}`}>
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
          <div className={`flex border rounded-xl overflow-hidden ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
            {(['all', 'low'] as StockTab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? 'bg-brand-600 text-white' : dm ? 'text-ink-400 hover:bg-ink-700' : 'text-ink-500 hover:bg-ink-50'}`}
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
                <tr className={`text-left border-b ${dm ? 'bg-ink-700/50 border-ink-700' : 'bg-ink-50 border-ink-100'}`}>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2} cursor-pointer select-none`} onClick={() => handleSort('name')}>
                    <div className="flex items-center gap-1">Product <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th className={`px-5 py-3 text-xs font-semibold hidden lg:table-cell ${t2}`}>Category / SKU</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2} cursor-pointer select-none`} onClick={() => handleSort('price')}>
                    <div className="flex items-center gap-1">Price / Margin <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2} cursor-pointer select-none`} onClick={() => handleSort('stock')}>
                    <div className="flex items-center gap-1">Stock <ArrowUpDown size={14} className="opacity-50" /></div>
                  </th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Status</th>
                  <th className={`px-5 py-3 text-xs font-semibold ${t2}`}>Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${dm ? 'divide-ink-700' : 'divide-ink-50'}`}>
                {filtered.map(product => {
                  const isLow     = product.trackInventory && product.stock <= product.lowStockThreshold;
                  const stockPct  = product.trackInventory ? Math.min(100, (product.stock / (product.lowStockThreshold * 3)) * 100) : 100;
                  const marginPct = product.price > 0 ? Math.round(((product.price - product.costPrice) / product.price) * 100) : 0;
                  return (
                    <tr key={product.id} className={`transition-colors ${dm ? 'hover:bg-ink-700/40' : 'hover:bg-ink-50/80'}`}>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center overflow-hidden shrink-0 ${dm ? 'bg-ink-700' : 'bg-ink-100'}`}>
                            {product.image
                              ? <img src={product.image} alt={product.name} className="w-full h-full object-cover" />
                              : <span className="text-lg">{product.emoji}</span>
                            }
                          </div>
                          <div>
                            <span className={`font-medium block ${t1}`}>{product.name}</span>
                            {product.variants && product.variants.length > 0 && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-brand-500/10 text-brand-500 px-1.5 py-0.5 rounded mt-0.5">
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
                        <span className="ml-2 text-xs text-leaf-600 bg-leaf-500/10 px-1.5 py-0.5 rounded-full font-semibold">{marginPct}%</span>
                      </td>
                      <td className="px-5 py-3">
                        {product.trackInventory ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-16 h-1.5 rounded-full overflow-hidden ${dm ? 'bg-ink-700' : 'bg-ink-100'}`}>
                              <div className={`h-full rounded-full ${isLow ? 'bg-chili-400' : 'bg-leaf-400'}`} style={{ width: `${stockPct}%` }} />
                            </div>
                            <span className={`text-sm tabular-nums ${isLow ? 'text-chili-500 font-semibold' : t1}`}>{product.stock}</span>
                          </div>
                        ) : (
                          <span className={`text-xs ${t2}`}>Untracked</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {product.trackInventory && isLow
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-chili-500/10 text-chili-500 text-xs font-semibold"><AlertTriangle size={10} />Low</span>
                          : <span className="inline-flex px-2 py-0.5 rounded-full bg-leaf-500/10 text-leaf-600 text-xs font-semibold">OK</span>
                        }
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-1.5">
                          {product.trackInventory && (
                            <button
                              onClick={() => openAdjust(product)}
                              className={`text-xs px-2.5 py-1.5 border rounded-lg transition-colors font-medium ${dm ? 'border-ink-600 text-ink-300 hover:bg-ink-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}
                            >
                              Adjust
                            </button>
                          )}
                          <button
                            onClick={() => openEditProduct(product)}
                            className={`text-xs text-brand-600 hover:text-brand-800 px-2.5 py-1.5 border rounded-lg transition-colors font-medium ${dm ? 'border-brand-800 hover:bg-brand-900/20' : 'border-brand-200 hover:bg-brand-50'}`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={() => deleteProduct(product.id)}
                            className="text-ink-300 hover:text-chili-400 transition-colors p-1.5"
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
          <div className={`px-5 py-4 border-b ${dm ? 'border-ink-700' : 'border-ink-100'}`}>
            <h3 className={t1}>Stock Movement Log</h3>
          </div>
          <div className="divide-y max-h-64 overflow-y-auto" style={{ borderColor: dm ? '#181B25' : '#F5F6F8' }}>
            {stockLog.map(log => (
              <div key={log.id} className={`flex items-center gap-3 px-5 py-3 ${dm ? 'divide-ink-700' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${log.type === 'in' ? 'bg-leaf-500/10' : 'bg-chili-500/10'}`}>
                  {log.type === 'in'
                    ? <TrendingUp size={14} className="text-leaf-600" />
                    : <TrendingDown size={14} className="text-chili-500" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${t1}`}>{log.product}</p>
                  <p className={`text-xs ${t2}`}>{log.note}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className={`text-sm font-semibold ${log.type === 'in' ? 'text-leaf-600' : 'text-chili-500'}`}>
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
          <p className={`text-sm mb-4 ${t2}`}>{selected.emoji} {selected.name}. In stock: <span className="font-semibold">{selected.stock}</span></p>

          <div className={`flex border rounded-xl overflow-hidden mb-4 ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
            {(['in', 'out'] as ('in' | 'out')[]).map(t => (
              <button
                key={t}
                onClick={() => setAdjType(t)}
                className={[
                  'flex-1 flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors capitalize',
                  adjType === t ? (t === 'in' ? 'bg-leaf-600 text-white' : 'bg-chili-500 text-white') : dm ? 'text-ink-400 hover:bg-ink-700' : 'text-ink-500 hover:bg-ink-50',
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
            className={`w-full border rounded-xl px-4 py-3 mb-3 focus:outline-none focus:border-brand-400 ${inputCls}`}
          />

          {adjQty && Number(adjQty) > 0 && (
            <div className={`mb-3 px-3 py-2 rounded-xl text-sm ${adjType === 'in' ? 'bg-leaf-500/10 text-leaf-600' : 'bg-chili-500/10 text-chili-600'}`}>
              New stock: <span className="font-semibold">{adjType === 'in' ? selected.stock + Number(adjQty) : Math.max(0, selected.stock - Number(adjQty))}</span>
            </div>
          )}

          <label className={`text-sm block mb-1 ${t2}`}>Note (optional)</label>
          <input
            type="text" value={adjNote} onChange={e => setAdjNote(e.target.value)} placeholder="e.g. Restocked from supplier"
            className={`w-full border rounded-xl px-4 py-3 mb-4 focus:outline-none focus:border-brand-400 ${inputCls}`}
          />

          <button
            disabled={!adjQty || Number(adjQty) <= 0}
            onClick={saveAdjustment}
            className={`w-full py-3 rounded-xl text-white transition-colors font-semibold ${adjType === 'in' ? 'bg-leaf-600 hover:bg-leaf-700' : 'bg-chili-500 hover:bg-chili-600'} disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            Save Adjustment
          </button>
        </Modal>
      )}

      {/* ─── Product modal (Add/Edit) ───────────────────────────────────────── */}
      {productModal && (
        <Modal title={editingId ? 'Edit Product' : 'Add New Product'} onClose={() => setProductModal(false)} darkMode={dm} maxWidth="max-w-3xl">
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-4 items-start">
              {/* Image upload */}
              <div>
                <label className={`text-sm block mb-2 font-medium ${t2}`}>Product Image</label>
                <div className="flex items-center gap-4">
                  <div
                    className={`w-20 h-20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-dashed cursor-pointer transition-colors ${
                      newImage ? 'border-transparent' : dm ? 'border-ink-600 hover:border-brand-500' : 'border-ink-300 hover:border-brand-400'
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
                      className={`flex items-center gap-2 text-sm px-3 py-2 rounded-lg border font-medium transition-colors ${dm ? 'border-ink-700 text-ink-300 hover:bg-ink-700' : 'border-ink-200 text-ink-600 hover:bg-ink-50'}`}
                    >
                      <ImagePlus size={15} /> Upload Image
                    </button>
                    <p className={`text-xs mt-1.5 ${t2}`}>Auto-resized to 300×300 WebP</p>
                    {newImage && (
                      <button onClick={() => setNewImage(undefined)} className="text-xs text-chili-500 hover:text-chili-700 mt-1">Remove image</button>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <label className={`text-sm block mb-1 font-medium ${t2}`}>Product Name *</label>
                <input
                  type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Espresso" autoFocus
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
                />
              </div>

              {/* Price & Cost Price (Aligned with matched label heights and baselines) */}
              <div className="grid grid-cols-2 gap-3 items-start">
                <div className="flex flex-col">
                  <div className="h-5 flex items-center mb-1">
                    <label className={`text-sm font-medium ${t2}`}>Selling Price (IDR) *</label>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newPrice ? formatNumberWithDots(newPrice) : ''}
                    onChange={e => setNewPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="25.000"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
                  />
                </div>
                <div className="flex flex-col">
                  <div className="h-5 flex items-center justify-between mb-1">
                    <label className={`text-sm font-medium ${t2}`}>Cost Price (IDR)</label>
                    <span className={`text-xs ${t2} opacity-75`}>Optional</span>
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={newCostPrice ? formatNumberWithDots(newCostPrice) : ''}
                    onChange={e => setNewCostPrice(e.target.value.replace(/\D/g, ''))}
                    placeholder="10.000"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
                  />
                </div>
              </div>

              {/* Margin preview */}
              {newPrice && newCostPrice && Number(newPrice) > 0 && (
                <div className="flex items-center gap-2 text-sm text-leaf-600">
                  <span className="bg-leaf-500/10 px-2.5 py-1 rounded-full font-semibold">
                    {Math.round(((Number(newPrice) - Number(newCostPrice)) / Number(newPrice)) * 100)}% margin
                  </span>
                  <span className={`text-xs ${t2}`}>Profit: {formatIDR(Number(newPrice) - Number(newCostPrice))} per unit</span>
                </div>
              )}

              {/* Category & Emoji with Quick Add Category */}
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <div className="h-5 flex items-center justify-between mb-1">
                    <label className={`text-sm font-medium ${t2}`}>Category *</label>
                    <button
                      type="button"
                      onClick={() => setShowQuickCategoryModal(true)}
                      className="text-xs font-semibold text-brand-500 hover:text-brand-700 flex items-center gap-0.5"
                    >
                      <Plus size={12} /> Add New
                    </button>
                  </div>
                  <select value={newCat} onChange={e => setNewCat(e.target.value)}
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}>
                    {categories.filter(c => c.id !== 'cat-all').map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                  </select>
                </div>
                {!newImage && (
                  <div>
                    <div className="h-5 flex items-center mb-1">
                      <label className={`text-sm font-medium ${t2}`}>Emoji Icon</label>
                    </div>
                    <select value={newEmoji} onChange={e => setNewEmoji(e.target.value)}
                      className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}>
                      {PRODUCT_EMOJIS.map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              {/* Product SKU & Barcode (Optional) */}
              <div className="grid grid-cols-2 gap-3 items-start">
                <div>
                  <label className={`text-sm block mb-1 font-medium ${t2}`}>SKU (Optional)</label>
                  <input type="text" value={newSku} onChange={e => setNewSku(e.target.value)} placeholder="e.g. COF-ESP-01"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`} />
                </div>
                <div>
                  <label className={`text-sm block mb-1 font-medium ${t2}`}>Barcode (Optional)</label>
                  <input type="text" value={newBarcode} onChange={e => setNewBarcode(e.target.value)} placeholder="Scan barcode"
                    className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`} />
                </div>
              </div>

              {/* ── Variants: a different thing on the shelf, with its own SKU, barcode and price ── */}
              <section className={`border rounded-xl p-4 ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <h4 className={`text-sm font-semibold ${t1}`}>Variants</h4>
                    <p className={`text-xs mt-0.5 ${t2}`}>A different item on the shelf: 500ml bottle, red / size M. Each one can carry its own SKU and barcode. The cashier picks exactly one.</p>
                  </div>
                  <button
                    type="button"
                    onClick={addVariant}
                    className={`shrink-0 text-sm flex items-center gap-1.5 font-semibold px-3 h-9 rounded-md cursor-pointer ${dm ? 'bg-ink-800 text-brand-300 hover:bg-ink-700' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                  >
                    <PlusCircle size={15} /> Add variant
                  </button>
                </div>

                {newVariants.length === 0 ? (
                  <p className={`text-sm ${t2}`}>None. Most café drinks need options below instead.</p>
                ) : (
                  <div className="space-y-3">
                    {newVariants.map((v, i) => (
                      <div key={v.id || i} className={`rounded-lg border p-3 space-y-2.5 ${dm ? 'bg-ink-850 border-ink-700' : 'bg-ink-50 border-ink-200'}`}>
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold ${t2}`}>Variant {i + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeVariant(i)}
                            aria-label={`Remove variant ${i + 1}`}
                            className="w-8 h-8 flex items-center justify-center rounded-md text-ink-400 hover:text-chili-600 hover:bg-chili-50 dark:hover:bg-chili-500/10 cursor-pointer"
                          >
                            <X size={15} />
                          </button>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2.5">
                          <label className="block">
                            <span className={`text-xs block mb-1 font-medium ${t2}`}>Name *</span>
                            <input
                              type="text" placeholder="e.g. 500ml bottle" value={v.name}
                              onChange={e => updateVariant(i, 'name', e.target.value)}
                              className={`w-full border rounded-md px-3 h-11 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
                            />
                          </label>
                          <label className="block">
                            <span className={`text-xs block mb-1 font-medium ${t2}`}>Price difference</span>
                            <MoneyDeltaInput
                              value={v.priceModifier}
                              onChange={n => updateVariant(i, 'priceModifier', n)}
                              className={`w-full border rounded-md px-3 h-11 text-sm focus:outline-none focus:border-brand-400 tabular-nums ${inputCls}`}
                            />
                            <span className={`text-xs mt-1 block ${t2}`}>
                              {newPrice ? `Sells for ${formatIDR(Number(newPrice) + (v.priceModifier || 0))}` : 'Set the selling price first'}
                            </span>
                          </label>
                          <label className="block">
                            <span className={`text-xs block mb-1 font-medium ${t2}`}>SKU</span>
                            <input
                              type="text" placeholder="e.g. COF-ESP-LG" value={v.sku || ''}
                              onChange={e => updateVariant(i, 'sku', e.target.value)}
                              className={`w-full border rounded-md px-3 h-11 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
                            />
                          </label>
                          <label className="block">
                            <span className={`text-xs block mb-1 font-medium ${t2}`}>Barcode</span>
                            <input
                              type="text" placeholder="Scan or type" value={v.barcode || ''}
                              onChange={e => updateVariant(i, 'barcode', e.target.value)}
                              className={`w-full border rounded-md px-3 h-11 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Options: how the same item is made. No stock, no barcode. ── */}
              <section className={`border rounded-xl p-4 ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                <div className="mb-3">
                  <h4 className={`text-sm font-semibold ${t1}`}>Options and add-ons</h4>
                  <p className={`text-xs mt-0.5 ${t2}`}>How this item is made: size, hot or ice, extra shots. Each choice can add to the price. Ask as many groups as you need.</p>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                  {OPTION_PRESETS.map(preset => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => addOptionGroup(preset.group)}
                      className={`text-sm px-3 h-9 rounded-md border font-medium cursor-pointer ${dm ? 'border-ink-700 text-ink-300 hover:bg-ink-800' : 'border-ink-200 text-ink-700 hover:bg-ink-100'}`}
                    >
                      + {preset.label}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => addOptionGroup()}
                    className={`text-sm flex items-center gap-1.5 px-3 h-9 rounded-md font-semibold cursor-pointer ${dm ? 'bg-ink-800 text-brand-300 hover:bg-ink-700' : 'bg-brand-50 text-brand-700 hover:bg-brand-100'}`}
                  >
                    <PlusCircle size={15} /> Blank group
                  </button>
                </div>

                {newOptionGroups.length === 0 ? (
                  <p className={`text-sm ${t2}`}>No options. Tap a suggestion above, for example Size, then Hot / Ice.</p>
                ) : (
                  <div className="space-y-3">
                    {newOptionGroups.map((g, gi) => (
                      <div key={g.id} className={`rounded-lg border p-3 ${dm ? 'bg-ink-850 border-ink-700' : 'bg-ink-50 border-ink-200'}`}>
                        <div className="flex items-end gap-2 mb-3">
                          <label className="flex-1 block">
                            <span className={`text-xs block mb-1 font-medium ${t2}`}>Option {gi + 1} name *</span>
                            <input
                              type="text" placeholder="e.g. Size, Temperature, Extra shots" value={g.name}
                              onChange={e => updateGroup(g.id, { name: e.target.value })}
                              className={`w-full border rounded-md px-3 h-11 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
                            />
                          </label>
                          <button
                            type="button"
                            onClick={() => removeGroup(g.id)}
                            aria-label={`Remove option group ${g.name || gi + 1}`}
                            className="w-11 h-11 flex items-center justify-center rounded-md text-ink-400 hover:text-chili-600 hover:bg-chili-50 dark:hover:bg-chili-500/10 cursor-pointer"
                          >
                            <Trash2 size={15} />
                          </button>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 mb-3">
                          <div role="radiogroup" aria-label="How many can be chosen" className={`flex rounded-md p-0.5 ${dm ? 'bg-ink-800' : 'bg-ink-200/60'}`}>
                            {(['single', 'multi'] as const).map(mode => (
                              <button
                                key={mode}
                                type="button"
                                role="radio"
                                aria-checked={g.selection === mode}
                                onClick={() => updateGroup(g.id, {
                                  selection: mode,
                                  maxSelect: mode === 'multi' ? (g.maxSelect ?? 2) : undefined,
                                  choices: mode === 'single'
                                    ? g.choices.map((c, i) => ({ ...c, isDefault: c.isDefault && g.choices.findIndex(x => x.isDefault) === i }))
                                    : g.choices,
                                })}
                                className={`px-3 h-9 rounded text-sm font-medium cursor-pointer ${
                                  g.selection === mode
                                    ? dm ? 'bg-ink-700 text-ink-50' : 'bg-white text-ink-900 shadow-sm'
                                    : t2
                                }`}
                              >
                                {mode === 'single' ? 'Pick one' : 'Pick many'}
                              </button>
                            ))}
                          </div>

                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox" checked={g.required}
                              onChange={e => updateGroup(g.id, { required: e.target.checked })}
                              className="h-4 w-4 accent-brand-600"
                            />
                            <span className={`text-sm ${t1}`}>Must be chosen</span>
                          </label>

                          {g.selection === 'multi' && (
                            <label className="flex items-center gap-2">
                              <span className={`text-sm ${t2}`}>Up to</span>
                              <input
                                type="number" min={1} max={10} value={g.maxSelect ?? 2}
                                onChange={e => updateGroup(g.id, { maxSelect: Math.max(1, Number(e.target.value) || 1) })}
                                className={`w-16 border rounded-md px-2 h-9 text-sm tabular-nums focus:outline-none focus:border-brand-400 ${inputCls}`}
                              />
                            </label>
                          )}
                        </div>

                        <div className="space-y-2">
                          {g.choices.map((c, ci) => (
                            <div key={c.id} className="flex items-end gap-2">
                              <label className="flex-1 block">
                                {ci === 0 && <span className={`text-xs block mb-1 font-medium ${t2}`}>Choice</span>}
                                <input
                                  type="text" placeholder="e.g. Large" value={c.name}
                                  onChange={e => updateChoice(g.id, c.id, { name: e.target.value })}
                                  className={`w-full border rounded-md px-3 h-11 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
                                />
                              </label>
                              <label className="w-32 block">
                                {ci === 0 && <span className={`text-xs block mb-1 font-medium ${t2}`}>Extra price</span>}
                                <MoneyDeltaInput
                                  value={c.priceDelta}
                                  onChange={n => updateChoice(g.id, c.id, { priceDelta: n })}
                                  className={`w-full border rounded-md px-2 h-11 text-sm tabular-nums focus:outline-none focus:border-brand-400 ${inputCls}`}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => setDefaultChoice(g, c.id)}
                                aria-pressed={!!c.isDefault}
                                title="Selected by default at the till"
                                className={`px-3 h-11 rounded-md border text-xs font-semibold cursor-pointer ${
                                  c.isDefault
                                    ? 'border-brand-600 bg-brand-50 text-brand-700 dark:border-brand-400 dark:bg-brand-500/15 dark:text-brand-200'
                                    : dm ? 'border-ink-700 text-ink-400 hover:bg-ink-800' : 'border-ink-200 text-ink-500 hover:bg-ink-100'
                                }`}
                              >
                                Default
                              </button>
                              <button
                                type="button"
                                onClick={() => removeChoice(g.id, c.id)}
                                aria-label={`Remove choice ${c.name || ci + 1}`}
                                disabled={g.choices.length <= 1}
                                className="w-11 h-11 flex items-center justify-center rounded-md text-ink-400 hover:text-chili-600 hover:bg-chili-50 dark:hover:bg-chili-500/10 disabled:opacity-30 cursor-pointer"
                              >
                                <X size={15} />
                              </button>
                            </div>
                          ))}
                          <button
                            type="button"
                            onClick={() => addChoice(g.id)}
                            className={`text-sm font-semibold flex items-center gap-1.5 h-9 px-1 cursor-pointer ${dm ? 'text-brand-300' : 'text-brand-700'}`}
                          >
                            <Plus size={15} /> Add choice
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Track Inventory Toggle (Default OFF) */}
              <div className={`border rounded-xl p-3 ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className={`text-sm font-medium ${t1}`}>Track Inventory</p>
                    <p className={`text-xs ${t2}`}>Monitor stock levels for this item</p>
                  </div>
                  <Toggle darkMode={darkMode} checked={newTrackInventory} onChange={() => setNewTrackInventory(!newTrackInventory)} />
                </div>
                
                {newTrackInventory && (
                  <div className={`grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-dashed ${dm ? 'border-ink-600' : 'border-ink-300'}`}>
                    {!editingId && (
                      <div>
                        <label className={`text-xs block mb-1 ${t2}`}>Initial Stock *</label>
                        <input type="number" min={0} value={newStock} onChange={e => setNewStock(e.target.value)} placeholder="50"
                          className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`} />
                      </div>
                    )}
                    <div>
                      <label className={`text-xs block mb-1 ${t2}`}>Low Stock Alert</label>
                      <input type="number" min={1} value={newThreshold} onChange={e => setNewThreshold(e.target.value)} placeholder="10"
                        className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`} />
                    </div>
                  </div>
                )}
              </div>

              {/* Allow Discounts Toggle (Default OFF) */}
              <div className={`flex items-center justify-between border rounded-xl p-3 ${dm ? 'border-ink-700' : 'border-ink-200'}`}>
                <div>
                  <p className={`text-sm font-medium ${t1}`}>Allow Discounts</p>
                  <p className={`text-xs ${t2}`}>Item eligible for manual and promo discounts</p>
                </div>
                <Toggle darkMode={darkMode} checked={newAllowDiscount} onChange={() => setNewAllowDiscount(!newAllowDiscount)} />
              </div>
            </div>
          </div>

          <div className={`mt-6 pt-4 border-t flex justify-end ${dm ? 'border-ink-700' : 'border-ink-100'}`}>
            <button
              disabled={!newName.trim() || !newPrice || (!editingId && newTrackInventory && !newStock)}
              onClick={saveProduct}
              className="w-full md:w-auto px-6 bg-brand-600 text-white rounded-xl py-2.5 hover:bg-brand-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed font-semibold"
            >
              {editingId ? 'Save Changes' : 'Add Product'}
            </button>
          </div>
        </Modal>
      )}

      {/* Quick Add Category Modal */}
      {showQuickCategoryModal && (
        <Modal
          title="Add New Category"
          onClose={() => { setShowQuickCategoryModal(false); setQuickCategoryName(''); }}
          darkMode={dm}
        >
          <div className="space-y-4">
            <div>
              <label className={`block text-xs font-medium mb-1 ${t2}`}>Category Name *</label>
              <input
                type="text"
                autoFocus
                placeholder="e.g. Pastry & Bakery"
                value={quickCategoryName}
                onChange={e => setQuickCategoryName(e.target.value)}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand-400 ${inputCls}`}
              />
            </div>
            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => { setShowQuickCategoryModal(false); setQuickCategoryName(''); }}
                className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${dm ? 'text-ink-300 hover:bg-ink-700' : 'text-ink-600 hover:bg-ink-100'}`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!quickCategoryName.trim()}
                onClick={() => {
                  const trimmed = quickCategoryName.trim();
                  if (!trimmed) return;
                  const newCatObj: Category = {
                    id: 'cat-' + Date.now().toString(),
                    name: trimmed,
                    isTaxable: true,
                    isDiscountable: true,
                  };
                  if (setCategories) {
                    setCategories(prev => [...prev, newCatObj]);
                  }
                  setNewCat(trimmed);
                  setShowQuickCategoryModal(false);
                  setQuickCategoryName('');
                }}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors"
              >
                Create Category
              </button>
            </div>
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

function Toggle({ checked, onChange, darkMode }: { checked: boolean; onChange: () => void; darkMode: boolean }) {
  return (
    <button onClick={onChange} style={{ width: 40, height: 22, position: 'relative', flexShrink: 0 }}
      className={`rounded-full transition-colors ${checked ? 'bg-brand-600' : (darkMode ? 'bg-ink-600' : 'bg-ink-300')}`}>
      <span style={{ position: 'absolute', width: 18, height: 18, top: 2, left: 2, backgroundColor: 'white', borderRadius: '50%', boxShadow: '0 1px 3px rgba(0,0,0,0.15)', transform: checked ? 'translateX(18px)' : 'translateX(0)', transition: 'transform 0.2s' }} />
    </button>
  );
}

/**
 * Money field that accepts 0 and negative amounts. The old field wrote `value || ''`,
 * so a 0 looked empty, and it stripped the minus sign, so a cheaper choice was impossible.
 */
function MoneyDeltaInput({ value, onChange, className }: { value: number; onChange: (n: number) => void; className?: string }) {
  const [text, setText] = useState<string>(() => String(value ?? 0));

  useEffect(() => {
    if (Number(text.replace(/[^0-9-]/g, '')) !== value) setText(String(value ?? 0));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const commit = (raw: string) => {
    const cleaned = raw.replace(/[^0-9-]/g, '');
    const negative = cleaned.startsWith('-');
    const digits = cleaned.replace(/-/g, '');
    setText((negative ? '-' : '') + digits);
    onChange(digits === '' ? 0 : Number(negative ? `-${digits}` : digits));
  };

  const display = (() => {
    if (text === '' || text === '-') return text;
    const n = Number(text);
    return Number.isFinite(n) ? (n < 0 ? `-${formatNumberWithDots(Math.abs(n))}` : formatNumberWithDots(n)) : text;
  })();

  return (
    <input
      type="text"
      inputMode="numeric"
      value={display}
      onChange={e => commit(e.target.value)}
      onBlur={() => setText(String(value ?? 0))}
      placeholder="0"
      className={className}
    />
  );
}

function Modal({ title, children, onClose, darkMode, maxWidth = "max-w-sm" }: { title: string; children: React.ReactNode; onClose: () => void; darkMode: boolean; maxWidth?: string; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className={`relative rounded-2xl p-5 w-full ${maxWidth} max-h-[90vh] overflow-y-auto shadow-2xl ${darkMode ? 'bg-ink-800 border border-ink-700' : 'bg-white'}`}>
        <button onClick={onClose} className={`absolute top-4 right-4 transition-colors ${darkMode ? 'text-ink-400 hover:text-ink-200' : 'text-ink-400 hover:text-ink-600'}`}>
          <X size={18} />
        </button>
        <h3 className={`mb-4 font-semibold ${darkMode ? 'text-ink-100' : 'text-ink-800'}`}>{title}</h3>
        {children}
      </div>
    </div>
  );
}
