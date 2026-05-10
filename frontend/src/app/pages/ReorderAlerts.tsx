import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, RefreshCw, PackageX, Check } from 'lucide-react';
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

export function ReorderAlerts() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [alerts, setAlerts] = useState<ReorderAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<string[]>([]);

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

      <div className="flex-1 pt-14 sm:pt-16 px-4 sm:px-6 lg:px-8 pb-8 sm:pb-12 max-w-7xl mx-auto w-full">
        {/* Page heading */}
        <div className="mb-6 sm:mb-8 flex flex-col sm:flex-row sm:items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase text-[#0F172A] tracking-tight mb-1 sm:mb-2">
              Reorder Alerts
            </h1>
            <p className="text-sm text-[#64748B] font-medium">
              {loading ? 'Loading…' : alerts.length === 0 ? 'All products are well-stocked.' : `${alerts.length} product${alerts.length !== 1 ? 's' : ''} require restocking`}
            </p>
          </div>
          <button 
            onClick={fetchAlerts} 
            className="px-5 py-2.5 text-sm font-bold text-[#0F172A] border-2 border-[#0F172A] bg-white hover:bg-[#F0FDF4] transition-all flex items-center gap-2"
            style={{ borderRadius: '999px' }}
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} strokeWidth={2.5} />
            Refresh
          </button>
        </div>

        {/* Empty state */}
        {!loading && alerts.length === 0 && (
          <div className="bg-white border-2 border-[#0F172A] rounded-3xl flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-full bg-[#F0FDF4] border-2 border-[#16a34a] flex items-center justify-center">
              <Check className="w-7 h-7 text-[#16a34a]" strokeWidth={3} />
            </div>
            <p className="text-[#0F172A] font-black text-lg uppercase tracking-wide">All Products Well-Stocked</p>
            <p className="text-[#64748B] text-sm font-medium">No reorder alerts at this time.</p>
          </div>
        )}

        {/* Table */}
        {!loading && alerts.length > 0 && (
          <div className="bg-white border-2 border-[#0F172A] rounded-3xl overflow-hidden">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b-2 border-[#E2E8F0]">
                  <th className="px-6 py-4 text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Product</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Batch</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-4 text-[10px] font-black text-[#94A3B8] uppercase tracking-widest">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3F4F6]">
                {alerts.map(item => (
                  <tr
                    key={item.doc_id}
                    className="hover:bg-[#F8FAFC] transition-all"
                    style={{ opacity: dismissed.includes(item.doc_id) ? 0.3 : 1, transition: 'opacity 0.3s' }}
                  >
                    <td className="px-6 py-4">
                      {item.stock === 0
                        ? <span className="inline-flex items-center gap-2 px-4 py-2 bg-[#FEE2E2] text-[#DC2626] border-2 border-[#0F172A] text-xs font-black" style={{ borderRadius: '999px' }}>
                            <PackageX className="w-3.5 h-3.5" strokeWidth={2.5} /> OUT OF STOCK
                          </span>
                        : <span className="inline-flex items-center px-4 py-2 bg-[#FEF3C7] text-[#D97706] border-2 border-[#0F172A] text-xs font-black" style={{ borderRadius: '999px' }}>
                            LOW STOCK
                          </span>
                      }
                    </td>
                    <td className="px-6 py-4 font-bold text-[#0F172A] text-sm">{item.product_name}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] text-[#64748B]">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono text-xs text-[#94A3B8]">{item.batch_number}</td>
                    <td className="px-6 py-4">
                      <span className={`text-sm font-black ${item.stock === 0 ? 'text-[#EF4444]' : 'text-[#F59E0B]'}`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleDismiss(item.doc_id)}
                        disabled={dismissed.includes(item.doc_id)}
                        className="flex items-center gap-2 px-5 py-2 text-xs font-bold text-[#0F172A] border-2 border-[#0F172A] bg-white hover:bg-[#F0FDF4] transition-all disabled:opacity-40"
                        style={{ borderRadius: '999px' }}
                      >
                        <Check className="w-3.5 h-3.5" strokeWidth={2.5} /> Dismiss
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
          <div className="space-y-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-white border-2 border-[#0F172A] rounded-3xl h-20 animate-pulse" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}