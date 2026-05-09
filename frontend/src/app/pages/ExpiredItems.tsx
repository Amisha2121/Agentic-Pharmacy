import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, AlertTriangle, RefreshCw, Check, ArrowUpDown, Clock } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

interface ExpiredItem {
  doc_id: string;
  product_name: string;
  batch_number: string;
  category: string;
  expiry_date: string;
  stock: number;
  days_expired: number;
}

type FilterKey = 'all' | 'expired' | 'expiring';
type SortKey = 'name' | 'days' | 'stock';

function getUrgencyConfig(days: number) {
  if (days >= 0) {
    if (days > 60) return { label: `Expired ${days}d ago`, color: '#EF4444', bg: '#FEE2E2', border: '#FECACA', barColor: '#EF4444' };
    if (days > 30) return { label: `Expired ${days}d ago`, color: '#EF4444', bg: '#FEE2E2', border: '#FCA5A5', barColor: '#EF4444' };
    return { label: `Expired ${days}d ago`, color: '#FB923C', bg: '#FEF3C7', border: '#FDE68A', barColor: '#FB923C' };
  } else {
    const d = Math.abs(days);
    if (d <= 30) return { label: `Expires in ${d}d`, color: '#EF4444', bg: '#FEE2E2', border: '#FECACA', barColor: '#EF4444' };
    if (d <= 60) return { label: `Expires in ${d}d`, color: '#FB923C', bg: '#FEF3C7', border: '#FDE68A', barColor: '#FB923C' };
    return { label: `Expires in ${d}d`, color: '#F59E0B', bg: '#FEF3C7', border: '#FDE68A', barColor: '#F59E0B' };
  }
}

export function ExpiredItems() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [items, setItems] = useState<ExpiredItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [sortKey, setSortKey] = useState<SortKey>('days');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/expired');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  const handleDismiss = async (docId: string) => {
    setDismissed(prev => [...prev, docId]);
    try {
      await authenticatedFetch(`/api/expired/${docId}/dismiss`, { method: 'POST' });
    } catch { /* ignore */ }
    setTimeout(() => setItems(prev => prev.filter(a => a.doc_id !== docId)), 400);
  };

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const expiredCount = items.filter(i => i.days_expired >= 0).length;
  const expiringCount = items.filter(i => i.days_expired < 0).length;

  const filtered = items.filter(i => {
    if (filter === 'expired') return i.days_expired >= 0;
    if (filter === 'expiring') return i.days_expired < 0;
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    if (sortKey === 'name') cmp = a.product_name.localeCompare(b.product_name);
    else if (sortKey === 'days') cmp = b.days_expired - a.days_expired;
    else if (sortKey === 'stock') cmp = a.stock - b.stock;
    return sortDir === 'asc' ? cmp : -cmp;
  });

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

      <div className="flex-1 pt-16 px-8 pb-12 max-w-7xl mx-auto w-full">

        {/* Page heading + filter tabs */}
        <div className="mb-8 flex items-baseline justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#0F172A] mb-2">
              Expirations
            </h1>
            <p className="text-sm text-[#64748B]">
              {loading ? 'Loading…' : items.length === 0 ? 'No alerts' : `${expiredCount} expired · ${expiringCount} expiring soon`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {!loading && items.length > 0 && (
              <div className="flex items-center bg-white border border-gray-300 rounded-lg p-1 gap-1">
                {([
                  { key: 'all', label: `All (${items.length})` },
                  { key: 'expired', label: `Expired (${expiredCount})` },
                  { key: 'expiring', label: `Soon (${expiringCount})` },
                ] as const).map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFilter(tab.key)}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                      filter === tab.key ? 'bg-[#16a34a] text-white' : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
            <button 
              onClick={fetchItems} 
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-lg px-4 py-2 text-sm flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </button>
          </div>
        </div>

        {/* Empty state */}
        {!loading && items.length === 0 && (
          <div className="bg-white border-2 border-[#0F172A] rounded-xl flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F0FDF4] border-2 border-[#16a34a] flex items-center justify-center">
              <Check className="w-7 h-7 text-[#16a34a]" strokeWidth={3} />
            </div>
            <p className="text-[#0F172A] font-black text-lg uppercase tracking-wide">No Expiration Alerts</p>
            <p className="text-[#64748B] text-sm font-medium">All products are within their valid date range.</p>
          </div>
        )}

        {/* Table */}
        {!loading && sorted.length > 0 && (
          <div className="glass-card rounded-[12px] overflow-hidden shadow-lg">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                  <th className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Urgency</th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] uppercase tracking-wider hover:text-[#111827] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Product <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'name' && <span className="text-[#22C55E]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Category</th>
                  <th className="px-5 py-4 text-xs font-bold text-[#6B7280] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch</th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('days')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#6B7280] uppercase tracking-wider hover:text-[#111827] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Expiry Date <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'days' && <span className="text-[#22C55E]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
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
                {sorted.map(item => {
                  const cfg = getUrgencyConfig(item.days_expired);
                  const isDismissed = dismissed.includes(item.doc_id);
                  return (
                    <tr
                      key={item.doc_id}
                      className="hover:bg-[#F9FAFB] transition-all"
                      style={{ opacity: isDismissed ? 0.3 : 1, transition: 'opacity 0.3s' }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {item.days_expired >= 0
                            ? <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                            : <Clock className="w-4 h-4 shrink-0" style={{ color: cfg.color }} />
                          }
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-full border h-6 inline-flex items-center"
                            style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#111827] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#F9FAFB] border border-[#E5E7EB] text-[#6B7280]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.category}</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-[#9CA3AF]">{item.batch_number}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: cfg.color, fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.expiry_date}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#6B7280]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{item.stock}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDismiss(item.doc_id)}
                          disabled={isDismissed}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#22C55E] hover:text-[#22C55E] text-xs font-semibold transition-all disabled:opacity-40"
                          style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
                        >
                          <Check className="w-3 h-3" /> Dismiss
                        </button>
                      </td>
                    </tr>
                  );
                })}
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