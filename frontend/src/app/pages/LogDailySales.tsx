import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, Plus, Minus, Search, Trash2, RefreshCw, ChevronDown, Edit2 } from 'lucide-react';
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
      setSelectedItem(null); setSearchQuery(''); setQuantity(1);
      await fetchTodayLog();
      await fetchInventory();
    } catch { /* ignore */ } finally { setAddLoading(false); }
  };

  const handleDelete = async (logId: string) => {
    try { await authenticatedFetch(`/api/sales/${logId}`, { method: 'DELETE' }); } catch { /* ignore */ }
    await fetchTodayLog();
  };

  const toggleDay = (date: string) => setExpandedDays((prev) => prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]);
  const totalToday = todayLog.reduce((s, l) => s + l.qty_sold, 0);

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto scrollbar-hide">
      {/* Topbar */}
      <div className="h-14 bg-[#0E0E11] border-b border-[#27272A] flex items-center justify-between px-7 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1F1F23] transition-all">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-[18px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Log Daily Sales</h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] font-normal text-[#71717A]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6 space-y-6 max-w-[1200px] mx-auto w-full">
        
        {/* Add a Sale Card */}
        <div className="glass-card rounded-[12px] p-6">
          <h2 className="text-[18px] font-medium text-[#F4F4F5] mb-5" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Add a Sale</h2>
          <div className="flex gap-4">
            {/* Search Medicine */}
            <div className="flex-1 relative">
              <label className="block text-[12px] font-medium text-[#A1A1AA] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Search Medicine</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(e.target.value.length > 0); setSelectedItem(null); }}
                  onFocus={() => setIsDropdownOpen(searchQuery.length > 0)}
                  placeholder="Type medicine name or batch number..."
                  className="input-field pl-11 pr-10"
                />
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#52525B]" />
              </div>
              {isDropdownOpen && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-[#111113] rounded-lg shadow-2xl border border-[#27272A] overflow-hidden z-30 max-h-[300px] overflow-y-auto">
                  {filtered.slice(0, 8).map((item) => {
                    const outOfStock = item.stock <= 0;
                    return (
                      <button
                        key={item.doc_id}
                        disabled={outOfStock}
                        className={`w-full text-left px-4 py-3 transition-colors flex items-center justify-between border-b border-[#1F1F23] last:border-0 ${
                          outOfStock
                            ? 'opacity-40 cursor-not-allowed'
                            : 'hover:bg-[#161619] cursor-pointer'
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
                          <span className="font-medium text-[#F4F4F5] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</span>
                          <span className="text-xs text-[#71717A]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch: {item.batch_number}</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded ${
                          outOfStock
                            ? 'bg-[#1A0000] text-[#EF4444] border border-[#991B1B]'
                            : 'bg-[#0C1A2E] text-[#60A5FA] border border-[#1E3A5F]'
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
              <label className="block text-[12px] font-medium text-[#A1A1AA] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Quantity Sold</label>
              <div className="flex items-center gap-2">
                <div className="flex items-center bg-[#18181B] border border-[#27272A] rounded-lg overflow-hidden flex-1">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-11 h-11 flex items-center justify-center text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1F1F23] transition-all">
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
                    className="flex-1 text-center font-semibold text-[#F4F4F5] bg-transparent outline-none border-0 focus:ring-0"
                    style={{ fontFamily: 'DM Sans, sans-serif' }}
                  />
                  <button
                    onClick={() => {
                      const maxStock = selectedItem?.stock ?? 9999;
                      setQuantity(Math.min(quantity + 1, maxStock));
                    }}
                    className="w-11 h-11 flex items-center justify-center text-[#71717A] hover:text-[#F4F4F5] hover:bg-[#1F1F23] transition-all"
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
        </div>

        {/* Today's Log */}
        <div className="glass-card rounded-[12px] p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <h2 className="text-[18px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Today's Log</h2>
              <span className="text-[13px] font-normal text-[#71717A]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>· {new Date().toISOString().slice(0, 10)}</span>
            </div>
            <button onClick={fetchTodayLog} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm">
              <RefreshCw className={`w-4 h-4 ${logLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#27272A]">
                  {['MEDICINE', 'BATCH #', 'QTY', 'LOGGED AT', 'EDIT', 'DEL'].map((h) => (
                    <th key={h} className="px-4 py-3 text-[11px] font-medium text-[#71717A] uppercase tracking-[0.8px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {todayLog.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-[#52525B] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No sales logged today.</td></tr>
                )}
                {todayLog.map((log) => (
                  <tr key={log.log_id} className="border-b border-[#1F1F23] hover:bg-[#111113] transition-colors">
                    <td className="px-4 py-4 font-medium text-[#F4F4F5] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.product_name}</td>
                    <td className="px-4 py-4 text-[#A1A1AA] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.batch_number}</td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-[#052E16] text-[#22C55E] border border-[#166534] text-xs font-medium" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                        {log.qty_sold}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-[#71717A] text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.logged_at}</td>
                    <td className="px-4 py-4">
                      <button className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#3B82F6] hover:bg-[#0C1A2E] transition-all">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                    <td className="px-4 py-4">
                      <button onClick={() => handleDelete(log.log_id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-[#71717A] hover:text-[#EF4444] hover:bg-[#1A0000] transition-all">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          <div className="mt-5 pt-5 border-t border-[#27272A] flex items-center justify-between">
            <span className="text-[13px] font-normal text-[#71717A]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {todayLog.length} item(s)
            </span>
            <span className="text-[13px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              <span className="text-[#3B82F6] font-semibold">{totalToday} total units</span> dispensed today
            </span>
          </div>
        </div>

        {/* Sales History */}
        <div className="glass-card rounded-[12px] p-6">
          <h2 className="text-[18px] font-medium text-[#F4F4F5] mb-2" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Sales History</h2>
          <p className="text-[13px] font-normal text-[#71717A] mb-5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Each day's log is automatically archived at midnight.</p>
          
          <button onClick={fetchHistory} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm mb-5">
            <RefreshCw className={`w-4 h-4 ${histLoading ? 'animate-spin' : ''}`} /> Refresh History
          </button>

          {/* Expandable Days */}
          <div className="space-y-2">
            {Object.entries(history).length === 0 && (
              <p className="text-sm text-[#52525B] text-center py-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No history available yet.</p>
            )}
            {Object.entries(history).sort(([a], [b]) => b.localeCompare(a)).slice(0, 5).map(([date, logs]) => {
              const isExpanded = expandedDays.includes(date);
              const total = logs.reduce((s, l) => s + l.qty_sold, 0);
              return (
                <div key={date} className="bg-[#111113] border border-[#27272A] rounded-lg overflow-hidden">
                  <button onClick={() => toggleDay(date)} className="w-full flex items-center justify-between p-4 hover:bg-[#161619] transition-colors">
                    <div className="flex items-center gap-3">
                      <ChevronDown className={`w-4 h-4 text-[#71717A] transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      <span className="font-medium text-[#F4F4F5] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{date}</span>
                    </div>
                    <span className="text-xs text-[#71717A]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      {logs.length} item(s) · {total} units
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="border-t border-[#1F1F23] p-4 bg-[#0E0E11]">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="border-b border-[#1F1F23]">
                            {['Product', 'Batch', 'Qty', 'Time'].map((h) => (
                              <th key={h} className="px-3 py-2 text-[11px] font-medium text-[#71717A] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {logs.map((log) => (
                            <tr key={log.log_id} className="border-b border-[#1F1F23] last:border-0">
                              <td className="px-3 py-3 text-[#F4F4F5] text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.product_name}</td>
                              <td className="px-3 py-3 text-[#A1A1AA] text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.batch_number}</td>
                              <td className="px-3 py-3 text-[#3B82F6] font-semibold text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.qty_sold}</td>
                              <td className="px-3 py-3 text-[#71717A] text-xs" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{log.logged_at}</td>
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
