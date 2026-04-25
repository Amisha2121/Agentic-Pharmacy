import { useState, useEffect } from 'react';
import { useOutletContext } from 'react-router';
import { Menu, UserCircle, Settings as SettingsIcon, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

export function Settings() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const { user, updateDisplayName } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleSave = async () => {
    if (!name.trim()) return;
    await updateDisplayName(name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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
          <h1 className="text-[18px] font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.2px' }}>Account Settings</h1>
        </div>
      </div>

      <div className="flex-1 p-6 max-w-[900px] mx-auto w-full space-y-6">
        <div className="flex items-center gap-4">
          <SettingsIcon className="w-8 h-8 text-[#3B82F6]" />
          <div>
            <h2 className="text-[28px] font-medium text-[#3B82F6] tracking-tight" style={{ fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.5px' }}>Account Details</h2>
            <p className="text-[#71717A] font-normal text-sm mt-0.5" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Manage your personal information and preferences
            </p>
          </div>
        </div>

        <div className="glass-card rounded-[12px] p-8">
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-[#27272A]">
            <div className="w-24 h-24 rounded-full bg-[#0C5149] flex items-center justify-center text-white text-3xl font-bold shadow-lg" style={{ fontFamily: 'DM Sans, sans-serif' }}>
              {user?.initials || 'AM'}
            </div>
            <div>
              <h3 className="text-2xl font-medium text-[#F4F4F5]" style={{ fontFamily: 'DM Sans, sans-serif' }}>{user?.name || 'Amisha'}</h3>
              {user?.email && (
                <p className="text-[#71717A] text-sm mt-0.5 font-mono">{user.email}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className={`text-xs font-medium px-2.5 py-1 rounded capitalize ${
                  user?.provider === 'google' ? 'bg-[#0C1A2E] text-[#60A5FA] border border-[#1E3A5F]' :
                  user?.provider === 'phone'  ? 'bg-[#2E1065] text-[#A78BFA] border border-[#4C1D95]' :
                  user?.provider === 'email'  ? 'bg-[#052E16] text-[#22C55E] border border-[#166534]' :
                                                'bg-[#27272A] text-[#A1A1AA] border border-[#3F3F46]'
                }`} style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {user?.provider === 'google' ? '🔵 Google' :
                   user?.provider === 'phone'  ? '📱 Phone' :
                   user?.provider === 'email'  ? '✉️ Email' : '🔑 Legacy'}
                </span>
                <span className="text-[#71717A] text-xs font-normal" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Staff Access</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[12px] font-medium text-[#A1A1AA] mb-2 uppercase tracking-[0.3px] flex items-center gap-2" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                <UserCircle className="w-4 h-4" />
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="input-field"
              />
              <p className="text-sm text-[#71717A] mt-2 ml-1" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>This name will be used to greet you in the chat.</p>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={!name.trim() || name === user?.name}
                className="btn-primary px-8"
              >
                Save Changes
              </button>
              
              {saved && (
                <div className="flex items-center gap-2 text-[#22C55E] font-medium animate-in fade-in slide-in-from-left-4" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Profile updated!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
