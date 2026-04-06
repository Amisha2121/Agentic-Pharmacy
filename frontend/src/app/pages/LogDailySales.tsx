import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, Plus, Minus, Search, Trash2, RefreshCw, ChevronDown, ChevronUp, Archive } from 'lucide-react';

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
  const [editQuantities, setEditQuantities] = useState<Record<string, number>>({});
  const [logLoading, setLogLoading] = useState(true);

  const [history, setHistory] = useState<Record<string, SaleLog[]>>({});
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [expandedDays, setExpandedDays] = useState<string[]>([]);
  const [histLoading, setHistLoading] = useState(false);

  const fetchInventory = async () => {
    try {
      const r = await fetch('/api/inventory');
      const d = await r.json();
      setInventory(d.items ?? []);
    } catch { /* ignore */ }
  };

  const fetchTodayLog = async () => {
    setLogLoading(true);
    try {
      const r = await fetch('/api/sales/today');
      const d = await r.json();
      const logs: SaleLog[] = d.logs ?? [];
      setTodayLog(logs);
      const qm: Record<string, number> = {};
      logs.forEach((l) => { qm[l.log_id] = l.qty_sold; });
      setEditQuantities(qm);
    } catch { /* ignore */ } finally { setLogLoading(false); }
  };

  const fetchHistory = async () => {
    setHistLoading(true);
    try {
      const r = await fetch('/api/sales/history');
      const d = await r.json();
      setHistory(d.history ?? {});
    } catch { /* ignore */ } finally { setHistLoading(false); }
  };

  useEffect(() => { fetchInventory(); fetchTodayLog(); }, []);

  const filtered = inventory.filter((i) =>
    i.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    i.batch_number.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const [stockError, setStockError] = useState('');

  const handleAddSale = async () => {
    if (!selectedItem || quantity < 1) return;
    if (selectedItem.stock <= 0) {
      setStockError(`${selectedItem.product_name} is out of stock.`);
      return;
    }
    if (quantity > selectedItem.stock) {
      setStockError(`Only ${selectedItem.stock} unit(s) available for ${selectedItem.product_name}.`);
      return;
    }
    setStockError('');
    setAddLoading(true);
    try {
      await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batch_number: selectedItem.batch_number, product_name: selectedItem.product_name, qty_sold: quantity }) });
      setSelectedItem(null); setSearchQuery(''); setQuantity(1);
      await fetchTodayLog();
      await fetchInventory();
    } catch { /* ignore */ } finally { setAddLoading(false); }
  };

  const handleEditSave = async (logId: string) => {
    const newQty = editQuantities[logId];
    if (!newQty || newQty < 1) return;
    try {
      await fetch(`/api/sales/${logId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ new_qty: newQty }) });
      await fetchTodayLog();
    } catch { /* ignore */ }
  };

  const handleDelete = async (logId: string) => {
    try { await fetch(`/api/sales/${logId}`, { method: 'DELETE' }); } catch { /* ignore */ }
    await fetchTodayLog();
  };

  const toggleDay = (date: string) => setExpandedDays((prev) => prev.includes(date) ? prev.filter((d) => d !== date) : [...prev, date]);
  const totalToday = todayLog.reduce((s, l) => s + l.qty_sold, 0);

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto bg-transparent scrollbar-hide pb-20">
      <div className="flex items-center justify-between p-4 bg-transparent absolute top-0 w-full z-20 pointer-events-none">
        <div className="flex items-center pointer-events-auto">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="w-12 h-12 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-white/50 flex items-center justify-center text-[#1E4A4C] hover:bg-white hover:shadow-md transition-all duration-300 group">
              <Menu className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex flex-col pt-20 px-8 max-w-6xl mx-auto w-full space-y-8">
        <h1 className="text-4xl font-extrabold text-[#1E4A4C] tracking-tight">Log Daily Sales</h1>

        {/* Add a Sale */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white/50 relative">
          <h2 className="text-2xl font-bold text-[#1E4A4C] mb-6">Add a Sale</h2>
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 relative">
              <label className="block text-sm font-semibold text-[#1E4A4C] mb-2">Search Medicine</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none"><Search className="h-5 w-5 text-gray-400" /></div>
                <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(e.target.value.length > 0); setSelectedItem(null); }} onFocus={() => setIsDropdownOpen(searchQuery.length > 0)} placeholder="Type medicine name or batch number..." className="w-full bg-white/50 border border-gray-200 rounded-2xl py-3.5 pl-11 pr-10 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:bg-white transition-all shadow-sm" />
                <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none"><ChevronDown className="h-5 w-5 text-gray-400" /></div>
              </div>
              {isDropdownOpen && filtered.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-30">
                  {filtered.slice(0, 8).map((item) => {
                    const outOfStock = item.stock <= 0;
                    return (
                      <button
                        key={item.doc_id}
                        disabled={outOfStock}
                        className={`w-full text-left px-5 py-4 transition-colors flex items-center justify-between ${
                          outOfStock
                            ? 'opacity-50 cursor-not-allowed bg-gray-50'
                            : 'hover:bg-[#F2EFE9] cursor-pointer'
                        }`}
                        onClick={() => {
                          if (outOfStock) return;
                          setSelectedItem(item);
                          setSearchQuery(item.product_name);
                          setIsDropdownOpen(false);
                          setQuantity(1);
                          setStockError('');
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-gray-900">{item.product_name}</span>
                          <span className="text-gray-300">•</span>
                          <span className="text-sm text-gray-500">Batch: {item.batch_number}</span>
                        </div>
                        <span className={`text-sm font-medium px-3 py-1 rounded-lg ${
                          outOfStock
                            ? 'bg-rose-50 text-rose-500 border border-rose-100'
                            : 'bg-[#1E4A4C]/10 text-[#1E4A4C]'
                        }`}>
                          {outOfStock ? 'Out of Stock' : `Stock: ${item.stock}`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div className="w-full md:w-64">
              <label className="block text-sm font-semibold text-[#1E4A4C] mb-2">Quantity Sold</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center bg-white/50 border border-gray-200 rounded-2xl p-1 shadow-sm flex-1">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#1E4A4C] hover:bg-white rounded-xl transition-all"><Minus className="w-4 h-4" /></button>
                  <input
                    type="number"
                    value={quantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1;
                      const maxStock = selectedItem?.stock ?? 9999;
                      setQuantity(Math.min(val, maxStock));
                      if (selectedItem && val > selectedItem.stock) {
                        setStockError(`Only ${selectedItem.stock} unit(s) available.`);
                      } else {
                        setStockError('');
                      }
                    }}
                    className="w-full text-center font-bold text-lg text-gray-800 bg-transparent outline-none"
                  />
                  <button
                    onClick={() => {
                      const maxStock = selectedItem?.stock ?? 9999;
                      const next = quantity + 1;
                      if (next > maxStock) {
                        setStockError(`Only ${maxStock} unit(s) available.`);
                      } else {
                        setQuantity(next);
                        setStockError('');
                      }
                    }}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:text-[#1E4A4C] hover:bg-white rounded-xl transition-all"
                  ><Plus className="w-4 h-4" /></button>
                </div>
                <button
                  onClick={handleAddSale}
                  disabled={!selectedItem || addLoading || (selectedItem?.stock ?? 0) <= 0}
                  className="bg-[#1E4A4C] hover:bg-[#2B5B5C] disabled:opacity-50 text-white px-6 py-3.5 rounded-2xl font-bold shadow-lg transition-all hover:scale-105 shrink-0 flex items-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Add
                </button>
              </div>
              {stockError && (
                <p className="mt-2 text-sm font-medium text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                  {stockError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Today's Log */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white/50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
            <h2 className="text-2xl font-bold text-[#1E4A4C] flex items-center gap-3">Today's Log <span className="text-[#2B5B5C]/60 text-lg font-medium">· {new Date().toISOString().slice(0, 10)}</span></h2>
            <button onClick={fetchTodayLog} className="flex items-center justify-center gap-2 bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-5 py-2.5 rounded-xl font-medium shadow-md transition-all hover:scale-105">
              <RefreshCw className={`w-4 h-4 ${logLoading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
          <div className="overflow-x-auto rounded-2xl border border-gray-100 bg-white/40">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b border-gray-200/60">
                  {['Medicine', 'Batch #', 'Qty', 'Logged At', 'Edit', 'Del'].map((h) => (
                    <th key={h} className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {todayLog.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-8 text-gray-400 font-medium">No sales logged today.</td></tr>
                )}
                {todayLog.map((log) => (
                  <tr key={log.log_id} className="hover:bg-white/60 transition-colors">
                    <td className="px-6 py-6 font-semibold text-gray-900">{log.product_name}</td>
                    <td className="px-6 py-6 font-medium text-gray-600">{log.batch_number}</td>
                    <td className="px-6 py-6"><span className="inline-flex items-center justify-center px-3 py-1 rounded-lg bg-emerald-50 text-emerald-600 font-bold text-sm border border-emerald-100">{log.qty_sold}</span></td>
                    <td className="px-6 py-6 font-medium text-gray-500 text-sm">{log.logged_at}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center gap-2">
                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-lg overflow-hidden">
                          <button onClick={() => setEditQuantities((p) => ({ ...p, [log.log_id]: Math.max(1, (p[log.log_id] ?? log.qty_sold) - 1) }))} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200"><Minus className="w-3 h-3" /></button>
                          <input type="text" value={editQuantities[log.log_id] ?? log.qty_sold} readOnly className="w-10 text-center font-bold text-sm bg-transparent outline-none" />
                          <button onClick={() => setEditQuantities((p) => ({ ...p, [log.log_id]: (p[log.log_id] ?? log.qty_sold) + 1 }))} className="w-8 h-8 flex items-center justify-center text-gray-500 hover:bg-gray-200"><Plus className="w-3 h-3" /></button>
                        </div>
                        <button onClick={() => handleEditSave(log.log_id)} className="text-xs font-semibold text-[#1E4A4C] hover:bg-[#1E4A4C]/10 px-3 py-1 rounded-md transition-colors w-full border border-[#1E4A4C]/20">Save</button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button onClick={() => handleDelete(log.log_id)} className="p-2 rounded-xl text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors border border-transparent hover:border-rose-100 inline-flex flex-col items-center gap-1 group/del">
                        <Trash2 className="w-5 h-5" />
                        <span className="text-[10px] font-bold uppercase opacity-0 group-hover/del:opacity-100 transition-opacity">Del</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-6 text-right">
            <p className="text-sm font-semibold text-gray-500">{todayLog.length} line(s) · <span className="text-[#1E4A4C] font-bold text-base">{totalToday} total units</span> dispensed today</p>
          </div>
        </div>

        {/* Sales History */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border border-white/50">
          <h2 className="text-2xl font-bold text-[#1E4A4C] mb-2">Sales History</h2>
          <p className="text-gray-500 font-medium mb-6">Each day's log is automatically archived at midnight.</p>
          <button onClick={fetchHistory} className="flex items-center justify-center gap-2 bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all hover:scale-[1.02] mb-10">
            <RefreshCw className={`w-4 h-4 ${histLoading ? 'animate-spin' : ''}`} /> Refresh History
          </button>
          <div className="border border-gray-200 rounded-2xl overflow-hidden bg-white/50">
            <button onClick={() => { setIsArchiveOpen(!isArchiveOpen); if (!isArchiveOpen) fetchHistory(); }} className="w-full flex items-center justify-between p-6 bg-white hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Archive className={`w-5 h-5 ${isArchiveOpen ? 'text-[#1E4A4C]' : 'text-gray-400'}`} />
                <span className={`font-bold text-lg ${isArchiveOpen ? 'text-[#1E4A4C]' : 'text-gray-700'}`}>Past 5 Days</span>
              </div>
              {isArchiveOpen ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
            </button>
            {isArchiveOpen && (
              <div className="p-6 border-t border-gray-100 bg-gray-50/30 space-y-3">
                {Object.entries(history).length === 0 && <p className="text-sm text-gray-400 text-center py-4">No history available yet.</p>}
                {Object.entries(history).sort(([a], [b]) => b.localeCompare(a)).map(([date, logs]) => {
                  const isExpanded = expandedDays.includes(date);
                  const total = logs.reduce((s, l) => s + l.qty_sold, 0);
                  return (
                    <div key={date} className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
                      <button onClick={() => toggleDay(date)} className="w-full flex items-center gap-4 p-5 hover:bg-gray-50/80 transition-colors">
                        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${isExpanded ? 'rotate-180' : '-rotate-90'}`} />
                        <span className="font-semibold text-gray-800">{date}</span>
                        <span className="ml-auto text-sm text-gray-500">{logs.length} product(s) · {total} units</span>
                      </button>
                      {isExpanded && (
                        <div className="p-5 pt-0 border-t border-gray-100 bg-gray-50/50">
                          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden mt-4">
                            <table className="w-full text-left">
                              <thead><tr className="bg-gray-50/80 border-b border-gray-100">{['Product Name','Batch','Qty','Logged At'].map((h) => <th key={h} className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">{h}</th>)}</tr></thead>
                              <tbody className="divide-y divide-gray-50">
                                {logs.map((log) => (
                                  <tr key={log.log_id} className="hover:bg-gray-50/30">
                                    <td className="px-5 py-4 text-sm font-semibold text-gray-800">{log.product_name}</td>
                                    <td className="px-5 py-4 text-sm text-gray-600">{log.batch_number}</td>
                                    <td className="px-5 py-4 text-sm font-bold text-[#1E4A4C]">{log.qty_sold}</td>
                                    <td className="px-5 py-4 text-sm text-gray-500">{log.logged_at}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}