import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, AlertTriangle, RefreshCw } from 'lucide-react';
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

export function ExpiredItems() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [items, setItems] = useState<ExpiredItem[]>([]);
  const [loading, setLoading] = useState(true);

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
    try {
      await authenticatedFetch(`/api/expired/${docId}/dismiss`, { method: 'POST' });
    } catch { /* ignore */ }
    setItems((prev) => prev.filter((a) => a.doc_id !== docId));
  };

  const getSeverityClass = (days: number) => {
    if (days >= 0) {
      if (days > 90) return 'border-[#991B1B] bg-[#1A0000]';
      if (days > 30) return 'border-[#92400E] bg-[#451A03]';
      return 'border-[#854D0E] bg-[#422006]';
    } else {
      if (days < -60) return 'border-[#166534] bg-[#052E16]';
      if (days < -30) return 'border-[#1E3A5F] bg-[#0C1A2E]';
      return 'border-[#92400E] bg-[#451A03]';
    }
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
          <h1 className="text-[18px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Expirations & Alerts</h1>
        </div>
        <button onClick={fetchItems} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex-1 p-6 max-w-[1200px] mx-auto w-full space-y-6">
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-8 h-8 text-[#EF4444]" />
          <div>
            <h2 className="text-[28px] font-medium text-[#3B82F6]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.5px' }}>Expirations & Alerts</h2>
            <p className="text-[#A1A1AA] font-normal text-sm mt-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              {loading ? 'Loading…' : `${items.length} alerted item(s) found`}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.doc_id} className={`rounded-[12px] p-6 shadow-xl border-2 ${getSeverityClass(item.days_expired)} backdrop-blur-xl transition-all hover:opacity-90`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-lg font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{item.product_name}</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded font-medium text-xs border ${
                      item.days_expired >= 0 ? 'bg-[#1A0000] text-[#EF4444] border-[#991B1B]' : 'bg-[#451A03] text-[#FB923C] border-[#92400E]'
                    }`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                      {item.days_expired >= 0 ? `Expired ${item.days_expired}d ago` : `Expires in ${Math.abs(item.days_expired)}d`}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 text-sm font-normal text-[#A1A1AA]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    <span className="bg-[#18181B]/60 px-3 py-1 rounded border border-[#27272A]">Batch: {item.batch_number}</span>
                    <span className="text-[#52525B]">•</span>
                    <span className="bg-[#18181B]/60 px-3 py-1 rounded border border-[#27272A]">Category: {item.category}</span>
                    <span className="text-[#52525B]">•</span>
                    <span className="bg-[#18181B]/60 px-3 py-1 rounded border border-[#27272A]">Expiry: {item.expiry_date}</span>
                    <span className="text-[#52525B]">•</span>
                    <span className="bg-[#18181B]/60 px-3 py-1 rounded border border-[#27272A]">Stock: {item.stock}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(item.doc_id)}
                  className="w-full md:w-auto btn-primary px-8 shrink-0"
                >
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}