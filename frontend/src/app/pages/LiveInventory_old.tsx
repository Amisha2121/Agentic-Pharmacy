import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, Plus, Trash2, RefreshCw, Pencil, Check, X, Download } from 'lucide-react';

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
  'Pain & Fever': '#ef4444',
  'Cold & Allergy': '#3b82f6',
  'Digestion & Nausea': '#eab308',
  'Skin & Dermatology': '#8b5cf6',
  'Vitamins & Nutrition': '#10b981',
  'First Aid & Wound Care': '#f97316',
  'Eye & Ear Care': '#06b6d4',
  'Oral Care': '#14b8a6',
  'Feminine Care': '#ec4899',
  'Baby & Child Care': '#f43f5e',
  'Cardiovascular & BP': '#dc2626',
  'Diabetes Care': '#0ea5e9',
  'Antibiotics': '#6366f1',
  'Medical Devices': '#64748b',
  'Personal Hygiene': '#84cc16',
  'General/Other': '#94a3b8',
  'Tablet': '#6366f1', // Keep fallbacks for old items
  'Liquid/Syrup': '#06b6d4',
  'Capsule': '#8b5cf6',
  'Cream/Ointment': '#f59e0b',
  'Gummies': '#10b981',
  'Drops': '#3b82f6',
  'Spray': '#f97316',
  'Other': '#64748b'
};

const CATEGORIES = [
  'Pain & Fever', 'Cold & Allergy', 'Digestion & Nausea', 'Skin & Dermatology',
  'Vitamins & Nutrition', 'First Aid & Wound Care', 'Eye & Ear Care', 'Oral Care',
  'Feminine Care', 'Baby & Child Care', 'Cardiovascular & BP', 'Diabetes Care',
  'Antibiotics', 'Medical Devices', 'Personal Hygiene', 'General/Other'
];

function getStatusBadge(stock: number) {
  if (stock > 10) return { label: 'In Stock', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  if (stock > 0) return { label: 'Low', cls: 'bg-yellow-50 text-yellow-700 border-yellow-200' };
  return { label: 'Out', cls: 'bg-rose-50 text-rose-700 border-rose-200' };
}

const EMPTY_FORM = { product_name: '', batch_number: '', expiry_date: '', category: 'Pain & Fever', stock: 0 };

export function LiveInventory() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [loading, setLoading] = useState(true);

  // Add item form
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [addLoading, setAddLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Inline stock editing
  const [editingStock, setEditingStock] = useState<Record<string, number>>({});
  const [savingStock, setSavingStock] = useState<string | null>(null);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/inventory');
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
      await fetch('/api/inventory', {
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
    await fetch(`/api/inventory/${docId}`, { method: 'DELETE' });
    await fetchInventory();
  };

  const handleStockSave = async (docId: string) => {
    const newStock = editingStock[docId];
    if (newStock === undefined || newStock < 0) return;
    setSavingStock(docId);
    try {
      await fetch(`/api/inventory/${docId}/stock`, {
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
      await fetch(`/api/inventory/${docId}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_category: newCategory }),
      });
      if (selectedCategory) {
          // If we move away from the current category, we can refresh the view. 
          await fetchInventory();
          setSelectedCategory(prev => prev ? categories.find(c => c.name === prev.name) || null : null);
      } else {
          await fetchInventory();
      }
    } catch (e) {
      console.error("Failed to move category", e);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto bg-transparent scrollbar-hide">
      <div className="flex items-center justify-between p-4 bg-transparent absolute top-0 w-full z-20">
        <div className="flex items-center">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 flex items-center justify-center text-[#1E4A4C] hover:bg-white hover:shadow-md transition-all duration-300 group">
              <Menu className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col pt-16 px-8 pb-12 max-w-6xl mx-auto w-full">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-extrabold text-[#1E4A4C] tracking-tight">Live Inventory</h1>
            <p className="text-[#2B5B5C]/70 font-medium mt-1">Real-time stock across all categories · auto-refreshes every 30s</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={fetchInventory} className="flex items-center gap-2 bg-white/80 border border-gray-200 text-[#1E4A4C] px-5 py-2.5 rounded-xl font-semibold shadow-sm hover:bg-white transition-all hidden sm:flex">
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={() => downloadCSV(categories.flatMap(c => c.items), 'live_inventory_full')}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-all hover:scale-[1.02]"
              title="Download Full Inventory as CSV"
            >
              <Download className="w-4 h-4" /> <span className="hidden sm:inline">Export</span>
            </button>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="flex items-center gap-2 bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-all hover:scale-[1.02]"
            >
              <Plus className="w-4 h-4" /> Add Item
            </button>
          </div>
        </div>

        {/* Add Item Form */}
        {showAddForm && (
          <div className="bg-white/90 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white/50 mb-8">
            <h2 className="text-xl font-bold text-[#1E4A4C] mb-6">Add New Product</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[
                { label: 'Product Name', key: 'product_name', type: 'text', placeholder: 'e.g. Paracetamol 500mg' },
                { label: 'Batch Number', key: 'batch_number', type: 'text', placeholder: 'e.g. BT2026001' },
                { label: 'Expiry Date', key: 'expiry_date', type: 'date', placeholder: '' },
              ].map(({ label, key, type, placeholder }) => (
                <div key={key}>
                  <label className="block text-sm font-semibold text-[#1E4A4C] mb-2">{label}</label>
                  <input
                    type={type}
                    value={(form as Record<string, string | number>)[key] as string}
                    onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                    placeholder={placeholder}
                    className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 shadow-sm"
                  />
                </div>
              ))}
              <div>
                <label className="block text-sm font-semibold text-[#1E4A4C] mb-2">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 shadow-sm"
                >
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#1E4A4C] mb-2">Initial Stock</label>
                <input
                  type="number"
                  min={0}
                  value={form.stock}
                  onChange={(e) => setForm((p) => ({ ...p, stock: parseInt(e.target.value) || 0 }))}
                  className="w-full bg-white border border-gray-200 rounded-2xl px-4 py-3 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 shadow-sm"
                />
              </div>
            </div>
            {formError && <p className="mt-4 text-sm text-rose-600 font-medium">{formError}</p>}
            <div className="mt-6 flex gap-3">
              <button
                onClick={handleAddItem}
                disabled={addLoading}
                className="bg-[#1E4A4C] hover:bg-[#2B5B5C] disabled:opacity-60 text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02]"
              >
                {addLoading ? 'Saving…' : 'Save Product'}
              </button>
              <button
                onClick={() => { setShowAddForm(false); setForm(EMPTY_FORM); setFormError(''); }}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-8 py-3 rounded-2xl font-semibold transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading && <p className="text-center text-[#1E4A4C] font-semibold py-12">Loading inventory…</p>}

        {/* Category grid */}
        {!loading && !selectedCategory && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.length === 0 && (
              <p className="col-span-3 text-center text-gray-500 py-12">No inventory items found. Add your first product above.</p>
            )}
            {categories.map((cat) => {
              const color = CAT_COLORS[cat.name] ?? CAT_COLORS['Other'];
              const totalStock = cat.items.reduce((s, i) => s + i.stock, 0);
              return (
                <div key={cat.name} className="flex flex-col gap-4">
                  <div className="bg-white rounded-[2rem] p-8 shadow-sm flex flex-col items-center justify-center min-h-[200px] border border-gray-100" style={{ borderTop: `4px solid ${color}` }}>
                    <div className="text-4xl mb-4" style={{ color }}>📦</div>
                    <h2 className="text-xl font-bold text-gray-900 mb-1">{cat.name}</h2>
                    <p className="text-sm font-medium text-gray-500">{cat.items.length} item(s)</p>
                    <p className="text-xs text-gray-400 mt-1">{totalStock} units total</p>
                  </div>
                  <button onClick={() => setSelectedCategory(cat)} className="w-full bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white rounded-[2rem] py-4 font-semibold transition-all duration-300 shadow-lg hover:scale-[1.01]">
                    Open {cat.name}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Category detail */}
        {!loading && selectedCategory && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <button onClick={() => setSelectedCategory(null)} className="bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-6 py-2.5 rounded-full font-medium text-sm transition-all mb-8 shadow-md hover:shadow-lg inline-block hover:scale-[1.02]">
              ← Back to Categories
            </button>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
              <div className="flex items-center gap-3">
                <span className="text-3xl">📦</span>
                <h2 className="text-3xl font-bold text-[#1E4A4C]">{selectedCategory.name}</h2>
                <span className="text-sm text-gray-500 font-medium">{selectedCategory.items.length} item(s)</span>
              </div>
              <button
                onClick={() => downloadCSV(selectedCategory.items, `inventory_${selectedCategory.name.toLowerCase().replace(/ /g, '_')}`)}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-all hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" /> Download Sheet
              </button>
            </div>
            <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-lg border border-white/50 overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200/50 bg-white/40">
                    <th className="px-6 py-5 text-xs font-bold text-[#1E4A4C] uppercase tracking-wider">Status</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#1E4A4C] uppercase tracking-wider">Product</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#1E4A4C] uppercase tracking-wider">Batch #</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#1E4A4C] uppercase tracking-wider">Expiry</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#1E4A4C] uppercase tracking-wider text-center">Stock</th>
                    <th className="px-6 py-5 text-xs font-bold text-[#1E4A4C] uppercase tracking-wider text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200/50">
                  {selectedCategory.items.map((item) => {
                    const { label, cls } = getStatusBadge(item.stock);
                    const isEditing = item.doc_id in editingStock;
                    return (
                      <tr key={item.doc_id} className="hover:bg-white/60 transition-colors">
                        <td className="px-6 py-5"><span className={`text-xs font-bold px-3 py-1 rounded-lg border ${cls}`}>{label}</span></td>
                        <td className="px-6 py-5 font-semibold text-gray-900">{item.product_name}</td>
                        <td className="px-6 py-5 font-medium text-gray-600">{item.batch_number}</td>
                        <td className="px-6 py-5 font-medium text-gray-600">{item.expiry_date}</td>
                        <td className="px-6 py-5 text-center">
                          {isEditing ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min={0}
                                value={editingStock[item.doc_id]}
                                onChange={(e) => setEditingStock((p) => ({ ...p, [item.doc_id]: parseInt(e.target.value) || 0 }))}
                                className="w-20 text-center border border-[#1E4A4C]/30 rounded-lg px-2 py-1 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30"
                              />
                              <button onClick={() => handleStockSave(item.doc_id)} disabled={savingStock === item.doc_id} className="w-7 h-7 flex items-center justify-center bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded-lg transition-colors">
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditingStock((p) => { const n = { ...p }; delete n[item.doc_id]; return n; })} className="w-7 h-7 flex items-center justify-center bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-lg transition-colors">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-sm font-bold text-gray-900 bg-gray-100/50 px-3 py-1.5 rounded-lg">{item.stock}</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => setEditingStock((p) => ({ ...p, [item.doc_id]: item.stock }))}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-[#1E4A4C]/10 hover:text-[#1E4A4C] rounded-lg transition-colors"
                              title="Edit stock"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <select
                              onChange={(e) => {
                                if (e.target.value) handleCategoryChange(item.doc_id, e.target.value);
                                e.target.value = "";
                              }}
                              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 outline-none focus:border-[#1E4A4C] cursor-pointer text-gray-600 hover:bg-white transition-colors"
                              title="Move to another category"
                            >
                              <option value="" disabled selected>Move to...</option>
                              {CATEGORIES.map((c) => (
                                <option key={c} value={c}>{c}</option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleDelete(item.doc_id)}
                              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:bg-rose-50 hover:text-rose-500 rounded-lg transition-colors"
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