import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, Plus, Trash2, RefreshCw, Pencil, Check, X, Download, Pill, Wind, Activity, Droplet, Apple, Bandage, Eye, Smile, Heart, Baby, Syringe, Stethoscope, Sparkles, Package } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

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
  'Cold & Allergy': '#3B82F6',
  'Digestion & Nausea': '#ffa726',
  'Skin & Dermatology': '#ab47bc',
  'Vitamins & Nutrition': '#66bb6a',
  'First Aid & Wound Care': '#ff7043',
  'Eye & Ear Care': '#4db6ac',
  'Oral Care': '#26a69a',
  'Feminine Care': '#ec407a',
  'Baby & Child Care': '#f06292',
  'Cardiovascular & BP': '#e53935',
  'Diabetes Care': '#3B82F6',
  'Antibiotics': '#ab47bc',
  'Medical Devices': '#78909c',
  'Personal Hygiene': '#9ccc65',
  'General/Other': '#90a4ae',
  'Tablet': '#ab47bc',
  'Liquid/Syrup': '#4db6ac',
  'Capsule': '#ab47bc',
  'Cream/Ointment': '#ffa726',
  'Gummies': '#66bb6a',
  'Drops': '#3B82F6',
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
  if (stock > 10) return { label: 'In Stock', cls: 'bg-[#052E16] text-[#22C55E] border-[#166534]' };
  if (stock > 0) return { label: 'Low', cls: 'bg-[#451A03] text-[#FB923C] border-[#92400E]' };
  return { label: 'Out', cls: 'bg-[#1A0000] text-[#EF4444] border-[#991B1B]' };
}

const EMPTY_FORM = { product_name: '', batch_number: '', expiry_date: '', category: 'Pain & Fever', stock: 0 };

export function LiveInventory() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
    const timer = setInterval(fetchInventory, 30_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (selectedCategory) {
      const updated = categories.find((c) => c.name === selectedCategory.name);
      if (updated) setSelectedCategory(updated);
    }
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

  const handleDelete = async (docId: string) => {
    if (!confirm('Delete this product from inventory?')) return;
    await authenticatedFetch(`/api/inventory/${docId}`, { method: 'DELETE' });
    await fetchInventory();
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
      <div className="flex items-center justify-between p-4 absolute top-0 w-full z-20">
        <div className="flex items-center">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 glass-card rounded-3xl shadow-lg flex items-center justify-center text-[#00695c] hover:shadow-xl hover:scale-110 transition-all duration-300 group animate-glow">
              <Menu className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col pt-16 px-8 pb-12 max-w-7xl mx-auto w-full">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold text-[#3B82F6] tracking-tight" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.5px' }}>Live Inventory</h1>
            <p className="text-[#A1A1AA] font-normal mt-2 text-base" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Real-time stock across all categories · auto-refreshes every 30s</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchInventory} className="flex items-center gap-2 btn-secondary px-5 py-2.5 rounded-lg font-medium text-sm">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
            <button
              onClick={() => downloadCSV(categories.flatMap(c => c.items), 'live_inventory_full')}
              className="flex items-center gap-2 btn-secondary px-5 py-2.5 rounded-lg font-medium text-sm"
              title="Download Full Inventory as CSV"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 btn-primary px-5 py-2.5 rounded-lg font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="glass-card rounded-[12px] p-8 shadow-2xl mb-10">
            <h2 className="text-[20px] font-medium text-[#F4F4F5] mb-6" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Add New Product</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: 'Product Name', key: 'product_name', type: 'text', placeholder: 'e.g. Paracetamol 500mg' },
                { label: 'Batch Number', key: 'batch_number', type: 'text', placeholder: 'e.g. BT2026001' },
                { label: 'Expiry Date', key: 'expiry_date', type: 'date', placeholder: '' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-[12px] font-medium text-[#A1A1AA] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{label}</label>
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

        {loading && <p className="text-center text-[#A1A1AA] font-medium text-base py-16" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Loading inventory…</p>}

        {/* Category grid */}
        {!loading && !selectedCategory && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.length === 0 && (
              <p className="col-span-3 text-center text-[#71717A] py-16 text-base" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No inventory items found. Add your first product above.</p>
            )}
            {categories.map((cat) => {
              const color = CAT_COLORS[cat.name] ?? CAT_COLORS['Other'];
              const icon = CAT_ICONS[cat.name] ?? CAT_ICONS['Other'];
              const totalStock = cat.items.reduce((s, i) => s + i.stock, 0);
              return (
                <div key={cat.name} className="flex flex-col gap-4 group">
                  <div className="glass-card rounded-[12px] p-8 shadow-xl flex flex-col items-center justify-center min-h-[200px] hover:bg-[#111113] transition-all cursor-pointer" onClick={() => setSelectedCategory(cat)}>
                    <div className="mb-4 text-[#3B82F6]">{icon}</div>
                    <h2 className="text-xl font-medium text-[#F4F4F5] mb-2" style={{ fontFamily: 'DM Sans, sans-serif' }}>{cat.name}</h2>
                    <p className="text-sm font-normal text-[#A1A1AA]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{cat.items.length} item(s)</p>
                    <p className="text-xs text-[#71717A] mt-1 font-normal" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{totalStock} units total</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Category detail */}
        {!loading && selectedCategory && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setSelectedCategory(null)} className="bg-[#3B82F6] hover:bg-[#2563EB] text-white px-6 py-2.5 rounded-full font-medium text-sm transition-all mb-8 shadow-lg shadow-[#3B82F6]/30 hover:shadow-xl inline-block hover:scale-[1.02]">
              ← Back to Categories
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-[#3B82F6]">{CAT_ICONS[selectedCategory.name] ?? CAT_ICONS['Other']}</span>
                <h2 className="text-3xl font-bold text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{selectedCategory.name}</h2>
                <span className="text-sm text-[#71717A] font-medium" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{selectedCategory.items.length} item(s)</span>
              </div>
              <button
                onClick={() => downloadCSV(selectedCategory.items, `inventory_${selectedCategory.name.toLowerCase().replace(/ /g, '_')}`)}
                className="flex items-center gap-2 bg-[#3B82F6] hover:bg-[#2563EB] text-white px-5 py-2.5 rounded-lg font-medium shadow-lg shadow-[#3B82F6]/30 transition-all hover:scale-[1.02]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                <Download className="w-4 h-4" /> Download Sheet
              </button>
            </div>
            <div className="glass-card rounded-[12px] shadow-2xl overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#27272A] bg-[#111113]">
                    <th className="px-6 py-5 text-xs font-bold text-[#A1A1AA] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Status</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#A1A1AA] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Product</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#A1A1AA] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch #</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#A1A1AA] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Expiry</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#A1A1AA] uppercase tracking-wider text-center" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Stock</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#A1A1AA] uppercase tracking-wider text-center" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#27272A]">
                  {selectedCategory.items.map((item) => {
                    const { label, cls } = getStatusBadge(item.stock);
                    const isEditing = item.doc_id in editingStock;
                    return (
                      <tr key={item.doc_id} className="hover:bg-[#111113] transition-colors">
                        <td className="px-6 py-5"><span className={`text-xs font-bold px-3 py-1 rounded-xl border ${cls}`}>{label}</span></td>
                        <td className="px-6 py-5 font-semibold text-[#F4F4F5]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</td>
                        <td className="px-6 py-5 font-medium text-[#A1A1AA]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.batch_number}</td>
                        <td className="px-6 py-5 font-medium text-[#A1A1AA]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.expiry_date}</td>
                        <td className="px-6 py-5 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={editingStock[item.doc_id]}
                                onChange={(e) => setEditingStock((p) => ({ ...p, [item.doc_id]: parseInt(e.target.value) || 0 }))}
                                className="w-20 text-center border-2 border-[#3B82F6] bg-[#18181B] text-[#F4F4F5] rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                              />
                              <button onClick={() => handleStockSave(item.doc_id)} disabled={savingStock === item.doc_id} className="w-7 h-7 flex items-center justify-center bg-[#052E16] hover:bg-[#166534] text-[#22C55E] rounded-lg transition-colors">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingStock((p) => { const n = { ...p }; delete n[item.doc_id]; return n; })} className="w-7 h-7 flex items-center justify-center bg-[#18181B] hover:bg-[#27272A] text-[#71717A] rounded-lg transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-[#F4F4F5] bg-[#18181B] px-3 py-1.5 rounded-lg" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.stock}</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingStock((p) => ({ ...p, [item.doc_id]: item.stock }))}
                              className="w-8 h-8 flex items-center justify-center text-[#71717A] hover:bg-[#0C1A2E] hover:text-[#3B82F6] rounded-lg transition-colors"
                              title="Edit stock"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleCategoryChange(item.doc_id, e.target.value);
                                e.target.value = "";
                              }}
                              className="text-xs bg-[#18181B] border border-[#3B82F6] rounded-lg px-2 py-1.5 outline-none focus:border-[#60A5FA] cursor-pointer text-[#F4F4F5] hover:bg-[#1F1F23] transition-colors"
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
                              className="w-8 h-8 flex items-center justify-center text-[#71717A] hover:bg-[#1A0000] hover:text-[#EF4444] rounded-lg transition-colors"
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
    </div>
  );
}
