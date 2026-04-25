import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, RefreshCw, AlertCircle, PackageX } from 'lucide-react';

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
      const res = await fetch('/api/reorder-alerts');
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
      await fetch(`/api/reorder-alerts/${docId}/dismiss`, { method: 'POST' });
    } catch { /* ignore */ }
    setAlerts((prev) => prev.filter((a) => a.doc_id !== docId));
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
        <div>
          <h1 className="text-4xl font-extrabold text-[#1E4A4C] mb-3 tracking-tight">Reorder Alerts</h1>
          <p className="text-[#2B5B5C]/80 font-medium text-lg">
            Items with <strong className="text-rose-500">zero or low stock</strong> listed below. Click Dismiss once you've placed the reorder.
          </p>
        </div>

        <div className="flex items-center">
          <button onClick={fetchAlerts} className="flex items-center justify-center gap-2 bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-6 py-3 rounded-xl font-semibold shadow-md transition-all hover:scale-[1.02]">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        {!loading && alerts.length > 0 && (
          <div className="bg-rose-50/80 backdrop-blur-sm border border-rose-200 rounded-2xl p-5 flex items-center gap-3 shadow-sm">
            <AlertCircle className="w-5 h-5 text-rose-500" />
            <p className="font-bold text-rose-700">{alerts.length} medicine(s) need restocking</p>
          </div>
        )}

        <div className="space-y-4">
          {alerts.map((item) => (
            <div key={item.doc_id} className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-6 shadow-xl border border-white/50 flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all hover:shadow-2xl hover:bg-white/90">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-gray-900">{item.product_name}</h3>
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs border ${
                    item.stock === 0 ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-orange-100 text-orange-700 border-orange-200'
                  }`}>Stock: {item.stock}</span>
                </div>
                <div className="flex items-center flex-wrap gap-2 text-sm font-medium text-gray-500">
                  <span className="bg-gray-100 px-3 py-1 rounded-md">Batch: {item.batch_number}</span>
                  <span className="text-gray-300">•</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-md">Category: {item.category}</span>
                  <span className="text-gray-300">•</span>
                  <span className="bg-gray-100 px-3 py-1 rounded-md">Expiry: {item.expiry_date}</span>
                </div>
              </div>
              <button onClick={() => handleDismiss(item.doc_id)} className="w-full md:w-auto bg-[#1E4A4C] hover:bg-[#2B5B5C] text-white px-8 py-3 rounded-xl font-bold shadow-md transition-all hover:scale-[1.02] shrink-0">
                Dismiss
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}