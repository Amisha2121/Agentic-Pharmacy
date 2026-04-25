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
    { icon: <MessageSquare className="w-5 h-5" />, label: 'Assistant Chat', path: '/' },
    { icon: <PackageSearch className="w-5 h-5" />, label: 'Live Inventory Dashboard', path: '/inventory' },
    { icon: <ClipboardList className="w-5 h-5" />, label: 'Log Daily Sales', path: '/sales' },
    { icon: <BellRing className="w-5 h-5" />, label: 'Reorder Alerts', path: '/reorder' },
    { icon: <AlertTriangle className="w-5 h-5" />, label: 'Expired Items', path: '/expired' },
    { icon: <Settings className="w-5 h-5" />, label: 'Settings', path: '/settings' },
  ];

  return (
    <div
      className={`bg-[#1E4A4C] text-white flex flex-col shadow-2xl relative z-20 border-r border-[#2B5B5C] transition-all duration-300 ease-in-out ${
        isOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full overflow-hidden opacity-0'
      }`}
    >
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-[#2B5B5C]/50 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-[280px] flex flex-col h-full">
        {/* Header */}
        <div className="p-6 relative z-10 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">PharmaAI</h1>
            <p className="text-[10px] font-semibold text-[#C5D3D3]/80 tracking-widest uppercase mt-1">Smart Pharmacy System</p>
          </div>
          <button
            onClick={onToggle}
            className="p-2 hover:bg-[#2B5B5C] rounded-xl transition-all duration-300 transform hover:scale-105"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-2 space-y-2 overflow-y-auto scrollbar-hide relative z-10">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => `flex items-center gap-3 px-4 py-3 rounded-2xl font-medium transition-all duration-300 group ${
                isActive
                  ? 'bg-gradient-to-r from-[#2B5B5C] to-[#1E4A4C] shadow-lg text-white border border-[#2B5B5C]/50'
                  : 'text-[#C5D3D3] hover:bg-[#2B5B5C]/40 hover:text-white border border-transparent'
              }`}
            >
              {({ isActive }) => (
                <>
                  <span className={`${isActive ? 'text-white' : 'text-[#C5D3D3] group-hover:text-white'} transition-colors duration-300`}>
                    {item.icon}
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Bottom Section */}
        <div className="p-5 border-t border-[#2B5B5C]/50 bg-[#1E4A4C]/80 backdrop-blur-md relative z-10">
          <div onClick={() => navigate('/settings')} className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10 shadow-sm cursor-pointer hover:bg-white/10 transition-colors mb-4 mx-2">
            {user?.photoURL ? (
              <img src={user.photoURL} alt={user.name} className="w-9 h-9 rounded-full object-cover shadow-inner" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#C5D3D3] flex items-center justify-center font-bold text-[#1E4A4C] shadow-inner text-sm uppercase">
                {user?.initials ?? 'RX'}
              </div>
            )}
            <div>
              <p className="text-sm font-semibold text-white leading-tight">{user?.name || 'Pharmacy Staff'}</p>
              <p className="text-[10px] font-medium text-[#C5D3D3]/70 uppercase tracking-wider capitalize">{user?.provider ?? 'Staff'} · Access</p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl bg-white/5 hover:bg-red-500/20 hover:shadow-lg transition-all duration-300 text-white text-sm font-medium border border-white/5 hover:border-red-500/30 group"
          >
            <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" />
            <span className="group-hover:text-red-400 transition-colors">Logout</span>
          </button>
        </div>
      </div>
    </div>
  );
}