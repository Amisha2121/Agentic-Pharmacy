import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, MessageSquare, PackageSearch, ClipboardList, BellRing, AlertTriangle, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
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
    const interval = setInterval(fetchCounts, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { icon: <MessageSquare className="w-[18px] h-[18px]" />, label: 'Assistant Chat', path: '/', tourId: 'nav-chat' },
    { icon: <PackageSearch className="w-[18px] h-[18px]" />, label: 'Live Inventory', path: '/inventory', tourId: 'nav-inventory' },
    { icon: <ClipboardList className="w-[18px] h-[18px]" />, label: 'Log Daily Sales', path: '/sales', tourId: 'nav-sales' },
    { icon: <BellRing className="w-[18px] h-[18px]" />, label: 'Reorder Alerts', path: '/reorder', badge: reorderCount, tourId: 'nav-reorder' },
    { icon: <AlertTriangle className="w-[18px] h-[18px]" />, label: 'Expirations', path: '/expired', badge: expiredCount, tourId: 'nav-expired' },
  ];

  return (
    <div
      className={`bg-[#0E0E11] text-white flex flex-col border-r border-[#27272A] relative z-20 transition-all duration-300 ease-in-out ${
        isOpen ? 'w-[240px] translate-x-0' : 'w-0 -translate-x-full overflow-hidden opacity-0'
      }`}
      style={{ height: '100vh' }}
    >
      <div className="w-[240px] flex flex-col h-full">
        {/* Logo & User Context */}
        <div className="p-5 px-3">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-5 px-3">
            <div className="w-7 h-7 rounded-lg bg-[#3B82F6] flex items-center justify-center">
              <span className="text-white text-sm font-bold">💊</span>
            </div>
            <span className="text-[#F4F4F5] text-lg font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>PharmaAI</span>
          </div>

          {/* User Context */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#111113] border border-[#27272A]">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#0C1A2E] flex items-center justify-center text-[#3B82F6] text-xs font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {user?.initials ?? 'AM'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[#F4F4F5] text-xs font-medium truncate" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{user?.name || 'Amisha'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-[#0C1A2E] text-[#60A5FA] border border-[#1E3A5F]" style={{ fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.6px' }}>
                  Pharmacist
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-1 overflow-y-auto scrollbar-hide">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              end={item.path === '/'}
              data-tour={item.tourId}
              className={({ isActive }) => `flex items-center justify-between h-10 px-3 rounded-lg font-medium transition-all duration-200 group ${
                isActive
                  ? 'bg-[#1A2535] text-[#F4F4F5]'
                  : 'text-[#71717A] hover:bg-[#111113] hover:text-[#A1A1AA]'
              }`}
              style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '14px' }}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <span className={isActive ? 'text-[#3B82F6]' : 'text-[#71717A] group-hover:text-[#A1A1AA]'}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#3B82F6] text-white text-[10px] font-semibold">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 py-2 space-y-1 border-t border-[#27272A]">
          <NavLink
            to="/settings"
            data-tour="nav-settings"
            className={({ isActive }) => `flex items-center gap-3 h-10 px-3 rounded-lg font-medium transition-all duration-200 group ${
              isActive
                ? 'bg-[#1A2535] text-[#F4F4F5]'
                : 'text-[#71717A] hover:bg-[#111113] hover:text-[#A1A1AA]'
            }`}
            style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '14px' }}
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-[#3B82F6]' : 'text-[#71717A] group-hover:text-[#A1A1AA]'}>
                  <Settings className="w-[18px] h-[18px]" />
                </span>
                <span>Account Settings</span>
              </>
            )}
          </NavLink>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 h-10 px-3 rounded-lg font-medium transition-all duration-200 group text-[#71717A] hover:bg-[#1A1A1D] hover:text-[#EF4444]"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '14px' }}
          >
            <span className="text-[#71717A] group-hover:text-[#EF4444]">
              <LogOut className="w-[18px] h-[18px]" />
            </span>
            <span>Logout</span>
          </button>
        </div>

        {/* System Status */}
        <div className="p-4 px-3 border-t border-[#27272A]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot"></div>
            <span className="text-[#22C55E] text-xs font-normal" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>All systems online</span>
          </div>
          <p className="text-[#52525B] text-[11px] font-normal" style={{ fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.2px' }}>Last sync 2 min ago</p>
        </div>
      </div>
    </div>
  );
}

