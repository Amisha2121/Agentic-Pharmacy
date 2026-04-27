import { NavLink, useNavigate } from 'react-router-dom';
import { ChevronLeft, LogOut, MessageSquare, ClipboardList, BellRing, AlertTriangle, PackageSearch, ShieldAlert, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface SidebarProps {
  isOpen: boolean;
  onToggle: () => void;
}

export function Sidebar({ isOpen, onToggle }: SidebarProps) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const menuItems = [
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Assistant Chat', path: '/', tourId: 'nav-chat' },
    { icon: <PackageSearch className="w-5 h-5" />, label: 'Live Inventory Dashboard', path: '/inventory', tourId: 'nav-inventory' },
    { icon: <ClipboardList className="w-5 h-5" />, label: 'Log Daily Sales', path: '/sales', tourId: 'nav-sales' },
    { icon: <BellRing className="w-5 h-5" />, label: 'Reorder Alerts', path: '/reorder', tourId: 'nav-reorder' },
    { icon: <AlertTriangle className="w-5 h-5" />, label: 'Expired Items', path: '/expired', tourId: 'nav-expired' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings', tourId: 'nav-settings' },
  ];

  return (
    <div
      className={`bg-gradient-to-b from-[#0d3d3f] via-[#0f4a4d] to-[#0d3d3f] text-white flex flex-col shadow-2xl relative z-20 transition-all duration-300 ease-in-out ${
        isOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full overflow-hidden opacity-0'
      }`}
    >
      {/* Animated Background Orbs */}
      <div className="absolute top-10 right-10 w-40 h-40 bg-teal-400/20 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
      <div className="absolute bottom-20 left-10 w-32 h-32 bg-cyan-400/15 rounded-full blur-3xl pointer-events-none animate-pulse" style={{ animationDelay: '1s' }}></div>

      <div className="w-[280px] flex flex-col h-full relative z-10">
        {/* Header */}
        <div className="p-6 flex items-center justify-between border-b border-white/10">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-white to-teal-200 bg-clip-text text-transparent">PharmaAI</h1>
            <p className="text-[10px] font-semibold text-teal-200/70 tracking-widest uppercase mt-1">Smart Pharmacy System</p>
          </div>
          <button
            onClick={onToggle}
            className="p-2.5 hover:bg-white/10 rounded-2xl transition-all duration-300 transform hover:scale-105 hover:rotate-180 border border-white/5"
          >
            <ChevronLeft className="w-5 h-5 text-teal-200" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto scrollbar-hide">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              end={item.path === '/'}
              data-tour={item.tourId}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3.5 rounded-2xl font-semibold transition-all duration-300 group relative overflow-hidden ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500 to-cyan-500 shadow-lg shadow-teal-500/30 text-white scale-[1.02]'
                  : 'text-teal-100/80 hover:bg-white/10 hover:text-white hover:scale-[1.01]'
              }`}
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <div className="absolute inset-0 bg-gradient-to-r from-teal-400/20 to-cyan-400/20 blur-xl"></div>
                  )}
                  <span className={`relative z-10 ${isActive ? 'text-white' : 'text-teal-200/80 group-hover:text-white'} transition-colors duration-300`}>
                    {item.icon}
                  </span>
                  <span className="relative z-10">{item.label}</span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-5 border-t border-white/10 bg-black/20 backdrop-blur-md">
          <div onClick={() => navigate('/settings')} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 shadow-sm cursor-pointer hover:bg-white/10 transition-all duration-300 mb-4 hover:scale-[1.02]">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full object-cover shadow-lg ring-2 ring-teal-400/50" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-bold text-white shadow-lg text-sm uppercase ring-2 ring-white/20">
                {user?.initials ?? 'RX'}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{user?.name || 'Pharmacy Staff'}</p>
              <p className="text-[10px] font-medium text-teal-200/70 uppercase tracking-wider capitalize">{user?.provider ?? 'Staff'} · Access</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-2xl bg-white/5 hover:bg-red-500/20 hover:shadow-lg hover:shadow-red-500/20 transition-all duration-300 text-white text-sm font-semibold border border-white/10 hover:border-red-400/50 group hover:scale-[1.02]"
          >
            <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
            <span className="group-hover:text-red-400 transition-colors">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}