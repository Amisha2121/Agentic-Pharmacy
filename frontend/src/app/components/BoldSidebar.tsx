import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, MessageSquare, PackageSearch, ClipboardList, BellRing, Clock, Settings, Home } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function BoldSidebar({ isOpen, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [reorderCount, setReorderCount] = useState(0);
  const [expiredCount, setExpiredCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const [reorderRes, expiredRes] = await Promise.all([
          authenticatedFetch('/api/reorder-alerts'),
          authenticatedFetch('/api/expired')
        ]);
        const reorderData = await reorderRes.json();
        const expiredData = await expiredRes.json();
        setReorderCount(reorderData.alerts?.length ?? 0);
        setExpiredCount(expiredData.items?.length ?? 0);
      } catch {
        // Ignore errors
      }
    };

    fetchCounts();
    const interval = setInterval(fetchCounts, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const mainItems = [
    { icon: Home, label: 'Home', path: '/' },
    { icon: MessageSquare, label: 'Assistant Chat', path: '/chat' },
    { icon: PackageSearch, label: 'Live Inventory', path: '/inventory' },
    { icon: ClipboardList, label: 'Log Daily Sales', path: '/sales' },
  ];

  const alertItems = [
    { icon: BellRing, label: 'Reorder Alerts', path: '/reorder', badge: reorderCount },
    { icon: Clock, label: 'Expirations', path: '/expired', badge: expiredCount },
  ];

  return (
    <div
      className={`bg-white dark:bg-[#1E293B] flex flex-col border-r border-[#0F172A] dark:border-[#F8FAFC] transition-all duration-300 ease-in-out ${
        isOpen ? 'w-[220px]' : 'w-0 -translate-x-full'
      }`}
      style={{ height: '100vh', position: 'relative', zIndex: 30 }}
    >
      <div className="w-[220px] flex flex-col h-full">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[#0F172A] dark:border-[#F8FAFC] transition-colors duration-300">
          <div className="flex items-center">
            <span 
              className="text-[#0F172A] dark:text-[#F8FAFC] text-[20px] font-black uppercase tracking-tight transition-colors duration-300"
              style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.5px' }}
            >
              PHARMAAI
            </span>
          </div>
        </div>

        {/* User Profile */}
        <div className="px-4 py-5">
          <div className="flex items-center gap-3">
            {user?.photoURL ? (
              <img 
                src={user.photoURL} 
                alt={user.name} 
                className="w-11 h-11 rounded-full object-cover border border-[#0F172A] dark:border-[#F8FAFC] transition-colors duration-300" 
                referrerPolicy="no-referrer" 
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#16a34a] flex items-center justify-center text-white text-base font-black border border-[#0F172A] dark:border-[#F8FAFC] transition-colors duration-300">
                {user?.initials ?? 'AM'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#0F172A] dark:text-[#F8FAFC] truncate transition-colors duration-300">
                {user?.name || 'Amisha'}
              </p>
              <div className="mt-1.5">
                <span 
                  className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#16a34a] text-white border border-[#0F172A] dark:border-[#F8FAFC] transition-colors duration-300"
                  style={{ borderRadius: '999px' }}
                >
                  Pharmacist
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 overflow-y-auto">
          {/* MAIN Section */}
          <div className="mb-6">
            <div className="px-3 mb-3">
              <span 
                className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] dark:text-[#64748B] transition-colors duration-300"
                style={{ letterSpacing: '0.1em' }}
              >
                MAIN
              </span>
            </div>
            <div className="space-y-1">
              {mainItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-2.5 text-[13px] font-semibold transition-all ${
                      isActive
                        ? 'bg-[#16a34a] text-white rounded-full'
                        : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F0FDF4] dark:hover:bg-[#334155] rounded-full'
                    }`
                  }
                  style={{ borderRadius: '999px' }}
                >
                  {({ isActive }) => (
                    <>
                      <item.icon 
                        className="w-[18px] h-[18px]" 
                        strokeWidth={2.5}
                      />
                      <span>{item.label}</span>
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>

          {/* ALERTS Section */}
          <div>
            <div className="px-3 mb-3">
              <span 
                className="text-[10px] font-black uppercase tracking-widest text-[#94A3B8] dark:text-[#64748B] transition-colors duration-300"
                style={{ letterSpacing: '0.1em' }}
              >
                ALERTS
              </span>
            </div>
            <div className="space-y-1">
              {alertItems.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center justify-between px-4 py-2.5 text-[13px] font-semibold transition-all ${
                      isActive
                        ? 'bg-[#16a34a] text-white rounded-full'
                        : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F0FDF4] dark:hover:bg-[#334155] rounded-full'
                    }`
                  }
                  style={{ borderRadius: '999px' }}
                >
                  {({ isActive }) => (
                    <>
                      <div className="flex items-center gap-3">
                        <item.icon 
                          className="w-[18px] h-[18px]" 
                          strokeWidth={2.5}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span 
                          className="flex items-center justify-center min-w-[18px] h-[18px] px-2 rounded-full bg-white text-[#16a34a] text-[10px] font-black"
                          style={{ borderRadius: '999px' }}
                        >
                          {item.badge}
                        </span>
                      )}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* Bottom Section */}
        <div className="px-3 py-3 space-y-1 border-t border-[#0F172A] dark:border-[#F8FAFC] transition-colors duration-300">
          <NavLink
            to="/settings"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-[#F0FDF4] dark:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] rounded-full'
                  : 'text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#334155] rounded-full'
              }`
            }
            style={{ borderRadius: '999px' }}
          >
            {({ isActive }) => (
              <>
                <Settings className="w-[18px] h-[18px]" strokeWidth={2} />
                <span className="text-xs">Account Settings</span>
              </>
            )}
          </NavLink>
          
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-[13px] font-medium transition-all text-[#64748B] dark:text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#334155] rounded-full"
            style={{ borderRadius: '999px' }}
          >
            <LogOut className="w-[18px] h-[18px]" strokeWidth={2} />
            <span className="text-xs">Logout</span>
          </button>
        </div>

        {/* System Status */}
        <div className="px-4 py-4 border-t border-[#0F172A] dark:border-[#F8FAFC] transition-colors duration-300">
          <div 
            className="flex items-center justify-center gap-2 px-3 py-2 bg-[#16a34a] rounded-full border border-[#0F172A] dark:border-[#F8FAFC] transition-colors duration-300"
            style={{ borderRadius: '999px' }}
          >
            <div className="w-2 h-2 rounded-full bg-white animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-white">
              LIVE
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
