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

  const [history, setHistory] = useState<Record<string, SaleLog[]>>({});
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [histLoading, setHistLoading] = useState(false);

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

  const fetchHistory = async () => {
    setHistLoading(true);
    try {
      const r = await authenticatedFetch('/api/sales/history');
      const d = await r.json();
      setHistory(d.history ?? {});
    } catch { /* ignore */ } finally { setHistLoading(false); }
  };

  useEffect(() => { fetchInventory(); fetchTodayLog(); fetchHistory(); }, []);

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

  const toggleDay = (date: string) => setExpandedDays((prev) => prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]);
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
      <div className="flex-1 pt-16 px-8 pb-12 max-w-7xl mx-auto w-full">
        
        {/* Header */}
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
              Daily sales
            </h1>
            <p className="text-sm text-[#64748B]">
              {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-3">
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
        <div className="bg-white border border-gray-300 rounded-lg p-5 mb-8">
          <h2 className="text-lg font-bold text-[#0F172A] mb-6">
            Add a sale
          </h2>

          {/* Quick-select recent items */}
          {recentItems.length > 0 && !selectedItem && (
            <div className="mb-6">
              <p className="text-xs font-semibold text-[#64748B] uppercase tracking-wide mb-3">
                RECENT
              </p>
              <div className="flex flex-wrap gap-2">
                {recentItems.map(item => {
                  const live = inventory.find(i => i.doc_id === item.doc_id);
                  const outOfStock = (live?.stock ?? 0) <= 0;
                  const soldToday = todayLog.filter(log => log.product_name === item.product_name).reduce((sum, log) => sum + log.qty_sold, 0);
                  return (
                    <button
                      key={item.doc_id}
                      disabled={outOfStock}
                      onClick={() => { if (!outOfStock && live) { setSelectedItem(live); setSearchQuery(live.product_name); setQuantity(1); } }}
                      className={`flex items-center gap-2 px-4 py-2 border text-xs font-semibold rounded-lg transition-all ${
                        outOfStock
                          ? 'border-gray-300 text-gray-400 cursor-not-allowed opacity-50'
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer'
                      }`}
                    >
                      {item.product_name}
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                        outOfStock ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-700'
                      }`}>{soldToday > 0 ? `${soldToday} today` : (outOfStock ? 'Out' : `${live?.stock}`)}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex gap-4">
            {/* Search Medicine */}
            <div className="flex-1 relative">
              <label className="block text-[12px] font-medium text-[#6B7280] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Search Medicine</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(e.target.value.length > 0); setSelectedItem(null); }}
                  onFocus={() => setIsDropdownOpen(searchQuery.length > 0)}
                  placeholder="Type medicine name or batch number..."
                  className="input-field pl-11 pr-10"
                />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
              </div>
              {isDropdownOpen && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-2xl border border-[#E5E7EB] overflow-hidden z-30 max-h-[300px] overflow-y-auto">
                  {filtered.slice(0, 8).map((item) => {
                    const outOfStock = item.stock <= 0;
                    return (
                      <button
                        key={item.doc_id}
                        disabled={outOfStock}
                        className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between border-b border-[#F3F4F6] last:border-0 ${
                          outOfStock
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-[#F9FAFB] cursor-pointer'
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
                          <span className="font-medium text-[#111827] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</span>
                          <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch: {item.batch_number}</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          outOfStock
                            ? 'bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA]'
                            : 'bg-[#DBEAFE] text-[#2563EB] border border-[#BFDBFE]'
                        }`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                          {outOfStock ? 'Out' : `${item.stock} units`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Quantity Sold */}
            <div className="w-[280px]">
              <label className="block text-[12px] font-medium text-[#6B7280] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Quantity Sold</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-white border border-[#E5E7EB] rounded-lg overflow-hidden flex-1">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 h-11 flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-all">
                    <Minus className="w-4 h-4" />
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
                    className="flex-1 text-center font-semibold text-[#111827] bg-transparent outline-none border-0 focus:ring-0"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  />
                  <button
                    onClick={() => {
                      const maxStock = selectedItem?.stock ?? 9999;
                      setQuantity(Math.min(quantity + 1, maxStock));
                    }}
                    className="w-11 h-11 flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] transition-all"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={handleAddSale}
                  disabled={!selectedItem || addLoading || (selectedItem?.stock ?? 0) <= 0}
                  className="btn-primary flex items-center gap-2 px-5"
                >
                  <Plus className="w-4 h-4" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* Selected item preview */}
          {selectedItem && (
            <div className={`mt-4 flex items-center gap-4 px-4 py-3 rounded-xl border ${
              selectedItem.stock <= 5
                ? 'bg-[#FEF3C7] border-[#FDE68A]'
                : 'bg-[#EFF6FF] border-[#BFDBFE]'
            }`}>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111827] truncate" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{selectedItem.product_name}</p>
                <p className="text-xs text-[#6B7280] mt-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch: {selectedItem.batch_number}</p>
              </div>
              <div className="text-right shrink-0">
                <p className={`text-sm font-bold ${
                  selectedItem.stock <= 5 ? 'text-[#D97706]' : 'text-[#2563EB]'
                }`} style={{ fontFamily: 'DM Sans, sans-serif' }}>{selectedItem.stock} in stock</p>
                {selectedItem.stock <= 10 && (
                  <p className="text-[10px] text-[#D97706] font-semibold mt-0.5">Low stock — log carefully</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Today's Log */}
        <div className="glass-card rounded-[12px] p-6">
          <div className="flex items-center justify-between mb-5">
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

        {/* Sales History */}
        <div className="glass-card rounded-[12px] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-[18px] font-medium text-[#111827]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Sales History</h2>
              <p className="text-[12px] font-normal text-[#9CA3AF] mt-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Each day's log is archived at midnight.</p>
            </div>
            <div className="flex items-center gap-2">
              {Object.keys(history).length > 0 && (
                <button
                  onClick={() => setExpandedDays(prev => prev.length > 0 ? [] : Object.keys(history))}
                  className="text-xs font-semibold text-[#22C55E] hover:text-[#16A34A] transition-colors"
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  {expandedDays.length > 0 ? 'Collapse all' : 'Expand all'}
                </button>
              )}
              <button onClick={fetchHistory} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm">
                <RefreshCw className={`w-4 h-4 ${histLoading ? 'animate-spin' : ''}`} /> Refresh
              </button>
            </div>
          </div>

          {/* Expandable Days */}
          <div className="space-y-2">
            {Object.entries(history).length === 0 && (
              <p className="text-sm text-[#9CA3AF] text-center py-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No history available yet.</p>
            )}
            {Object.entries(history).sort(([a], [b]) => b.localeCompare(a)).slice(0, 5).map(([date, logs]) => {
              const isExpanded = expandedDays.includes(date);
              const total = logs.reduce((s, l) => s + l.qty_sold, 0);
              return (
                <div key={date} className="bg-white border border-[#E5E7EB] rounded-lg overflow-hidden">
                  <button onClick={() => toggleDay(date)} className="w-full flex items-center justify-between p-4 hover:bg-[#F9FAFB] transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-4 h-4 text-[#6B7280] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      <span className="font-medium text-[#111827] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{date}</span>
                    </div>
                    <span className="text-xs text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      {logs.length} item(s) · {total} units
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-[#F3F4F6] p-4 bg-[#F9FAFB]">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#F3F4F6]">
                            {['Product', 'Batch', 'Qty', 'Time'].map((h) => (
                              <th key={h} className="px-3 py-2 text-[11px] font-medium text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log) => (
                            <tr key={log.log_id} className="border-b border-[#F3F4F6] last:border-0">
                              <td className="px-3 py-3 text-[#111827] text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.product_name}</td>
                              <td className="px-3 py-3 text-[#6B7280] text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.batch_number}</td>
                              <td className="px-3 py-3 text-[#22C55E] font-semibold text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.qty_sold}</td>
                              <td className="px-3 py-3 text-[#6B7280] text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.logged_at}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
