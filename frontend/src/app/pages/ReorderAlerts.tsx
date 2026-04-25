import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, RefreshCw, AlertCircle, PackageX } from 'lucide-react';
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
    try {
      await authenticatedFetch(`/api/reorder-alerts/${docId}/dismiss`, { method: 'POST' });
    } catch { /* ignore */ }
    setAlerts((prev) => prev.filter((a) => a.doc_id !== docId));
  };

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
          <h1 className="text-[18px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Reorder Alerts</h1>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-[1200px] mx-auto w-full space-y-6">
        <div>
          <h2 className="text-[28px] font-medium text-[#3B82F6] mb-2" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.5px' }}>Reorder Alerts</h2>
          <p className="text-[#A1A1AA] font-normal text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
            Items with <strong className="text-[#EF4444]">zero or low stock</strong> listed below. Click Dismiss once you've placed the reorder.
          </p>
        </div>

        <div className="flex items-center">
          <button onClick={fetchAlerts} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {!loading && alerts.length > 0 && (
          <div className="bg-[#1A0000] border border-[#991B1B] rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#EF4444]" />
            <p className="font-medium text-[#FCA5A5] text-sm" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{alerts.length} medicine(s) need restocking</p>
          </div>
        )}

        <div className="space-y-4">
          {alerts.map((item) => (
            <div key={item.doc_id} className="glass-card rounded-[12px] p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-[#111113] transition-all">
              <div className="space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-lg font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{item.product_name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded font-medium text-xs border ${
                    item.stock === 0 ? 'bg-[#1A0000] text-[#EF4444] border-[#991B1B]' : 'bg-[#451A03] text-[#FB923C] border-[#92400E]'
                  }`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Stock: {item.stock}</span>
                </div>
                <div className="flex items-center flex-wrap gap-2 text-sm font-normal text-[#A1A1AA]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  <span className="bg-[#18181B] px-3 py-1 rounded border border-[#27272A]">Batch: {item.batch_number}</span>
                  <span className="text-[#52525B]">•</span>
                  <span className="bg-[#18181B] px-3 py-1 rounded border border-[#27272A]">Category: {item.category}</span>
                  <span className="text-[#52525B]">•</span>
                  <span className="bg-[#18181B] px-3 py-1 rounded border border-[#27272A]">Expiry: {item.expiry_date}</span>
                </div>
              </div>
              <button onClick={() => handleDismiss(item.doc_id)} className="w-full md:w-auto btn-primary px-8 shrink-0">
                Dismiss
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}