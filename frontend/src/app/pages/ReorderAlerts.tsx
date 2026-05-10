import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, RefreshCw, PackageX, Check, ArrowUpDown } from 'lucide-react';
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
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto scrollbar-hide bg-[#F9FAFB]">
      {/* Topbar */}
      <div className="h-14 bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8 py-6 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-white border border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] transition-all">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-3xl font-bold text-[#0F172A]">
            Reorder alerts
          </h1>
        </div>
        <button onClick={fetchAlerts} className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm flex items-center gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex-1 p-6 px-8 py-6 max-w-[1100px] mx-auto w-full space-y-6">

        {/* Page heading */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-[#111827]">Reorder alerts</h2>
            <p className="text-sm text-[#6B7280] mt-1">
              {loading ? 'Loading…' : alerts.length === 0 ? 'All products are well-stocked.' : `${alerts.length} product${alerts.length !== 1 ? 's' : ''} require restocking`}
            </p>
          </div>
          {/* Filter tabs */}
          {!loading && alerts.length > 0 && (
            <div className="flex items-center bg-white border border-gray-300 rounded-lg p-1 gap-1">
              {([
                { key: 'all', label: `All (${alerts.length})` },
                { key: 'out', label: `Out of Stock (${outCount})` },
                { key: 'low', label: `Low Stock (${lowCount})` },
              ] as const).map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    filter === tab.key ? 'bg-[#16a34a] text-white' : 'text-gray-700 hover:bg-gray-50'
                  }`}
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
            <div className="w-16 h-16 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] flex items-center justify-center">
              <Check className="w-7 h-7 text-[#22C55E]" />
            </div>
            <p className="text-[#111827] font-semibold text-lg" style={{ fontFamily: 'DM Sans, sans-serif' }}>All products are well-stocked</p>
            <p className="text-[#6B7280] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>No reorder alerts at this time.</p>
          </div>
        )}

        {/* Table */}
        {!loading && sorted.length > 0 && (
          <div className="glass-card rounded-[12px] overflow-hidden shadow-lg">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Status</th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] uppercase tracking-wider hover:text-[#111827] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Product <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'name' && <span className="text-[#22C55E]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('category')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] uppercase tracking-wider hover:text-[#111827] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Category <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'category' && <span className="text-[#22C55E]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch</th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('stock')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] uppercase tracking-wider hover:text-[#111827] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Stock <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'stock' && <span className="text-[#22C55E]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {sorted.map(item => (
                  <tr
                    key={item.doc_id}
                    className="hover:bg-[#F9FAFB] transition-all"
                    style={{ opacity: dismissed.includes(item.doc_id) ? 0.3 : 1, transition: 'opacity 0.3s' }}
                  >
                    <td className="px-5 py-4">
                      {item.stock === 0
                        ? <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FEE2E2] text-[#DC2626] border border-[#FECACA] text-xs font-bold h-6"><PackageX className="w-3 h-3" /> Out of Stock</span>
                        : <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A] text-xs font-bold h-6">Low Stock</span>
                      }
                    </td>
                    <td className="px-5 py-4 font-semibold text-[#111827] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</td>
                    <td className="px-5 py-4">
                      <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#F9FAFB] border border-[#E5E7EB] text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.category}</span>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-[#9CA3AF]">{item.batch_number}</td>
                    <td className="px-5 py-4">
                      <span className={`text-sm font-bold ${item.stock === 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`} style={{ fontFamily: 'DM Sans, sans-serif' }}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <button
                        onClick={() => handleDismiss(item.doc_id)}
                        disabled={dismissed.includes(item.doc_id)}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#22C55E] hover:text-[#22C55E] text-xs font-semibold transition-all disabled:opacity-40"
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