import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, RefreshCw, BellRing, PackageX, Check, ArrowUpDown } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

interface ReorderAlert {
  doc_id: string;
  product_name: string;
  batch_number: string;
  category: string;
  expiry_date: string;
  stock: number;
}

type SortKey = 'name' | 'stock' | 'category';

export function ReorderAlerts() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>('stock');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [filter, setFilter] = useState<'all' | 'out' | 'low'>('all');

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/reorder-alerts');
      const data = await res.json();
      setAlerts(data.alerts ?? []);
    } catch {
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAlerts(); }, []);

  const handleDismiss = async (docId: string) => {
    setDismissed(prev => [...prev, docId]);
    try {
      await authenticatedFetch(`/api/reorder-alerts/${docId}/dismiss`, { method: 'POST' });
    } catch { /* ignore */ }
    setTimeout(() => setAlerts(prev => prev.filter(a => a.doc_id !== docId)), 400);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const outCount = alerts.filter(a => a.stock === 0).length;
  const lowCount = alerts.filter(a => a.stock > 0).length;

  const filtered = alerts.filter(a => {
    if (filter === 'out') return a.stock === 0;
    if (filter === 'low') return a.stock > 0;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.product_name.localeCompare(b.product_name);
    else if (sortKey === 'stock') cmp = a.stock - b.stock;
    else if (sortKey === 'category') cmp = a.category.localeCompare(b.category);
    return sortDir === 'asc' ? cmp : -cmp;
  });

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto scrollbar-hide">
      {/* Topbar */}
      <div className="h-14 bg-[#0E0E11] border-b border-[#27272A] flex items-center justify-between px-7 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] transition-all">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <BellRing className="w-4 h-4 text-[#FB923C]" />
          <h1 className="text-[18px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Reorder Alerts</h1>
        </div>
        <button onClick={fetchAlerts} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex-1 p-6 max-w-[1100px] mx-auto w-full space-y-6">

        {/* Page heading */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[26px] font-bold text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.4px' }}>Reorder Alerts</h2>
            <p className="text-sm text-[#71717A] mt-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {loading ? 'Loading…' : alerts.length === 0 ? 'All products are well-stocked.' : `${alerts.length} product${alerts.length !== 1 ? 's' : ''} require restocking`}
            </p>
          </div>
          {/* Filter tabs */}
          {!loading && alerts.length > 0 && (
            <div className="flex items-center bg-[#111113] border border-[#27272A] rounded-lg p-1 gap-1">
              {([
                { key: 'all', label: `All (${alerts.length})` },
                { key: 'out', label: `Out of Stock (${outCount})` },
                { key: 'low', label: `Low Stock (${lowCount})` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                    filter === tab.key ? 'bg-[#1A2535] text-[#3B82F6]' : 'text-[#52525B] hover:text-[#A1A1AA]'
                  }`}
                  style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Empty state */}
        {!loading && alerts.length === 0 && (
          <div className="glass-card rounded-[12px] flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#052E16] border border-[#166534] flex items-center justify-center">
              <Check className="w-7 h-7 text-[#22C55E]" />
            </div>
            <p className="text-[#F4F4F5] font-semibold text-lg" style={{ fontFamily: 'DM Sans, sans-serif' }}>All products are well-stocked</p>
            <p className="text-[#52525B] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No reorder alerts at this time.</p>
          </div>
        )}

        {/* Table */}
        {!loading && sorted.length > 0 && (
          <div className="glass-card rounded-[12px] overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#111113]">
                  <th className="px-5 py-4 text-xs font-bold text-[#52525B] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Status</th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#52525B] uppercase tracking-wider hover:text-[#A1A1AA] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Product <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'name' && <span className="text-[#3B82F6]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('category')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#52525B] uppercase tracking-wider hover:text-[#A1A1AA] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Category <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'category' && <span className="text-[#3B82F6]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-[#52525B] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch</th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('stock')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#52525B] uppercase tracking-wider hover:text-[#A1A1AA] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Stock <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'stock' && <span className="text-[#3B82F6]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-[#52525B] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1A1A1D]">
                {sorted.map(item => (
                  <tr
                    key={item.doc_id}
                    className="hover:bg-[#111113] transition-all"
                    style={{ opacity: dismissed.includes(item.doc_id) ? 0.3 : 1, transition: 'opacity 0.3s' }}
                  >
                    <td className="px-5 py-4">
                      {item.stock === 0
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1A0000] text-[#EF4444] border border-[#991B1B] text-xs font-bold"><PackageX className="w-3 h-3" /> Out of Stock</span>
                        : <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-[#451A03] text-[#FB923C] border border-[#92400E] text-xs font-bold">Low Stock</span>
                      }
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#F4F4F5] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#18181B] border border-[#27272A] text-[#71717A]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.category}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[#52525B]">{item.batch_number}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-bold ${item.stock === 0 ? 'text-[#EF4444]' : 'text-[#FB923C]'}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDismiss(item.doc_id)}
                        disabled={dismissed.includes(item.doc_id)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-[#71717A] hover:border-[#22C55E] hover:text-[#22C55E] text-xs font-semibold transition-all disabled:opacity-40"
                        style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                      >
                        <Check className="w-3 h-3" /> Dismiss
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="glass-card rounded-[12px] h-16 animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}