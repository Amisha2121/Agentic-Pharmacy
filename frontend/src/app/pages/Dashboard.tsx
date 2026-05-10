import { useOutletContext, useNavigate } from 'react-router-dom';
import { Menu, MessageSquare, PackageSearch, ClipboardList, BellRing, Clock, ArrowRight, X, TrendingUp, AlertCircle, Bell } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';
import { useAuth } from '../context/AuthContext';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export function Dashboard() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    expiringThisMonth: 0,
    lowStock: 0,
    salesToday: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const [expiredRes, reorderRes, salesRes] = await Promise.all([
        authenticatedFetch('/api/expired'),
        authenticatedFetch('/api/reorder-alerts'),
        authenticatedFetch('/api/sales/today'),
      ]);
      const expiredData = await expiredRes.json();
      const reorderData = await reorderRes.json();
      const salesData = await salesRes.json();
      
      const expiringThisMonth = (expiredData.items ?? []).filter((item: any) => {
        const days = item.days_expired;
        return days < 0 && Math.abs(days) <= 30;
      }).length;
      
      setStats({
        expiringThisMonth,
        lowStock: reorderData.alerts?.length ?? 0,
        salesToday: (salesData.logs ?? []).reduce((sum: number, log: any) => sum + log.qty_sold, 0),
      });
    } catch { /* ignore */ }
  };

  const quickAccessCards = [
    { 
      icon: MessageSquare, 
      label: 'Assistant Chat', 
      description: 'AI-powered pharmacy assistant',
      path: '/chat',
      color: '#16a34a'
    },
    { 
      icon: PackageSearch, 
      label: 'Live Inventory', 
      description: 'View and manage stock',
      path: '/inventory',
      color: '#16a34a'
    },
    { 
      icon: ClipboardList, 
      label: 'Log Daily Sales', 
      description: 'Record dispensed medicines',
      path: '/sales',
      color: '#16a34a'
    },
    { 
      icon: BellRing, 
      label: 'Reorder Alerts', 
      description: 'Items running low',
      path: '/reorder',
      color: '#F59E0B'
    },
    { 
      icon: Clock, 
      label: 'Expirations', 
      description: 'Expiring medicines',
      path: '/expired',
      color: '#EF4444'
    },
  ];

  return (
    <div className="flex-1 flex flex-col h-screen w-full relative z-10 bg-[#F8FAFC] dark:bg-[#0F172A] overflow-hidden transition-colors duration-300">
      <div className="flex items-center justify-between p-4 absolute top-0 w-full z-20">
        <div className="flex items-center">
          {!isSidebarOpen && (
            <button 
              onClick={() => setIsSidebarOpen(true)} 
              className="w-10 h-10 flex items-center justify-center rounded-full bg-white dark:bg-[#1E293B] border-2 border-[#0F172A] dark:border-[#F8FAFC] text-[#0F172A] dark:text-[#F8FAFC] hover:bg-[#F0FDF4] dark:hover:bg-[#334155] transition-all"
            >
              <Menu className="w-5 h-5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 pt-20 px-8 pb-12 max-w-7xl mx-auto w-full overflow-y-auto" style={{ 
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E1 transparent'
      }}>
        <div className="mb-8">
          <div className="mb-3">
            <h1 className="text-3xl font-black uppercase text-[#0F172A] dark:text-[#F8FAFC] tracking-tight transition-colors duration-300" style={{ fontFamily: 'Inter, sans-serif' }}>
              WELCOME BACK
            </h1>
            <p className="text-[14px] text-[#64748B] dark:text-[#94A3B8] font-semibold transition-colors duration-300">
              {user?.name || 'Amisha'} • {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#94A3B8] dark:text-[#64748B] mb-4 transition-colors duration-300">
            TODAY'S OVERVIEW
          </h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/expired')}
              className="group bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950 dark:to-orange-950 border border-[#0F172A] dark:border-[#F8FAFC] rounded-3xl p-6 text-left hover:shadow-lg transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500 border border-[#0F172A] dark:border-[#F8FAFC] flex items-center justify-center transition-colors duration-300">
                    <Clock className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-amber-600 dark:text-amber-400 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </div>
                <p className="text-4xl font-black text-[#0F172A] dark:text-[#F8FAFC] mb-2 transition-colors duration-300">{stats.expiringThisMonth}</p>
                <p className="text-sm font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide transition-colors duration-300">Expiring Soon</p>
                <p className="text-xs text-amber-600 dark:text-amber-500 mt-1 transition-colors duration-300">Items expiring this month</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/reorder')}
              className="group bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-950 dark:to-pink-950 border border-[#0F172A] dark:border-[#F8FAFC] rounded-3xl p-6 text-left hover:shadow-lg transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-red-500 border border-[#0F172A] flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-red-600 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </div>
                <p className="text-4xl font-black text-[#0F172A] mb-2">{stats.lowStock}</p>
                <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Low Stock</p>
                <p className="text-xs text-red-600 mt-1">Items need reordering</p>
              </div>
            </button>

            <button
              onClick={() => navigate('/sales')}
              className="group bg-gradient-to-br from-green-50 to-emerald-50 border border-[#0F172A] rounded-3xl p-6 text-left hover:shadow-lg transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-green-400 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity" />
              <div className="relative">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 rounded-full bg-green-500 border border-[#0F172A] flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" strokeWidth={2.5} />
                  </div>
                  <ArrowRight className="w-5 h-5 text-green-600 group-hover:translate-x-1 transition-transform" strokeWidth={2.5} />
                </div>
                <p className="text-4xl font-black text-[#0F172A] mb-2">{stats.salesToday}</p>
                <p className="text-sm font-bold text-green-700 uppercase tracking-wide">Sales Today</p>
                <p className="text-xs text-green-600 mt-1">Units dispensed</p>
              </div>
            </button>
          </div>
        </div>

        <div className="mb-8">
          <h2 className="text-xs font-black uppercase tracking-widest text-[#94A3B8] mb-4">
            QUICK ACCESS
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {quickAccessCards.map((card) => (
              <button
                key={card.label}
                onClick={() => navigate(card.path)}
                className="group bg-white border border-[#0F172A] rounded-3xl p-6 text-left hover:bg-[#F0FDF4] hover:shadow-lg transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div 
                    className="w-14 h-14 rounded-full flex items-center justify-center border border-[#0F172A]"
                    style={{ backgroundColor: `${card.color}15` }}
                  >
                    <card.icon className="w-7 h-7" style={{ color: card.color }} strokeWidth={2.5} />
                  </div>
                  <ArrowRight 
                    className="w-5 h-5 text-[#16a34a] group-hover:translate-x-1 transition-transform" 
                    strokeWidth={2.5}
                  />
                </div>
                <h3 className="text-base font-black text-[#0F172A] mb-2 uppercase tracking-tight">
                  {card.label}
                </h3>
                <p className="text-xs text-[#64748B] leading-relaxed">
                  {card.description}
                </p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
