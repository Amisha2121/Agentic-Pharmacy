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
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  const handleSave = () => {
    if (!name.trim()) return;
    updateProfile(name.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
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

      <div className="flex-1 flex flex-col pt-20 px-8 max-w-3xl mx-auto w-full space-y-8">
        <div className="flex items-center gap-4">
          <SettingsIcon className="w-10 h-10 text-[#1E4A4C]" />
          <div>
            <h1 className="text-4xl font-extrabold text-[#1E4A4C] tracking-tight">Account Details</h1>
            <p className="text-[#2B5B5C]/70 font-medium mt-1">
              Manage your personal information and preferences
            </p>
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-[2rem] p-8 shadow-xl border-2 border-[#1E4A4C]/10">
          <div className="flex items-center gap-6 mb-8 pb-8 border-b border-gray-200">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-[#1E4A4C] to-[#40aab0] flex items-center justify-center text-white text-3xl font-bold shadow-lg">
              {user?.initials || 'RX'}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{user?.name || 'Pharmacist'}</h2>
              <p className="text-gray-500 font-medium mt-1">Staff Access Level</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#1E4A4C] mb-2 flex items-center gap-2">
                <UserCircle className="w-4 h-4" />
                Display Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your full name"
                className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/40 shadow-sm transition-all"
              />
              <p className="text-sm text-gray-400 mt-2 ml-1">This name will be used to greet you in the chat.</p>
            </div>

            <div className="pt-4 flex items-center gap-4">
              <button
                onClick={handleSave}
                disabled={!name.trim() || name === user?.name}
                className="bg-[#1E4A4C] disabled:bg-gray-300 disabled:text-gray-500 hover:bg-[#2B5B5C] text-white px-8 py-3 rounded-2xl font-bold shadow-lg transition-all hover:scale-[1.02]"
              >
                Save Changes
              </button>
              
              {saved && (
                <div className="flex items-center gap-2 text-emerald-600 font-semibold animate-in fade-in slide-in-from-left-4">
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
