import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, Plus, Trash2, RefreshCw, Pencil, Check, X, Download, Pill, Wind, Activity, Droplet, Apple, Bandage, Eye, Smile, Heart, Baby, Syringe, Stethoscope, Sparkles, Package, Search } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';
import { ConfirmModal } from '../components/ui/ConfirmModal';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

interface InventoryItem {
  doc_id: string;
  product_name: string;
  batch_number: string;
  category: string;
  expiry_date: string;
  stock: number;
}

interface Category {
  name: string;
  items: InventoryItem[];
}

const CAT_COLORS: Record<string, string> = {
  'Pain & Fever': '#ef5350',
  'Cold & Allergy': '#22C55E',
  'Digestion & Nausea': '#ffa726',
  'Skin & Dermatology': '#ab47bc',
  'Vitamins & Nutrition': '#66bb6a',
  'First Aid & Wound Care': '#ff7043',
  'Eye & Ear Care': '#4db6ac',
  'Oral Care': '#26a69a',
  'Feminine Care': '#ec407a',
  'Baby & Child Care': '#f06292',
  'Cardiovascular & BP': '#e53935',
  'Diabetes Care': '#22C55E',
  'Antibiotics': '#ab47bc',
  'Medical Devices': '#78909c',
  'Personal Hygiene': '#9ccc65',
  'General/Other': '#90a4ae',
  'Tablet': '#ab47bc',
  'Liquid/Syrup': '#4db6ac',
  'Capsule': '#ab47bc',
  'Cream/Ointment': '#ffa726',
  'Gummies': '#66bb6a',
  'Drops': '#22C55E',
  'Spray': '#ff7043',
  'Other': '#78909c'
};

const CAT_ICONS: Record<string, JSX.Element> = {
  'Pain & Fever': <Pill className="w-12 h-12" />,
  'Cold & Allergy': <Wind className="w-12 h-12" />,
  'Digestion & Nausea': <Activity className="w-12 h-12" />,
  'Skin & Dermatology': <Droplet className="w-12 h-12" />,
  'Vitamins & Nutrition': <Apple className="w-12 h-12" />,
  'First Aid & Wound Care': <Bandage className="w-12 h-12" />,
  'Eye & Ear Care': <Eye className="w-12 h-12" />,
  'Oral Care': <Smile className="w-12 h-12" />,
  'Feminine Care': <Heart className="w-12 h-12" />,
  'Baby & Child Care': <Baby className="w-12 h-12" />,
  'Cardiovascular & BP': <Heart className="w-12 h-12" />,
  'Diabetes Care': <Syringe className="w-12 h-12" />,
  'Antibiotics': <Pill className="w-12 h-12" />,
  'Medical Devices': <Stethoscope className="w-12 h-12" />,
  'Personal Hygiene': <Sparkles className="w-12 h-12" />,
  'General/Other': <Package className="w-12 h-12" />,
  'Tablet': <Pill className="w-12 h-12" />,
  'Liquid/Syrup': <Droplet className="w-12 h-12" />,
  'Capsule': <Pill className="w-12 h-12" />,
  'Cream/Ointment': <Droplet className="w-12 h-12" />,
  'Gummies': <Apple className="w-12 h-12" />,
  'Drops': <Droplet className="w-12 h-12" />,
  'Spray': <Wind className="w-12 h-12" />,
  'Other': <Package className="w-12 h-12" />
};

const CATEGORIES = [
  'Pain & Fever', 'Cold & Allergy', 'Digestion & Nausea', 'Skin & Dermatology',
  'Vitamins & Nutrition', 'First Aid & Wound Care', 'Eye & Ear Care', 'Oral Care',
  'Feminine Care', 'Baby & Child Care', 'Cardiovascular & BP', 'Diabetes Care',
  'Antibiotics', 'Medical Devices', 'Personal Hygiene', 'General/Other'
];

function getStatusBadge(stock: number) {
  if (stock > 10) return { label: 'In Stock', cls: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' };
  if (stock > 0) return { label: 'Low Stock', cls: 'bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]' };
  return { label: 'Out of Stock', cls: 'bg-[#FEE2E2] text-[#DC2626] border-[#FECACA]' };
}

function daysUntilExpiry(dateStr: string): number {
  const exp = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getExpiryStyle(dateStr: string): { color: string; label?: string } {
  const days = daysUntilExpiry(dateStr);
  if (days < 0) return { color: '#EF4444', label: 'Expired' };
  if (days <= 30) return { color: '#EF4444', label: `${days}d` };
  if (days <= 90) return { color: '#F59E0B', label: `${days}d` };
  return { color: '#71717A' };
}

const EMPTY_FORM = { product_name: '', batch_number: '', expiry_date: '', category: 'Pain & Fever', stock: 0 };

export function LiveInventory() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);
  const [search, setSearch] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCb, setConfirmCb] = useState<(() => void) | null>(null);
  const [sortKey, setSortKey] = useState<'name' | 'stock' | 'expiry'>('expiry');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Derived summary stats
  const allItems = categories.flatMap(c => c.items);
  const totalProducts = allItems.length;
  const lowStockCount = allItems.filter(i => i.stock > 0 && i.stock <= 10).length;
  const outOfStockCount = allItems.filter(i => i.stock === 0).length;
  const expiringSoonCount = allItems.filter(i => { const d = daysUntilExpiry(i.expiry_date); return d >= 0 && d <= 90; }).length;

  const toggleSort = (key: 'name' | 'stock' | 'expiry') => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortedItems = (items: InventoryItem[]) => [...items].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.product_name.localeCompare(b.product_name);
    else if (sortKey === 'stock') cmp = a.stock - b.stock;
    else if (sortKey === 'expiry') cmp = a.expiry_date.localeCompare(b.expiry_date);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const fetchInventory = useCallback(async () => {
    setLoading(true);
    setFetchError(false);
    try {
      const res = await authenticatedFetch('/api/inventory');
      const data = await res.json();
      const items: InventoryItem[] = data.items ?? [];
      const grouped: Record<string, InventoryItem[]> = {};
      for (const item of items) {
        const cat = item.category || 'Other';
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(item);
      }
      setCategories(Object.entries(grouped).map(([name, catItems]) => ({ name, items: catItems })));
    } catch {
      setCategories([]);
      setFetchError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInventory();
    const timer = setInterval(fetchInventory, 30_000);
    return () => clearInterval(timer);
  }, [fetchInventory]);

  useEffect(() => {
    if (selectedCategory) {
      const updated = categories.find((c) => c.name === selectedCategory.name);
      if (updated) setSelectedCategory(updated);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories]);

  const handleAddItem = async () => {
    if (!form.product_name || !form.batch_number || !form.expiry_date) {
      setFormError('Product name, batch number, and expiry date are required.');
      return;
    }
    setFormError('');
    setAddLoading(true);
    try {
      await authenticatedFetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      setForm(EMPTY_FORM);
      setShowAddForm(false);
      await fetchInventory();
    } catch {
      setFormError('Failed to add item. Try again.');
    } finally {
      setAddLoading(false);
    }
  };

  const askConfirm = () =>
    new Promise<boolean>(resolve => {
      setConfirmCb(() => () => { setConfirmOpen(false); resolve(true); });
      setConfirmOpen(true);
    });

  const handleDelete = async (docId: string) => {
    const ok = await askConfirm();
    if (!ok) return;
    try {
      await authenticatedFetch(`/api/inventory/${docId}`, { method: 'DELETE' });
      await fetchInventory();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete item. Please try again or contact support.');
    }
  };

  const handleStockSave = async (docId: string) => {
    const newStock = editingStock[docId];
    if (newStock === undefined || newStock < 0) return;
    setSavingStock(docId);
    try {
      await authenticatedFetch(`/api/inventory/${docId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_stock: newStock }),
      });
      setEditingStock((p) => { const n = { ...p }; delete n[docId]; return n; });
      await fetchInventory();
    } finally {
      setSavingStock(null);
    }
  };

  const downloadCSV = (dataItems: InventoryItem[], filename: string) => {
    if (dataItems.length === 0) return;
    const headers = ['Product Name', 'Category', 'Batch Number', 'Stock', 'Expiry Date'];
    const rows = dataItems.map(item => [
      `"${item.product_name}"`, 
      `"${item.category}"`, 
      `"${item.batch_number}"`, 
      item.stock, 
      `"${item.expiry_date}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCategoryChange = async (docId: string, newCategory: string) => {
    try {
      await authenticatedFetch(`/api/inventory/${docId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_category: newCategory }),
      });
      await fetchInventory();
      if (selectedCategory) {
        setSelectedCategory(prev => prev ? categories.find(c => c.name === prev.name) || null : null);
      }
    } catch (e) {
      console.error("Failed to move category", e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto scrollbar-hide">
      <div className="flex items-center justify-between p-3 sm:p-4 absolute top-0 w-full z-20">
        <div className="flex items-center">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white border-2 border-[#0F172A] text-[#0F172A] hover:bg-[#F0FDF4] transition-all"
            >
              <Menu className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col pt-14 sm:pt-16 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-[#0F172A] tracking-tight mb-1 sm:mb-2">
              Inventory
            </h1>
            <p className="text-xs sm:text-sm text-[#64748B]">
              Real-time stock · Auto-refreshes every 30s
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* View toggle */}
            {!selectedCategory && (
              <div className="flex items-center bg-white border border-gray-300 rounded-lg p-1 gap-1">
                <button
                  onClick={() => setViewMode('grid')}
                  title="Category grid view"
                  className={`px-3 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-medium rounded-lg transition-all ${
                    viewMode === 'grid' ? 'bg-[#16a34a] text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Grid
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  title="Flat list view"
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                    viewMode === 'list' ? 'bg-[#16a34a] text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  List
                </button>
              </div>
            )}
            <button 
              onClick={fetchInventory} 
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => downloadCSV(categories.flatMap(c => c.items), 'live_inventory_full')}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm flex items-center gap-2"
              title="Download Full Inventory as CSV"
            >
              <Download className="w-4 h-4" /> Export
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="bg-[#16a34a] text-white hover:bg-[#15803d] rounded-lg px-4 py-2 text-sm flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Search bar — shown when not drilled into a category */}
        {!selectedCategory && (
          <div className="relative mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search product name, batch number, or category…"
              className="w-full pl-11 pr-10 py-3 bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder-[#9CA3AF] text-sm focus:outline-none focus:border-[#22C55E] transition-colors"
              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#6B7280] transition-colors">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Summary stats bar — removed per user preference */}

        {/* Error banner */}
        {fetchError && !loading && (
          <div className="mb-6 flex items-center gap-3 px-5 py-3.5 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif', color: '#DC2626' }}>
            Could not load inventory —
            <button onClick={fetchInventory} className="underline font-semibold ml-1 hover:text-[#EF4444] transition-colors">try again</button>.
          </div>
        )}

        {/* Add Item Form */}
        {showAddForm && (
          <div className="glass-card rounded-[12px] p-8 shadow-2xl mb-10">
            <h2 className="text-[20px] font-medium text-[#111827] mb-6" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Add New Product</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: 'Product Name', key: 'product_name', type: 'text', placeholder: 'e.g. Paracetamol 500mg' },
                { label: 'Batch Number', key: 'batch_number', type: 'text', placeholder: 'e.g. BT2026001' },
                { label: 'Expiry Date', key: 'expiry_date', type: 'date', placeholder: '' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-[12px] font-medium text-[#6B7280] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, string | number>)[key] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="input-field"
                  />
                </div>
              ))}
              <div>
                <label className="block text-[12px] font-medium text-[#A1A1AA] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="input-field"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#A1A1AA] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Initial Stock</label>
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm((p) => ({ ...p, stock: parseInt(e.target.value) || 0 }))}
                  className="input-field"
                />
              </div>
            </div>
            {formError && <p className="mt-4 text-sm text-[#EF4444] font-medium" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{formError}</p>}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddItem}
                disabled={addLoading}
                className="btn-primary disabled:opacity-60 px-8"
              >
                {addLoading ? 'Saving…' : 'Save Product'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setFormError(''); }}
                className="btn-secondary px-8"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Skeleton loading grid */}
        {loading && !selectedCategory && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-[12px] p-8 min-h-[200px] flex flex-col items-center justify-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-full bg-[#E5E7EB]" />
                <div className="w-28 h-4 rounded-lg bg-[#E5E7EB]" />
                <div className="w-20 h-3 rounded-lg bg-[#F3F4F6]" />
              </div>
            ))}
          </div>
        )}

        {/* Category grid OR flat list */}
        {!loading && !selectedCategory && viewMode === 'list' && (
          <div className="glass-card rounded-[12px] shadow-2xl overflow-hidden mb-8">
            {/* List sort controls */}
            <div className="flex items-center gap-2 px-6 py-3 border-b border-[#E5E7EB] bg-white">
              <span className="text-xs text-[#9CA3AF] font-semibold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Sort:</span>
              {(['name', 'stock', 'expiry'] as const).map(k => (
                <button key={k} onClick={() => toggleSort(k)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    sortKey === k ? 'bg-[#ECFDF5] text-[#22C55E] border border-[#22C55E]/30' : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#111827]'
                  }`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {k.charAt(0).toUpperCase() + k.slice(1)} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              ))}
              <span className="ml-auto text-xs text-[#9CA3AF]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{allItems.length} product{allItems.length !== 1 ? 's' : ''}</span>
            </div>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  {['Status', 'Product', 'Category', 'Batch', 'Expiry', 'Stock'].map(h => (
                    <th key={h} className="px-5 py-4 text-xs font-bold text-[#9CA3AF] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {sortedItems(allItems).map(item => {
                  const { label, cls } = getStatusBadge(item.stock);
                  const expStyle = getExpiryStyle(item.expiry_date);
                  return (
                    <tr key={item.doc_id} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-5 py-3.5"><span className={`text-xs font-bold px-2.5 py-1 rounded-lg border ${cls}`}>{label}</span></td>
                      <td className="px-5 py-3.5 font-semibold text-[#111827] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-[#E5E7EB] text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                          {item.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-mono text-xs text-[#9CA3AF]">{item.batch_number}</td>
                      <td className="px-5 py-3.5">
                        <span style={{ color: expStyle.color, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13 }}>{item.expiry_date}</span>
                        {expStyle.label && (
                          <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: expStyle.color + '22', color: expStyle.color }}>{expStyle.label}</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm font-bold text-[#111827] bg-white border border-[#E5E7EB] px-2.5 py-1 rounded-lg" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.stock}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Category grid */}
        {!loading && !selectedCategory && viewMode === 'grid' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {search.trim() ? (
              // Flat search results across all categories
              (() => {
                const q = search.toLowerCase();
                const results = categories.flatMap(c => c.items).filter(item =>
                  item.product_name.toLowerCase().includes(q) ||
                  item.batch_number.toLowerCase().includes(q) ||
                  item.category.toLowerCase().includes(q)
                );
                if (!results.length) return (
                  <div className="col-span-3 flex flex-col items-center py-20 text-center">
                    <Package className="w-10 h-10 text-[#E5E7EB] mb-4" />
                    <p className="text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No results for <strong className="text-[#111827]">"{search}"</strong></p>
                  </div>
                );
                return results.map(item => {
                  const { label, cls } = getStatusBadge(item.stock);
                  return (
                    <div key={item.doc_id} className="glass-card rounded-[12px] p-5 shadow-xl flex flex-col gap-2 cursor-pointer hover:bg-[#F9FAFB] transition-all"
                      onClick={() => { const cat = categories.find(c => c.name === item.category); if (cat) setSelectedCategory(cat); }}>
                      <div className="flex items-center justify-between">
                        <span className={`text-xs font-bold px-2.5 py-1 rounded-xl border ${cls}`}>{label}</span>
                        <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.category}</span>
                      </div>
                      <p className="font-semibold text-[#111827] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</p>
                      <p className="text-xs text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch: {item.batch_number} · Exp: {item.expiry_date} · Stock: {item.stock}</p>
                    </div>
                  );
                });
              })()
            ) : (
              // Normal category cards
              <>
                {categories.length === 0 && (
                  <div className="col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-24 text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-[#16a34a] to-[#15803d] rounded-full flex items-center justify-center mb-6 border-2 border-[#0F172A] shadow-xl">
                      <Package className="w-12 h-12 text-white" strokeWidth={2.5} />
                    </div>
                    <h3 className="text-3xl font-black uppercase text-[#0F172A] mb-3 tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>
                      YOUR INVENTORY IS EMPTY
                    </h3>
                    <p className="text-[#64748B] max-w-md mx-auto mb-8 leading-relaxed font-medium" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Welcome to NovaMed! Start by adding your first product manually above, or head over to the chat to scan a medicine box.
                    </p>
                    <button 
                      onClick={() => setShowAddForm(true)} 
                      className="bg-[#16a34a] text-white hover:bg-[#15803d] px-8 py-3 text-sm font-black uppercase tracking-wide border-2 border-[#0F172A] flex items-center gap-2 shadow-lg transition-all hover:scale-105"
                      style={{ borderRadius: '999px' }}
                    >
                      <Plus className="w-5 h-5" strokeWidth={3} /> 
                      Add Your First Item
                    </button>
                  </div>
                )}
                {categories.map((cat) => {
                  const icon = CAT_ICONS[cat.name] ?? CAT_ICONS['Other'];
                  const totalStock = cat.items.reduce((s, i) => s + i.stock, 0);
                  const lowCount = cat.items.filter(i => i.stock > 0 && i.stock <= 10).length;
                  const outCount = cat.items.filter(i => i.stock === 0).length;
                  const expiringCount = cat.items.filter(i => { const d = daysUntilExpiry(i.expiry_date); return d >= 0 && d <= 90; }).length;
                  const healthPct = cat.items.length > 0
                    ? Math.round((cat.items.filter(i => i.stock > 10).length / cat.items.length) * 100)
                    : 100;
                  return (
                    <div key={cat.name} className="flex flex-col gap-4 group">
                      <div
                        className="glass-card rounded-[12px] p-6 shadow-xl flex flex-col min-h-[200px] hover:bg-[#F9FAFB] transition-all cursor-pointer"
                        onClick={() => setSelectedCategory(cat)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="text-[#22C55E]">{icon}</div>
                          <div className="flex gap-1.5 flex-wrap justify-end">
                            {outCount > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]">{outCount} out</span>
                            )}
                            {lowCount > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]">{lowCount} low</span>
                            )}
                            {expiringCount > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#FEF3C7] text-[#F59E0B] border border-[#FDE68A]">{expiringCount} exp</span>
                            )}
                          </div>
                        </div>
                        <h2 className="text-lg font-semibold text-[#111827] mb-1" style={{ fontFamily: 'DM Sans, sans-serif' }}>{cat.name}</h2>
                        <p className="text-sm text-[#6B7280] mb-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{cat.items.length} product{cat.items.length !== 1 ? 's' : ''} · {totalStock} units</p>
                        {/* Stock health bar */}
                        <div className="mt-auto">
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[10px] text-[#9CA3AF] uppercase tracking-wide font-semibold">Stock health</span>
                            <span className="text-[10px] font-bold" style={{ color: healthPct >= 70 ? '#22C55E' : healthPct >= 40 ? '#F59E0B' : '#EF4444' }}>{healthPct}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{ width: `${healthPct}%`, background: healthPct >= 70 ? '#22C55E' : healthPct >= 40 ? '#F59E0B' : '#EF4444' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Category detail */}
        {!loading && selectedCategory && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setSelectedCategory(null)} className="bg-[#22C55E] hover:bg-[#16A34A] text-white px-6 py-2.5 rounded-full font-medium text-sm transition-all mb-8 shadow-lg shadow-[#22C55E]/30 hover:shadow-xl inline-block hover:scale-[1.02]">
              ← Back to Categories
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-[#22C55E]">{CAT_ICONS[selectedCategory.name] ?? CAT_ICONS['Other']}</span>
                <h2 className="text-3xl font-bold text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{selectedCategory.name}</h2>
                <span className="text-sm text-[#6B7280] font-medium" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{selectedCategory.items.length} item(s)</span>
              </div>
              <button
                onClick={() => downloadCSV(selectedCategory.items, `inventory_${selectedCategory.name.toLowerCase().replace(/ /g, '_')}`)}
                className="flex items-center gap-2 bg-[#22C55E] hover:bg-[#16A34A] text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-[#22C55E]/30 transition-all hover:scale-[1.02]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                <Download className="w-4 h-4" /> Download Sheet
              </button>
            </div>
            {/* Sort controls */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs text-[#9CA3AF] font-semibold uppercase tracking-wide" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Sort by:</span>
              {(['name', 'stock', 'expiry'] as const).map(k => (
                <button
                  key={k}
                  onClick={() => toggleSort(k)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors ${
                    sortKey === k ? 'bg-[#ECFDF5] text-[#22C55E] border border-[#22C55E]/30' : 'bg-white text-[#6B7280] border border-[#E5E7EB] hover:text-[#111827]'
                  }`}
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  {k.charAt(0).toUpperCase() + k.slice(1)} {sortKey === k ? (sortDir === 'asc' ? '↑' : '↓') : ''}
                </button>
              ))}
            </div>

            <div className="glass-card rounded-[12px] shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-white">
                    <th className="px-6 py-5 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Status</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Product</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch #</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Expiry</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#6B7280] uppercase tracking-wider text-center" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Stock</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#6B7280] uppercase tracking-wider text-center" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {sortedItems(selectedCategory.items).map((item) => {
                    const { label, cls } = getStatusBadge(item.stock);
                    const expStyle = getExpiryStyle(item.expiry_date);
                    const isEditing = item.doc_id in editingStock;
                    return (
                      <tr key={item.doc_id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="px-6 py-4"><span className={`text-xs font-bold px-3 py-1 rounded-xl border ${cls}`}>{label}</span></td>
                        <td className="px-6 py-4 font-semibold text-[#111827]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</td>
                        <td className="px-6 py-4 font-mono text-sm text-[#6B7280]">{item.batch_number}</td>
                        <td className="px-6 py-4">
                          <span style={{ color: expStyle.color, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 500 }}>
                            {item.expiry_date}
                          </span>
                          {expStyle.label && (
                            <span className="ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: expStyle.color + '22', color: expStyle.color }}>
                              {expStyle.label}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => setEditingStock(p => ({ ...p, [item.doc_id]: Math.max(0, (p[item.doc_id] ?? 0) - 1) }))}
                                className="w-7 h-7 flex items-center justify-center bg-white hover:bg-[#F3F4F6] text-[#6B7280] rounded-lg border border-[#E5E7EB] transition-colors font-bold"
                              >−</button>
                              <input
                                type="number" min={0}
                                value={editingStock[item.doc_id]}
                                onChange={e => setEditingStock(p => ({ ...p, [item.doc_id]: parseInt(e.target.value) || 0 }))}
                                className="w-16 text-center border border-[#22C55E] bg-white text-[#111827] rounded-lg px-1 py-1 text-sm font-bold focus:outline-none"
                                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                              />
                              <button
                                onClick={() => setEditingStock(p => ({ ...p, [item.doc_id]: (p[item.doc_id] ?? 0) + 1 }))}
                                className="w-7 h-7 flex items-center justify-center bg-white hover:bg-[#F3F4F6] text-[#6B7280] rounded-lg border border-[#E5E7EB] transition-colors font-bold"
                              >+</button>
                              <button onClick={() => handleStockSave(item.doc_id)} disabled={savingStock === item.doc_id} className="w-7 h-7 flex items-center justify-center bg-[#ECFDF5] hover:bg-[#A7F3D0] text-[#059669] rounded-lg transition-colors ml-1">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingStock(p => { const n = { ...p }; delete n[item.doc_id]; return n; })} className="w-7 h-7 flex items-center justify-center bg-white hover:bg-[#F3F4F6] text-[#6B7280] rounded-lg transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-[#111827] bg-white border border-[#E5E7EB] px-3 py-1.5 rounded-lg" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.stock}</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingStock((p) => ({ ...p, [item.doc_id]: item.stock }))}
                              className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:bg-[#ECFDF5] hover:text-[#22C55E] rounded-lg transition-colors"
                              title="Edit stock"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleCategoryChange(item.doc_id, e.target.value);
                                e.target.value = "";
                              }}
                              className="text-xs bg-white border border-[#22C55E] rounded-lg px-2 py-1.5 outline-none focus:border-[#16A34A] cursor-pointer text-[#111827] hover:bg-[#F9FAFB] transition-colors"
                              style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                              title="Move to another category"
                            >
                              <option value="" disabled selected>Move to...</option>
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDelete(item.doc_id)}
                              className="w-8 h-8 flex items-center justify-center text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#DC2626] rounded-lg transition-colors"
                              title="Delete product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Confirm delete dialog */}
      <ConfirmModal
        open={confirmOpen}
        title="Delete Product"
        message="Remove this product from inventory? This action cannot be undone."
        confirmLabel="Delete"
        danger
        onConfirm={() => { confirmCb?.(); }}
        onCancel={() => { setConfirmOpen(false); }}
      />
    </div>
  );
}
