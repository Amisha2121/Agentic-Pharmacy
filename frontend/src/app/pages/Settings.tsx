import { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router';
import {
  Menu, UserCircle, CheckCircle2, Bell, Shield, Palette,
  Database, LogOut, ChevronRight, Trash2, Download, Clock,
  Globe, Lock, Smartphone, Mail, AlertTriangle, Pill,
  Activity, Monitor, Save, RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { authenticatedFetch } from '../utils/api';

interface ContextType {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (isOpen: boolean) => void;
}

const PREFS_KEY = 'pharma_prefs_v1';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY) || '{}'); }
  catch { return {}; }
}
function savePrefs(patch: Record<string, unknown>) {
  localStorage.setItem(PREFS_KEY, JSON.stringify({ ...loadPrefs(), ...patch }));
}

/* ─── tiny reusable components ─────────────────────────────────── */

function Section({ icon, title, subtitle, children }: {
  icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode;
}) {
  return (
    <div className="bg-white dark:bg-[#1E293B] border-2 border-[#0F172A] dark:border-[#F8FAFC] rounded-3xl overflow-hidden mb-6 transition-colors duration-300">
      <div className="px-6 py-5 border-b-2 border-[#E2E8F0] dark:border-[#334155] flex items-center gap-3 transition-colors duration-300">
        <div className="w-9 h-9 rounded-full bg-[#16a34a] border-2 border-[#0F172A] dark:border-[#F8FAFC] flex items-center justify-center text-white flex-shrink-0 transition-colors duration-300">
          {icon}
        </div>
        <div>
          <p className="m-0 text-sm font-black text-[#0F172A] dark:text-[#F8FAFC] uppercase tracking-wide transition-colors duration-300">{title}</p>
          <p className="mt-0.5 text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold transition-colors duration-300">{subtitle}</p>
        </div>
      </div>
      <div className="px-6 py-4">{children}</div>
    </div>
  );
}

function Row({ label, sub, right, danger, noBorder }: {
  label: string; sub?: string; right: React.ReactNode; danger?: boolean; noBorder?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 transition-colors duration-300 ${noBorder ? '' : 'border-b border-[#E2E8F0] dark:border-[#334155]'}`}>
      <div className="flex-1">
        <p className={`m-0 text-sm font-bold transition-colors duration-300 ${danger ? 'text-[#EF4444] dark:text-[#FCA5A5]' : 'text-[#0F172A] dark:text-[#F8FAFC]'}`}>{label}</p>
        {sub && <p className="mt-1 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed transition-colors duration-300">{sub}</p>}
      </div>
      <div className="flex-shrink-0">{right}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`w-11 h-6 rounded-full border-2 cursor-pointer relative transition-all duration-200 flex-shrink-0 ${
        checked 
          ? 'bg-[#16a34a] border-[#0F172A] dark:border-[#F8FAFC]' 
          : 'bg-[#F8FAFC] dark:bg-[#334155] border-[#0F172A] dark:border-[#F8FAFC]'
      }`}
    >
      <span 
        className={`absolute top-0.5 w-[18px] h-[18px] rounded-full bg-white dark:bg-[#F8FAFC] border-2 border-[#0F172A] dark:border-[#0F172A] transition-all duration-200 ${
          checked ? 'left-[21px]' : 'left-0.5'
        }`}
      />
    </button>
  );
}

function Chip({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <span 
      className="text-[11px] font-bold px-3 py-1 rounded-full border-2 border-[#0F172A] dark:border-white inline-flex items-center gap-1.5 transition-colors duration-300"
      style={{ 
        backgroundColor: color === '#0F172A' ? 'rgba(15, 23, 42, 0.15)' : color + '15', 
        color: color === '#0F172A' ? '#0F172A' : color 
      }}
    >
      {icon}{label}
    </span>
  );
}

function ActionBtn({ children, onClick, danger, icon }: {
  children: React.ReactNode; onClick?: () => void; danger?: boolean; icon?: React.ReactNode;
}) {
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className={`flex items-center gap-1.5 border-2 rounded-full px-4 py-2 text-xs font-bold cursor-pointer transition-all duration-200 uppercase tracking-wide ${
        danger 
          ? hover 
            ? 'bg-[#FEE2E2] dark:bg-[#7F1D1D] text-[#EF4444] dark:text-[#FCA5A5] border-[#0F172A] dark:border-[#F8FAFC]' 
            : 'bg-white dark:bg-[#1E293B] text-[#EF4444] dark:text-[#FCA5A5] border-[#0F172A] dark:border-[#F8FAFC]'
          : hover 
            ? 'bg-[#F0FDF4] dark:bg-[#334155] text-[#0F172A] dark:text-[#F8FAFC] border-[#0F172A] dark:border-[#F8FAFC]' 
            : 'bg-white dark:bg-[#1E293B] text-[#0F172A] dark:text-[#F8FAFC] border-[#0F172A] dark:border-[#F8FAFC]'
      }`}
    >
      {icon}{children}
    </button>
  );
}

/* ─── Main Page ─────────────────────────────────────────────────── */

export function Settings() {
  const { isSidebarOpen, setIsSidebarOpen } = useOutletContext<ContextType>();
  const { user, updateDisplayName, logout } = useAuth();

  // Profile
  const [name, setName] = useState(user?.name || '');
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  // Preferences — loaded from localStorage
  const prefs = loadPrefs();
  const [notifReorder, setNotifReorder] = useState<boolean>(prefs.notifReorder ?? true);
  const [notifExpiry,  setNotifExpiry]  = useState<boolean>(prefs.notifExpiry  ?? true);
  const [notifChat,    setNotifChat]    = useState<boolean>(prefs.notifChat    ?? false);
  const [notifWeekly,  setNotifWeekly]  = useState<boolean>(prefs.notifWeekly  ?? true);
  const [compactMode,  setCompactMode]  = useState<boolean>(prefs.compactMode  ?? false);
  const [animations,   setAnimations]   = useState<boolean>(prefs.animations   ?? true);
  const [saveHistory,  setSaveHistory]  = useState<boolean>(prefs.saveHistory  ?? true);
  const [analytics,    setAnalytics]    = useState<boolean>(prefs.analytics    ?? false);
  const [theme,        setTheme]        = useState<'light' | 'dark'>(prefs.theme ?? 'light');

  // Persist pref changes immediately
  const pref = useCallback((key: string, val: unknown) => savePrefs({ [key]: val }), []);

  // Apply compact mode to root
  useEffect(() => {
    document.documentElement.style.setProperty('--spacing-scale', compactMode ? '0.8' : '1');
  }, [compactMode]);

  // Apply animations flag
  useEffect(() => {
    document.documentElement.style.setProperty('--transition-speed', animations ? '0.3s' : '0s');
  }, [animations]);

  // Apply theme
  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => { if (user?.name) setName(user.name); }, [user]);

  const handleSave = async () => {
    if (!name.trim() || name === user?.name) return;
    setSaving(true);
    await updateDisplayName(name.trim());
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleExport = async () => {
    try {
      const [inv, sessions] = await Promise.all([
        authenticatedFetch('/api/inventory').then(r => r.json()),
        authenticatedFetch('/api/sessions').then(r => r.json()),
      ]);
      const blob = new Blob([JSON.stringify({ inventory: inv, sessions }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `pharma-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click(); URL.revokeObjectURL(url);
    } catch { alert('Export failed. Make sure the backend is running.'); }
  };

  const handleClearHistory = async () => {
    if (!confirm('Delete ALL saved chat sessions? This cannot be undone.')) return;
    try {
      const data = await authenticatedFetch('/api/sessions').then(r => r.json());
      await Promise.all((data.sessions ?? []).map((s: { thread_id: string }) =>
        authenticatedFetch(`/api/sessions/${s.thread_id}`, { method: 'DELETE' })
      ));
      alert('All chat history cleared.');
    } catch { alert('Failed to clear history.'); }
  };

  const handleMigrateLegacy = async () => {
    if (!confirm('This will copy all original global inventory items into your private account. Continue?')) return;
    try {
      const res = await authenticatedFetch('/api/migrate-legacy', { method: 'POST' });
      const data = await res.json();
      alert(`Migration complete! Copied ${data.migrated} items to your account.`);
    } catch {
      alert('Failed to migrate legacy data.');
    }
  };

  const providerIcon = user?.provider === 'google' ? <Globe size={12} /> :
                       user?.provider === 'phone'  ? <Smartphone size={12} /> :
                       user?.provider === 'email'  ? <Mail size={12} /> : <Lock size={12} />;
  const providerLabel = user?.provider === 'google' ? 'Google' :
                        user?.provider === 'phone'  ? 'Phone OTP' :
                        user?.provider === 'email'  ? 'Email' : 'Legacy';
  const providerColor = user?.provider === 'google' ? '#60A5FA' :
                        user?.provider === 'phone'  ? '#A78BFA' :
                        user?.provider === 'email'  ? '#22C55E' : '#A1A1AA';

  return (
    <div className="flex-1 flex flex-col h-screen w-full relative z-10 bg-[#F8FAFC] dark:bg-[#0F172A] overflow-hidden transition-colors duration-300">
      {/* Top bar */}
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

      {/* Main Content - Scrollable */}
      <div className="flex-1 pt-20 px-8 pb-12 max-w-7xl mx-auto w-full overflow-y-auto" style={{ 
        scrollbarWidth: 'thin',
        scrollbarColor: '#CBD5E1 transparent'
      }}>
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-black uppercase text-[#0F172A] dark:text-[#F8FAFC] tracking-tight mb-2 transition-colors duration-300" style={{ fontFamily: 'Inter, sans-serif' }}>
            SETTINGS
          </h1>
          <p className="text-sm text-[#64748B] dark:text-[#94A3B8] font-semibold transition-colors duration-300">
            Manage your account, preferences, and app configuration
          </p>
        </div>

        {/* ── Profile card ── */}
        <div className="bg-[#16a34a] dark:bg-[#15803d] border-2 border-[#0F172A] dark:border-[#F8FAFC] rounded-3xl p-7 flex gap-6 items-center relative overflow-hidden mb-6 transition-colors duration-300">
          <div className="absolute -top-10 -right-10 w-[200px] h-[200px] rounded-full pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)' }} />
          <div className="relative flex-shrink-0">
            <div className="w-[76px] h-[76px] rounded-full bg-white dark:bg-[#F8FAFC] flex items-center justify-center text-[26px] font-black text-[#16a34a] dark:text-[#15803d] border-2 border-[#0F172A] dark:border-[#0F172A] transition-colors duration-300">
              {user?.initials || 'AM'}
            </div>
            <div className="absolute bottom-0.5 right-0.5 w-[13px] h-[13px] rounded-full bg-[#22C55E] border-2 border-[#0F172A] dark:border-[#F8FAFC] transition-colors duration-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="m-0 mb-0.5 text-xl font-black text-white">{user?.name || 'User'}</p>
            <p className="m-0 mb-2.5 text-sm text-white opacity-90">{user?.email ?? 'No email'}</p>
            <div className="flex gap-2 flex-wrap">
              <span className="text-[11px] font-bold px-3 py-1 rounded-full border-2 border-white inline-flex items-center gap-1.5 bg-white/20 text-white backdrop-blur-sm">
                {providerIcon}
                {providerLabel}
              </span>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full border-2 border-white inline-flex items-center gap-1.5 bg-white/20 text-white backdrop-blur-sm">
                <Shield size={10} />
                Staff Access
              </span>
              <span className="text-[11px] font-bold px-3 py-1 rounded-full border-2 border-white inline-flex items-center gap-1.5 bg-white/20 text-white backdrop-blur-sm">
                <Activity size={10} />
                Active
              </span>
            </div>
          </div>
        </div>

        {/* ── Profile Settings ── */}
        <Section icon={<UserCircle size={16} />} title="Profile" subtitle="Update your display name and personal info">
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-widest mb-2 transition-colors duration-300">Display Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                className="w-full bg-[#F8FAFC] dark:bg-[#334155] border-2 border-[#0F172A] dark:border-[#F8FAFC] rounded-full px-4 py-2.5 text-sm text-[#0F172A] dark:text-[#F8FAFC] placeholder:text-[#94A3B8] dark:placeholder:text-[#64748B] outline-none transition-colors duration-300 focus:border-[#16a34a]"
              />
              <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed transition-colors duration-300">
                This name appears in the AI chat interface and throughout the app. Choose a name that's easy to recognize and professional for your pharmacy team.
              </p>
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-widest mb-2 transition-colors duration-300">Email Address</label>
              <div className="bg-[#F8FAFC] dark:bg-[#334155] border-2 border-[#0F172A] dark:border-[#F8FAFC] rounded-full px-4 py-2.5 text-sm text-[#64748B] dark:text-[#94A3B8] flex justify-between items-center transition-colors duration-300">
                <span>{user?.email ?? '—'}</span>
                <span className="text-[11px] text-[#64748B] dark:text-[#94A3B8] bg-[#E2E8F0] dark:bg-[#475569] px-2 py-0.5 rounded-full border border-[#0F172A] dark:border-[#F8FAFC] font-bold transition-colors duration-300">Read-only</span>
              </div>
              <p className="mt-1.5 text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed transition-colors duration-300">
                Your email is linked to your authentication provider and cannot be changed here. To update your email, please contact your authentication provider directly.
              </p>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={!name.trim() || name === user?.name || saving}
                className={`flex items-center gap-2 border-2 rounded-full px-5 py-2.5 text-sm font-bold transition-all uppercase tracking-wide ${
                  (!name.trim() || name === user?.name) 
                    ? 'bg-[#E2E8F0] dark:bg-[#475569] text-[#64748B] dark:text-[#94A3B8] border-[#0F172A] dark:border-[#F8FAFC] cursor-not-allowed' 
                    : 'bg-[#16a34a] text-white border-[#0F172A] dark:border-[#F8FAFC] cursor-pointer hover:bg-[#15803d]'
                }`}
              >
                {saving ? <><RefreshCw size={14} className="animate-spin" /> Saving…</> : <><Save size={14} /> Save Changes</>}
              </button>
              {saved && (
                <div className="flex items-center gap-1.5 text-[#22C55E] dark:text-[#4ADE80] text-sm font-semibold transition-colors duration-300">
                  <CheckCircle2 size={15} /> Profile updated!
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Notifications ── */}
        <Section icon={<Bell size={16} />} title="Notifications" subtitle="Control when and how you receive alerts">
          <div className="mb-4 p-3 bg-[#F0FDF4] dark:bg-[#14532D] border-2 border-[#16a34a] dark:border-[#4ADE80] rounded-2xl transition-colors duration-300">
            <p className="m-0 text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed transition-colors duration-300">
              <strong>Stay informed:</strong> Enable notifications to receive real-time alerts about critical inventory events. These settings help you maintain optimal stock levels and prevent medication shortages.
            </p>
          </div>
          <div className="flex flex-col">
            <Row label="Reorder Alerts" sub="Get notified immediately when any medicine falls below its minimum stock threshold. Helps prevent stockouts and ensures continuous availability of essential medications." right={<Toggle checked={notifReorder} onChange={v => { setNotifReorder(v); pref('notifReorder', v); }} />} />
            <Row label="Expiry Warnings" sub="Receive advance notifications 30 days before medicines expire. This gives you time to plan promotions, returns, or proper disposal of expiring stock." right={<Toggle checked={notifExpiry} onChange={v => { setNotifExpiry(v); pref('notifExpiry', v); }} />} />
            <Row label="Chat Notifications" sub="Get alerts when the AI assistant completes processing your requests or has important information to share about inventory queries." right={<Toggle checked={notifChat} onChange={v => { setNotifChat(v); pref('notifChat', v); }} />} />
            <Row label="Weekly Summary" sub="Receive a comprehensive email digest every Monday morning with inventory health metrics, low stock items, upcoming expirations, and sales trends from the previous week." right={<Toggle checked={notifWeekly} onChange={v => { setNotifWeekly(v); pref('notifWeekly', v); }} />} noBorder />
          </div>
        </Section>

        {/* ── Appearance ── */}
        <Section icon={<Palette size={16} />} title="Appearance" subtitle="Customise how the interface looks and feels">
          <div>
            <p className="m-0 mb-2.5 text-[11px] font-bold text-[#64748B] dark:text-[#94A3B8] uppercase tracking-widest transition-colors duration-300">Theme</p>
            <div className="flex gap-2.5 mb-4 pb-4 border-b border-[#E2E8F0] dark:border-[#334155] transition-colors duration-300">
              {([['light', 'Light', <Pill size={16} />], ['dark', 'Dark', <Monitor size={16} />]] as const).map(([val, label, icon]) => (
                <button 
                  key={val} 
                  onClick={() => { setTheme(val as 'light' | 'dark'); pref('theme', val); }}
                  className={`flex-1 border-2 rounded-3xl py-3 px-2 cursor-pointer text-sm font-bold flex flex-col items-center gap-1.5 transition-all uppercase tracking-wide ${
                    theme === val 
                      ? 'bg-[#F0FDF4] dark:bg-[#334155] text-[#16a34a] dark:text-[#4ADE80] border-[#0F172A] dark:border-[#F8FAFC]' 
                      : 'bg-white dark:bg-[#1E293B] text-[#64748B] dark:text-[#94A3B8] border-[#0F172A] dark:border-[#F8FAFC]'
                  }`}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
            <p className="m-0 mb-4 p-3 bg-[#F8FAFC] dark:bg-[#334155] border border-[#E2E8F0] dark:border-[#475569] rounded-2xl text-xs text-[#64748B] dark:text-[#94A3B8] leading-relaxed transition-colors duration-300">
              Choose between light mode for bright environments or dark mode for reduced eye strain during night shifts.
            </p>
            <Row label="Compact Mode" sub="Reduces spacing and padding throughout the interface for a denser layout. Ideal for smaller screens or when you need to view more information at once." right={<Toggle checked={compactMode} onChange={v => { setCompactMode(v); pref('compactMode', v); }} />} />
            <Row label="Animations" sub="Enable smooth transitions, hover effects, and micro-interactions. Disable this option if you prefer a more static interface or experience performance issues." right={<Toggle checked={animations} onChange={v => { setAnimations(v); pref('animations', v); }} />} noBorder />
          </div>
        </Section>

        {/* ── Privacy & Data ── */}
        <Section icon={<Shield size={16} />} title="Privacy & Data" subtitle="Control what data is saved and how it's used">
          <div className="mb-4 p-3 bg-[#EFF6FF] dark:bg-[#1E3A8A] border-2 border-[#3B82F6] dark:border-[#60A5FA] rounded-2xl transition-colors duration-300">
            <p className="m-0 text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed transition-colors duration-300">
              <strong>Your data, your control:</strong> We take your privacy seriously. All data is encrypted and stored securely in Firebase. You can export or delete your data at any time.
            </p>
          </div>
          <div>
            <Row label="Save Chat History" sub="Store all conversation sessions with the AI assistant in Firestore. This allows you to review past interactions and maintain context across sessions. Disabling this will delete conversations after each session ends." right={<Toggle checked={saveHistory} onChange={v => { setSaveHistory(v); pref('saveHistory', v); }} />} />
            <Row label="Analytics" sub="Share anonymous usage data to help us improve PharmaAI. This includes feature usage patterns, performance metrics, and error reports. No personal or inventory data is ever shared." right={<Toggle checked={analytics} onChange={v => { setAnalytics(v); pref('analytics', v); }} />} />
            <Row
              label="Export My Data"
              sub="Download a complete copy of your inventory records, sales logs, and chat sessions as a JSON file. This export can be used for backup purposes or to migrate to another system."
              noBorder
              right={<ActionBtn onClick={handleExport} icon={<Download size={13} />}>Export</ActionBtn>}
            />
          </div>
        </Section>

        {/* ── Session & Security ── */}
        <Section icon={<Lock size={16} />} title="Session & Security" subtitle="Manage your login sessions and account security">
          <div className="mb-4 p-3 bg-[#FEF3C7] dark:bg-[#78350F] border-2 border-[#F59E0B] dark:border-[#FCD34D] rounded-2xl transition-colors duration-300">
            <p className="m-0 text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed transition-colors duration-300">
              <strong>Security tip:</strong> Always sign out when using shared devices. Your session remains active until you explicitly log out or your authentication token expires.
            </p>
          </div>
          <div>
            <Row
              label="Signed-in With"
              sub="Your current authentication method determines how you access Agentic Pharmacy. This cannot be changed without creating a new account."
              right={
                <div 
                  className="flex items-center gap-2 px-3 py-1 rounded-full border-2 border-[#0F172A] dark:border-[#F8FAFC] text-xs font-bold transition-colors duration-300"
                  style={{ color: providerColor, backgroundColor: providerColor + '15' }}
                >
                  {providerIcon}
                  <span>{providerLabel}</span>
                </div>
              }
            />
            <Row
              label="Session Timeout"
              sub="Configure automatic sign-out after a period of inactivity. Currently set to never expire for convenience. Contact support to enable custom timeout periods."
              noBorder
              right={
                <div className="flex items-center gap-1.5 text-[#64748B] dark:text-[#94A3B8] bg-[#F8FAFC] dark:bg-[#334155] px-3 py-1 rounded-full border-2 border-[#0F172A] dark:border-[#F8FAFC] text-xs font-semibold transition-colors duration-300">
                  <Clock size={13} />
                  <span>Never</span>
                  <ChevronRight size={13} />
                </div>
              }
            />
          </div>
        </Section>

        {/* ── About ── */}
        <Section icon={<Database size={16} />} title="About" subtitle="App version and system information">
          <div className="mb-4 p-3 bg-[#F8FAFC] dark:bg-[#334155] border border-[#E2E8F0] dark:border-[#475569] rounded-2xl transition-colors duration-300">
            <p className="m-0 mb-2 text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed transition-colors duration-300">
              <strong>Agentic Pharmacy</strong> is an AI-powered pharmacy management system designed to streamline inventory tracking, prevent stockouts, and ensure medication safety through intelligent drug interaction checking.
            </p>
            <p className="m-0 text-[11px] text-[#64748B] dark:text-[#94A3B8] leading-relaxed transition-colors duration-300">
              Built with modern cloud technologies for reliability, security, and real-time synchronization across all your devices.
            </p>
          </div>
          <div>
            <Row label="App Version" sub="Current release version of Agentic Pharmacy" right={<span className="text-xs text-[#0F172A] dark:text-[#F8FAFC] bg-[#F8FAFC] dark:bg-[#334155] px-3 py-1 rounded-full border-2 border-[#0F172A] dark:border-[#F8FAFC] font-bold transition-colors duration-300">v1.0.0</span>} />
            <Row label="Database" sub="Cloud-hosted NoSQL database for real-time data sync" right={<span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold transition-colors duration-300">Firebase Firestore</span>} />
            <Row label="AI Model" sub="Large language model powering the intelligent assistant" right={<span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold transition-colors duration-300">Groq · llama-3.1-8b-instant</span>} />
            <Row label="Vector Store" sub="Semantic search engine for drug interaction database" right={<span className="text-xs text-[#64748B] dark:text-[#94A3B8] font-semibold transition-colors duration-300">ChromaDB Cloud</span>} noBorder />
          </div>
        </Section>

        {/* ── Danger Zone ── */}
        <div className="bg-[#FEE2E2] dark:bg-[#7F1D1D] border-2 border-[#0F172A] dark:border-[#F8FAFC] rounded-3xl overflow-hidden transition-colors duration-300">
          <div className="px-6 py-4 border-b-2 border-[#EF4444] dark:border-[#FCA5A5] flex items-center gap-2.5 bg-[#FEE2E2] dark:bg-[#7F1D1D] transition-colors duration-300">
            <AlertTriangle size={15} className="text-[#EF4444] dark:text-[#FCA5A5] transition-colors duration-300" />
            <p className="m-0 text-sm font-black text-[#EF4444] dark:text-[#FCA5A5] uppercase tracking-wide transition-colors duration-300">Danger Zone</p>
          </div>
          <div className="px-6 py-4 flex flex-col bg-white dark:bg-[#1E293B] transition-colors duration-300">
            <div className="mb-4 p-3 bg-[#FEF3C7] dark:bg-[#78350F] border-2 border-[#F59E0B] dark:border-[#FCD34D] rounded-2xl transition-colors duration-300">
              <p className="m-0 text-xs text-[#0F172A] dark:text-[#F8FAFC] leading-relaxed transition-colors duration-300">
                <strong>⚠️ Warning:</strong> Actions in this section are permanent and cannot be undone. Please proceed with caution and ensure you have backups of any important data before performing destructive operations.
              </p>
            </div>
            <Row
              label="Clear Chat History"
              sub="Permanently delete all saved conversations with the AI assistant from Firestore. This action cannot be undone. Your inventory data will not be affected, only chat logs will be removed."
              danger
              right={<ActionBtn onClick={handleClearHistory} danger icon={<Trash2 size={13} />}>Clear All</ActionBtn>}
            />
            <Row
              label="Migrate Legacy Data"
              sub="Copy all items from the original global inventory collection into your private account. This is a one-time migration for users upgrading from the legacy system. Existing items will not be duplicated."
              right={<ActionBtn onClick={handleMigrateLegacy} icon={<Database size={13} />}>Migrate</ActionBtn>}
            />
            <Row
              label="Sign Out"
              sub="End your current session on this device and return to the login screen. You'll need to sign in again to access your account. This does not delete any data."
              danger
              noBorder
              right={<ActionBtn onClick={logout} danger icon={<LogOut size={13} />}>Sign Out</ActionBtn>}
            />
          </div>
        </div>

      </div>


    </div>
  );
}
