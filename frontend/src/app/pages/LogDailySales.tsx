import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, Plus, Minus, Search, Trash2, RefreshCw, ChevronDown } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

interface InventoryItem { doc_id: string; product_name: string; batch_number: string; stock: number; }
interface SaleLog { log_id: string; product_name: string; batch_number: string; qty_sold: number; logged_at: string; }

export function LogDailySales() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [addLoading, setAddLoading] = useState(false);
  const [recentItems, setRecentItems] = useState<InventoryItem[]>(() => {
    try { return JSON.parse(localStorage.getItem('pharma_recent_sales') ?? '[]'); } catch { return []; }
  });

  const [todayLog, setTodayLog] = useState<SaleLog[]>([]);
  const [logLoading, setLogLoading] = useState(true);

  const fetchInventory = async () => {
    try {
      const r = await authenticatedFetch('/api/inventory');
      const d = await r.json();
      setInventory(d.items ?? []);
    } catch { /* ignore */ }
  };

  const fetchTodayLog = async () => {
    setLogLoading(true);
    try {
      const r = await authenticatedFetch('/api/sales/today');
      const d = await r.json();
      setTodayLog(d.logs ?? []);
    } catch { /* ignore */ } finally { setLogLoading(false); }
  };

  useEffect(() => { fetchInventory(); fetchTodayLog(); }, []);

  const filtered = inventory.filter((i) =>
    i.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddSale = async () => {
    if (!selectedItem || quantity < 1) return;
    if (selectedItem.stock <= 0 || quantity > selectedItem.stock) return;
    setAddLoading(true);
    try {
      await authenticatedFetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batch_number: selectedItem.batch_number, product_name: selectedItem.product_name, qty_sold: quantity }) });
      // Persist to recent items
      setRecentItems(prev => {
        const next = [selectedItem, ...prev.filter(r => r.doc_id !== selectedItem!.doc_id)].slice(0, 4);
        localStorage.setItem('pharma_recent_sales', JSON.stringify(next));
        return next;
      });
      setSelectedItem(null); setSearchQuery(''); setQuantity(1);
      await fetchTodayLog();
      await fetchInventory();
    } catch { /* ignore */ } finally { setAddLoading(false); }
  };

  const exportTodayCSV = () => {
    if (!todayLog.length) return;
    const rows = [['Product', 'Batch', 'Qty Sold', 'Logged At'], ...todayLog.map(l => [l.product_name, l.batch_number, l.qty_sold, l.logged_at])];
    const csv = rows.map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `sales_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
  };

  const handleDelete = async (logId: string) => {
    try { await authenticatedFetch(`/api/sales/${logId}`, { method: 'DELETE' }); } catch { /* ignore */ }
    await fetchTodayLog();
  };

  const totalToday = todayLog.reduce((s, l) => s + l.qty_sold, 0);

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto scrollbar-hide bg-[#F8FAFC]">
      {/* Topbar */}
      <div className="flex items-center justify-between p-4 absolute top-0 w-full z-20">
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

      {/* Main Content */}
      <div className="flex-1 pt-14 sm:pt-16 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-[#0F172A] tracking-tight mb-1 sm:mb-2">
              Daily sales
            </h1>
            <p className="text-sm text-[#64748B] font-medium">
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4 sm:mt-0">
            <button 
              onClick={() => window.location.href = '/reports/sales-history'}
              className="px-5 py-2.5 text-sm font-bold text-[#0F172A] border-2 border-[#0F172A] bg-white hover:bg-[#F0FDF4] transition-all flex items-center gap-2"
              style={{ borderRadius: '999px' }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              View Sales History
            </button>
            <button 
              onClick={fetchTodayLog} 
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${logLoading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <button
              onClick={exportTodayCSV}
              disabled={todayLog.length === 0}
              className="bg-[#16a34a] text-white hover:bg-[#15803d] rounded-lg px-4 py-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            >
              Export CSV
            </button>
          </div>
        </div>
        
        {/* Add a Sale Card */}
        <div className="bg-white border-2 border-[#0F172A] rounded-3xl p-8 mb-8">
          <h2 className="text-xl font-black uppercase text-[#0F172A] mb-6 tracking-tight">
            Add a sale
          </h2>

          {/* Quick-select recent items */}
          {recentItems.length > 0 && !selectedItem && (
            <div className="mb-6">
              <p className="text-[10px] font-black text-[#94A3B8] uppercase tracking-widest mb-3">
                RECENT
              </p>
              <div className="flex flex-wrap gap-2">
                {recentItems.map(item => {
                  const live = inventory.find(i => i.doc_id === item.doc_id);
                  if (!live) return null; // Don't show if item no longer exists in inventory
                  const outOfStock = live.stock <= 0;
                  const soldToday = todayLog.filter(log => log.product_name === live.product_name).reduce((sum, log) => sum + log.qty_sold, 0);
                  return (
                    <button
                      key={live.doc_id}
                      disabled={outOfStock}
                      onClick={() => { if (!outOfStock) { setSelectedItem(live); setSearchQuery(live.product_name); setQuantity(1); } }}
                      className={`flex items-center gap-2 px-4 py-2 border-2 border-[#0F172A] text-xs font-bold transition-all ${
                        outOfStock
                          ? 'text-gray-400 cursor-not-allowed opacity-50 bg-gray-50'
                          : 'text-[#0F172A] hover:bg-[#F0FDF4] cursor-pointer bg-white'
                      }`}
                      style={{ borderRadius: '999px' }}
                    >
                      {live.product_name}
                      <span className={`text-xs font-black px-2 py-0.5 border border-[#0F172A] ${
                        outOfStock ? 'bg-red-100 text-red-600' : (soldToday > 0 ? 'bg-[#16a34a] text-white' : 'bg-white text-[#0F172A]')
                      }`} style={{ borderRadius: '999px' }}>
                        {outOfStock ? 'Out' : (soldToday > 0 ? `${soldToday} today` : `${live.stock}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex flex-col md:flex-row gap-4">
            {/* Search Medicine */}
            <div className="flex-1 relative">
              <label className="block text-[10px] font-black text-[#94A3B8] mb-2 uppercase tracking-widest">Search Medicine</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" strokeWidth={2.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(e.target.value.length > 0); setSelectedItem(null); }}
                  onFocus={() => setIsDropdownOpen(searchQuery.length > 0)}
                  placeholder="Type medicine name or batch number..."
                  className="w-full h-12 pl-12 pr-12 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-sm font-medium placeholder:text-[#94A3B8] focus:border-[#16a34a] focus:bg-white focus:outline-none transition-all"
                />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#94A3B8]" strokeWidth={2.5} />
              </div>
              {isDropdownOpen && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border-2 border-[#0F172A] overflow-hidden z-30 max-h-[300px] overflow-y-auto">
                  {filtered.slice(0, 8).map((item) => {
                    const outOfStock = item.stock <= 0;
                    return (
                      <button
                        key={item.doc_id}
                        disabled={outOfStock}
                        className={`w-full text-left px-5 py-4 transition-colors flex items-center justify-between border-b border-[#E2E8F0] last:border-0 ${
                          outOfStock
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-[#F0FDF4] cursor-pointer'
                        }`}
                        onClick={() => {
                          if (outOfStock) return;
                          setSelectedItem(item);
                          setSearchQuery(item.product_name);
                          setIsDropdownOpen(false);
                          setQuantity(1);
                        }}
                      >
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-[#0F172A] text-sm">{item.product_name}</span>
                          <span className="text-xs text-[#64748B] font-medium">Batch: {item.batch_number}</span>
                        </div>
                        <span className={`text-xs font-black px-3 py-1 border border-[#0F172A] ${
                          outOfStock
                            ? 'bg-red-100 text-red-600'
                            : 'bg-[#16a34a] text-white'
                        }`} style={{ borderRadius: '999px' }}>
                          {outOfStock ? 'Out' : `${item.stock}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quantity Sold */}
            <div className="w-full md:w-[320px]">
              <label className="block text-[10px] font-black text-[#94A3B8] mb-2 uppercase tracking-widest">Quantity Sold</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white border-2 border-[#0F172A] overflow-hidden flex-1" style={{ borderRadius: '999px', height: '48px' }}>
                  <button 
                    onClick={() => setQuantity(Math.max(1, quantity - 1))} 
                    className="w-12 h-full flex items-center justify-center text-[#0F172A] hover:bg-[#F0FDF4] transition-all"
                  >
                    <Minus className="w-5 h-5" strokeWidth={3} />
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={quantity}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d+$/.test(val)) {
                        const numVal = val === '' ? 0 : parseInt(val);
                        const maxStock = selectedItem?.stock ?? 9999;
                        setQuantity(Math.min(numVal, maxStock));
                      }
                    }}
                    onBlur={(e) => {
                      if (e.target.value === '' || parseInt(e.target.value) < 1) {
                        setQuantity(1);
                      }
                    }}
                    className="flex-1 text-center font-black text-[#0F172A] text-xl bg-transparent outline-none border-0 focus:ring-0"
                  />
                  <button
                    onClick={() => {
                      const maxStock = selectedItem?.stock ?? 9999;
                      setQuantity(Math.min(quantity + 1, maxStock));
                    }}
                    className="w-12 h-full flex items-center justify-center text-[#0F172A] hover:bg-[#F0FDF4] transition-all"
                  >
                    <Plus className="w-5 h-5" strokeWidth={3} />
                  </button>
                </div>
                <button
                  onClick={handleAddSale}
                  disabled={!selectedItem || addLoading || (selectedItem?.stock ?? 0) <= 0}
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white px-6 h-12 font-black uppercase text-sm tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  style={{ borderRadius: '999px' }}
                >
                  <Plus className="w-5 h-5" strokeWidth={3} /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Selected item preview */}
          {selectedItem && (
            <div className={`mt-6 flex items-center gap-4 px-5 py-4 rounded-2xl border-2 border-[#0F172A] ${
              selectedItem.stock <= 5
                ? 'bg-[#FEF3C7]'
                : 'bg-[#DBEAFE]'
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-[#0F172A] truncate">{selectedItem.product_name}</p>
                <p className="text-xs text-[#64748B] mt-1 font-medium">Batch: {selectedItem.batch_number}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-black ${
                  selectedItem.stock <= 5 ? 'text-[#D97706]' : 'text-[#2563EB]'
                }`}>{selectedItem.stock} in stock</p>
                {selectedItem.stock <= 10 && (
                  <p className="text-[10px] text-[#D97706] font-black mt-1 uppercase">Low stock</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's Log */}
        <div className="glass-card rounded-[12px] p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-medium text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Today's Log</h2>
              <span className="text-[13px] font-normal text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>· {new Date().toISOString().slice(0, 10)}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={exportTodayCSV} disabled={todayLog.length === 0} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm disabled:opacity-40 disabled:cursor-not-allowed">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Export
              </button>
              <button onClick={fetchTodayLog} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm">
                <RefreshCw className={`w-4 h-4 ${logLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E5E7EB]">
                  {['MEDICINE', 'BATCH #', 'QTY', 'LOGGED AT', 'DEL'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-medium text-[#6B7280] uppercase tracking-[0.8px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayLog.length === 0 && (
                  <tr><td colSpan={5} className="text-center py-14">
                    <div className="flex flex-col items-center gap-2">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E5E7EB" strokeWidth="1.5"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
                      <p className="text-[#9CA3AF] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No sales logged today</p>
                    </div>
                  </td></tr>
                )}
                {todayLog.map((log) => (
                  <tr key={log.log_id} className="border-b border-[#F3F4F6] hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-4 font-medium text-[#111827] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.product_name}</td>
                    <td className="px-4 py-4 font-mono text-xs text-[#6B7280]">{log.batch_number}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] text-xs font-bold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {log.qty_sold} units
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#9CA3AF] text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.logged_at}</td>
                    <td className="px-4 py-4">
                      <button onClick={() => handleDelete(log.log_id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B7280] hover:text-[#DC2626] hover:bg-[#FEE2E2] transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-5 pt-5 border-t border-[#E5E7EB] flex items-center justify-between">
            <span className="text-[13px] font-normal text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {todayLog.length} item(s)
            </span>
            <span className="text-[13px] font-medium text-[#111827]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              <span className="text-[#22C55E] font-semibold">{totalToday} total units</span> dispensed today
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
