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
    // Already expired
    if (days > 60) return { label: `Expired ${days}d ago`, color: '#EF4444', bg: '#1A0000', border: '#991B1B', barColor: '#EF4444' };
    if (days > 30) return { label: `Expired ${days}d ago`, color: '#EF4444', bg: '#1A0000', border: '#7F1D1D', barColor: '#EF4444' };
    return { label: `Expired ${days}d ago`, color: '#FB923C', bg: '#1C0A00', border: '#92400E', barColor: '#FB923C' };
  } else {
    // Expiring soon
    const d = Math.abs(days);
    if (d <= 30) return { label: `Expires in ${d}d`, color: '#EF4444', bg: '#1A0000', border: '#991B1B', barColor: '#EF4444' };
    if (d <= 60) return { label: `Expires in ${d}d`, color: '#FB923C', bg: '#1C0A00', border: '#92400E', barColor: '#FB923C' };
    return { label: `Expires in ${d}d`, color: '#F59E0B', bg: '#1C1200', border: '#78350F', barColor: '#F59E0B' };
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
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto scrollbar-hide">
      {/* Topbar */}
      <div className="h-14 bg-[#0E0E11] border-b border-[#27272A] flex items-center justify-between px-7 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] transition-all">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <Clock className="w-4 h-4 text-[#EF4444]" />
          <h1 className="text-[18px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Expirations</h1>
        </div>
        <button onClick={fetchItems} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </div>

      <div className="flex-1 p-6 max-w-[1100px] mx-auto w-full space-y-6">

        {/* Page heading + filter tabs */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-[26px] font-bold text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.4px' }}>Expirations</h2>
            <p className="text-sm text-[#71717A] mt-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {loading ? 'Loading…' : items.length === 0 ? 'No expiration alerts.' : `${expiredCount} expired · ${expiringCount} expiring soon`}
            </p>
          </div>
          {!loading && items.length > 0 && (
            <div className="flex items-center bg-[#111113] border border-[#27272A] rounded-lg p-1 gap-1">
              {([
                { key: 'all', label: `All (${items.length})` },
                { key: 'expired', label: `Expired (${expiredCount})` },
                { key: 'expiring', label: `Expiring Soon (${expiringCount})` },
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
        {!loading && items.length === 0 && (
          <div className="glass-card rounded-[12px] flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#052E16] border border-[#166534] flex items-center justify-center">
              <Check className="w-7 h-7 text-[#22C55E]" />
            </div>
            <p className="text-[#F4F4F5] font-semibold text-lg" style={{ fontFamily: 'DM Sans, sans-serif' }}>No expiration alerts</p>
            <p className="text-[#52525B] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>All products are within their valid date range.</p>
          </div>
        )}

        {/* Table */}
        {!loading && sorted.length > 0 && (
          <div className="glass-card rounded-[12px] overflow-hidden shadow-2xl">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#27272A] bg-[#111113]">
                  <th className="px-5 py-4 text-xs font-bold text-[#52525B] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Urgency</th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('name')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#52525B] uppercase tracking-wider hover:text-[#A1A1AA] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Product <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'name' && <span className="text-[#3B82F6]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
                  <th className="px-5 py-4 text-xs font-bold text-[#52525B] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Category</th>
                  <th className="px-5 py-4 text-xs font-bold text-[#52525B] uppercase tracking-wider" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Batch</th>
                  <th className="px-5 py-4 cursor-pointer select-none" onClick={() => toggleSort('days')}>
                    <span className="flex items-center gap-1.5 text-xs font-bold text-[#52525B] uppercase tracking-wider hover:text-[#A1A1AA] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      Expiry Date <ArrowUpDown className="w-3 h-3" />
                      {sortKey === 'days' && <span className="text-[#3B82F6]">{sortDir === 'asc' ? '↑' : '↓'}</span>}
                    </span>
                  </th>
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
                {sorted.map(item => {
                  const cfg = getUrgencyConfig(item.days_expired);
                  const isDismissed = dismissed.includes(item.doc_id);
                  return (
                    <tr
                      key={item.doc_id}
                      className="hover:bg-[#111113] transition-all"
                      style={{ opacity: isDismissed ? 0.3 : 1, transition: 'opacity 0.3s' }}
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {item.days_expired >= 0
                            ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                            : <Clock className="w-3.5 h-3.5 shrink-0" style={{ color: cfg.color }} />
                          }
                          <span
                            className="text-xs font-bold px-2.5 py-1 rounded-lg border"
                            style={{ color: cfg.color, background: cfg.bg, borderColor: cfg.border }}
                          >
                            {cfg.label}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-[#F4F4F5] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.product_name}</td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-medium px-2.5 py-1 rounded-md bg-[#18181B] border border-[#27272A] text-[#71717A]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.category}</span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-[#52525B]">{item.batch_number}</td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-medium" style={{ color: cfg.color, fontFamily: 'IBM Plex Sans, sans-serif' }}>{item.expiry_date}</span>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-sm font-bold text-[#A1A1AA]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{item.stock}</span>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => handleDismiss(item.doc_id)}
                          disabled={isDismissed}
                          className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[#18181B] border border-[#27272A] text-[#71717A] hover:border-[#22C55E] hover:text-[#22C55E] text-xs font-semibold transition-all disabled:opacity-40"
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