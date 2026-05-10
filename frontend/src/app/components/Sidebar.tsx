import { NavLink, useNavigate } from 'react-router-dom';
import { LogOut, MessageSquare, PackageSearch, ClipboardList, BellRing, AlertTriangle, Settings, FlaskConical } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useState, useEffect } from 'react';
import { authenticatedFetch } from '../utils/api';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

interface MenuItem {
  icon: React.ReactNode;
  label: string;
  path: string;
  tourId: string;
  badge?: number;
  accent?: string;
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

  const menuItems: MenuItem[] = [
    { icon: <MessageSquare className="w-[18px] h-[18px]" />, label: 'Assistant Chat', path: '/dashboard/chat', tourId: 'nav-chat' },
    { icon: <PackageSearch className="w-[18px] h-[18px]" />, label: 'Live Inventory', path: '/dashboard/inventory', tourId: 'nav-inventory' },
    { icon: <ClipboardList className="w-[18px] h-[18px]" />, label: 'Log Daily Sales', path: '/dashboard/sales', tourId: 'nav-sales' },
    { icon: <BellRing className="w-[18px] h-[18px]" />, label: 'Reorder Alerts', path: '/dashboard/reorder', badge: reorderCount, tourId: 'nav-reorder' },
    { icon: <AlertTriangle className="w-[18px] h-[18px]" />, label: 'Expirations', path: '/dashboard/expired', badge: expiredCount, tourId: 'nav-expired' },
    { icon: <FlaskConical className="w-[18px] h-[18px]" />, label: 'Drug Interactions', path: '/dashboard/interactions', accent: '#A78BFA', tourId: 'nav-ddi' },
  ];

  return (
    <div
      className={`bg-white text-[#111827] flex flex-col border-r border-[#E5E7EB] relative z-20 transition-all duration-300 ease-in-out ${
        isOpen ? 'w-[240px] translate-x-0' : 'w-0 -translate-x-full overflow-hidden opacity-0'
      }`}
      style={{ height: '100vh' }}
    >
      <div className="w-[240px] flex flex-col h-full">
        {/* Logo & User Context */}
        <div className="p-5 px-3">
          {/* Logo */}
          <div className="flex items-center gap-2 mb-5 px-3">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#16a34a] to-[#15803d] border border-[#0F172A]" />
            <span className="text-[#111827] text-lg font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>PharmaAI</span>
          </div>

          {/* User Context */}
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB]">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-[#ECFDF5] flex items-center justify-center text-[#22C55E] text-xs font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>
                {user?.initials ?? 'AM'}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[#111827] text-xs font-medium truncate" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{user?.name || 'Amisha'}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium uppercase tracking-wider bg-[#ECFDF5] text-[#16A34A] border border-[#A7F3D0]" style={{ fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.6px' }}>
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
                  ? 'bg-[#ECFDF5] text-[#111827]'
                  : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]'
              }`}
              style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '14px' }}
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3">
                    <span style={{ color: isActive ? (item.accent ?? '#22C55E') : undefined }}
                      className={!isActive ? 'text-[#6B7280] group-hover:text-[#111827]' : ''}>
                      {item.icon}
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-[#22C55E] text-white text-[10px] font-semibold">
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="px-3 py-2 space-y-1 border-t border-[#E5E7EB]">
          <NavLink
            to="/dashboard/settings"
            data-tour="nav-settings"
            className={({ isActive }) => `flex items-center gap-3 h-10 px-3 rounded-lg font-medium transition-all duration-200 group ${
              isActive
                ? 'bg-[#ECFDF5] text-[#111827]'
                : 'text-[#6B7280] hover:bg-[#F9FAFB] hover:text-[#111827]'
            }`}
            style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '14px' }}
          >
            {({ isActive }) => (
              <>
                <span className={isActive ? 'text-[#22C55E]' : 'text-[#6B7280] group-hover:text-[#111827]'}>
                  <Settings className="w-[18px] h-[18px]" />
                </span>
                <span>Account Settings</span>
              </>
            )}
          </NavLink>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 h-10 px-3 rounded-lg font-medium transition-all duration-200 group text-[#6B7280] hover:bg-[#FEE2E2] hover:text-[#EF4444]"
            style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: '14px' }}
          >
            <span className="text-[#6B7280] group-hover:text-[#EF4444]">
              <LogOut className="w-[18px] h-[18px]" />
            </span>
            <span>Logout</span>
          </button>
        </div>

        {/* System Status */}
        <div className="p-4 px-3 border-t border-[#E5E7EB]">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse-dot"></div>
            <span className="text-[#22C55E] text-xs font-normal" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>All systems online</span>
          </div>
          <p className="text-[#9CA3AF] text-[11px] font-normal" style={{ fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.2px' }}>Last sync 2 min ago</p>
        </div>
      </div>
    </div>
  );
}

