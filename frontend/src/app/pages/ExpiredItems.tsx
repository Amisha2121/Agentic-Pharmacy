import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, AlertTriangle, RefreshCw } from 'lucide-react';

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
      const res = await fetch('/api/expired');
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
      await fetch(`/api/expired/${docId}/dismiss`, { method: 'POST' });
    } catch { /* ignore */ }
    setItems((prev) => prev.filter((a) => a.doc_id !== docId));
  };

  const getSeverityClass = (days: number) => {
    if (days >= 0) {
      if (days > 90) return 'border-rose-600 bg-rose-50/60';
      if (days > 30) return 'border-orange-500 bg-orange-50/60';
      return 'border-yellow-400 bg-yellow-50/60';
    } else {
      if (days < -60) return 'border-emerald-400 bg-emerald-50/60';
      if (days < -30) return 'border-blue-400 bg-blue-50/60';
      return 'border-amber-400 bg-amber-50/60';
    }
  };

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

      <div className="flex-1 flex flex-col pt-20 px-8 max-w-5xl mx-auto w-full space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <AlertTriangle className="w-10 h-10 text-rose-500" />
            <div>
              <h1 className="text-4xl font-extrabold text-[#1E4A4C] tracking-tight">Expirations & Alerts</h1>
              <p className="text-[#2B5B5C]/70 font-medium mt-1">
                {loading ? 'Loading…' : `${items.length} alerted item(s) found`}
              </p>
            </div>
          </div>
          <button onClick={fetchItems} className="flex items-center gap-2 bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-5 py-2.5 rounded-xl font-semibold shadow-md transition-all hover:scale-[1.02]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>



        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.doc_id} className={`rounded-[2rem] p-6 shadow-xl border-2 ${getSeverityClass(item.days_expired)} backdrop-blur-xl transition-all hover:shadow-2xl`}>
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="text-xl font-bold text-gray-900">{item.product_name}</h3>
                    <span className={`inline-flex items-center px-3 py-1 rounded-lg font-bold text-xs border ${
                      item.days_expired >= 0 ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                    }`}>
                      {item.days_expired >= 0 ? `Expired ${item.days_expired}d ago` : `Expires in ${Math.abs(item.days_expired)}d`}
                    </span>
                  </div>
                  <div className="flex items-center flex-wrap gap-2 text-sm font-medium text-gray-600">
                    <span className="bg-white/60 px-3 py-1 rounded-md">Batch: {item.batch_number}</span>
                    <span className="text-gray-300">•</span>
                    <span className="bg-white/60 px-3 py-1 rounded-md">Category: {item.category}</span>
                    <span className="text-gray-300">•</span>
                    <span className="bg-white/60 px-3 py-1 rounded-md">Expiry: {item.expiry_date}</span>
                    <span className="text-gray-300">•</span>
                    <span className="bg-white/60 px-3 py-1 rounded-md">Stock: {item.stock}</span>
                  </div>
                </div>
                <button
                  onClick={() => handleDismiss(item.doc_id)}
                  className="w-full md:w-auto bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all hover:scale-[1.02] shrink-0"
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