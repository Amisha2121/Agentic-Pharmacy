import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, RefreshCw, ShieldAlert } from 'lucide-react';
import { authenticatedFetch } from '../utils/api';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

interface QuarantineItem {
  doc_id: string;
  product_name: string;
  batch_number: string;
  category: string;
  expiry_date: string;
  logged_at: string;
  reason: string;
}

export function Quarantine() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const [items, setItems] = useState<QuarantineItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await authenticatedFetch('/api/quarantine');
      const data = await res.json();
      setItems(data.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  return (
    <div className="flex-1 flex flex-col h-full w-full relative z-10 overflow-y-auto bg-transparent scrollbar-hide pb-20">
      {/* Topbar */}
      <div className="h-14 bg-[#0E0E11] border-b border-[#27272A] flex items-center justify-between px-7 sticky top-0 z-20">
        <div className="flex items-center gap-4">
          {!isSidebarOpen && (
            <button onClick={() => setIsSidebarOpen(true)} className="w-9 h-9 flex items-center justify-center rounded-lg bg-[#18181B] border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5] hover:bg-[#1F1F23] transition-all">
              <Menu className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-[18px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Quarantine</h1>
        </div>
        <button onClick={fetchItems} className="btn-secondary h-9 px-4 flex items-center gap-2 text-sm">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="flex-1 flex flex-col px-8 pt-8 max-w-5xl mx-auto w-full space-y-8">
        <div className="flex items-center gap-4">
          <ShieldAlert className="w-10 h-10 text-amber-500" />
          <div>
            <h2 className="text-4xl font-extrabold text-[#1E4A4C] tracking-tight">Quarantine</h2>
            <p className="text-[#2B5B5C]/70 font-medium mt-1">
              {loading ? 'Loading…' : `${items.length} item(s) flagged by AI scan`}
            </p>
          </div>
        </div>

        <div className="bg-amber-50/60 border border-amber-200 rounded-2xl p-5 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm font-medium text-amber-800">
            Items here were flagged as <strong>expired</strong> by the AI during image scanning and approved for quarantine via HITL checkpoint. Remove these from your physical pharmacy stock.
          </p>
        </div>

        {!loading && items.length === 0 && (
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-8 text-center">
            <p className="text-2xl mb-2">✅</p>
            <p className="font-bold text-emerald-700 text-lg">No items in quarantine. Inventory is clean!</p>
          </div>
        )}

        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.doc_id} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border-2 border-amber-200 transition-all hover:shadow-2xl">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">{item.product_name}</h3>
                    <span className="inline-flex items-center px-3 py-1 rounded-lg bg-amber-100 text-amber-700 font-bold text-xs border border-amber-200">
                      {item.reason}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 text-sm font-medium text-gray-600">
                    <span className="bg-gray-100 px-3 py-1 rounded-md">Batch: {item.batch_number}</span>
                    <span className="text-gray-300">•</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-md">Category: {item.category}</span>
                    <span className="text-gray-300">•</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-md">Expiry: {item.expiry_date}</span>
                    <span className="text-gray-300">•</span>
                    <span className="bg-gray-100 px-3 py-1 rounded-md">Logged: {item.logged_at}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
