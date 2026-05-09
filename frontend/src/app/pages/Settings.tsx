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
    <div style={{ background: '#111113', border: '1px solid #27272A', borderRadius: 16, overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #1C1C1F', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 9, background: '#18181B', border: '1px solid #27272A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#3B82F6', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 14.5, fontWeight: 600, color: '#F4F4F5' }}>{title}</p>
          <p style={{ margin: '2px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11.5, color: '#52525B' }}>{subtitle}</p>
        </div>
      </div>
      <div style={{ padding: '16px 24px' }}>{children}</div>
    </div>
  );
}

function Row({ label, sub, right, danger, noBorder }: {
  label: string; sub?: string; right: React.ReactNode; danger?: boolean; noBorder?: boolean;
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      gap: 16, padding: '11px 0',
      borderBottom: noBorder ? 'none' : '1px solid #1A1A1D',
    }}>
      <div>
        <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13.5, fontWeight: 500, color: danger ? '#EF4444' : '#E4E4E7' }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#52525B' }}>{sub}</p>}
      </div>
      {right}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
        background: checked ? '#3B82F6' : '#27272A',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: 9, background: '#fff',
        transition: 'left 0.2s', display: 'block',
      }} />
    </button>
  );
}

function Chip({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 600,
      padding: '3px 10px', borderRadius: 20, background: color + '20',
      color, border: `1px solid ${color}40`,
      display: 'inline-flex', alignItems: 'center', gap: 5,
    }}>
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
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: hover ? (danger ? '#3B0000' : '#1F2937') : (danger ? '#1A0A0A' : '#18181B'),
        border: `1px solid ${danger ? '#3B1111' : '#27272A'}`,
        borderRadius: 8, padding: '7px 14px',
        color: danger ? '#EF4444' : '#A1A1AA',
        fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12.5, fontWeight: 600,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
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
  const [theme,        setTheme]        = useState<'dark' | 'system'>(prefs.theme ?? 'dark');

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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: '#09090B' }}>

      {/* ── Topbar ── */}
      <div style={{ height: 56, background: '#0E0E11', borderBottom: '1px solid #27272A', display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', position: 'sticky', top: 0, zIndex: 20 }}>
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, background: '#18181B', border: '1px solid #27272A', color: '#A1A1AA', cursor: 'pointer' }}>
            <Menu size={18} />
          </button>
        )}
        <h1 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 17, fontWeight: 600, color: '#F4F4F5', letterSpacing: '-0.2px' }}>Settings</h1>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', width: '100%', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Profile card ── */}
        <div style={{ background: 'linear-gradient(135deg, #0F172A 0%, #111827 60%, #0F1629 100%)', border: '1px solid #1E3A5F', borderRadius: 20, padding: 26, display: 'flex', gap: 22, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: 'linear-gradient(135deg, #1D4ED8, #3B82F6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 700, color: '#fff', fontFamily: 'DM Sans, sans-serif', boxShadow: '0 0 0 3px #1E3A5F, 0 0 24px rgba(59,130,246,0.25)' }}>
              {user?.initials || 'AM'}
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: '50%', background: '#22C55E', border: '2px solid #0F172A' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 700, color: '#F4F4F5' }}>{user?.name || 'User'}</p>
            <p style={{ margin: '0 0 10px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, color: '#60A5FA' }}>{user?.email ?? 'No email'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip label={providerLabel} color={providerColor} icon={providerIcon} />
              <Chip label="Staff Access" color="#94A3B8" icon={<Shield size={10} />} />
              <Chip label="Active" color="#22C55E" icon={<Activity size={10} />} />
            </div>
          </div>
        </div>

        {/* ── Profile Settings ── */}
        <Section icon={<UserCircle size={16} />} title="Profile" subtitle="Update your display name and personal info">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Display Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                style={{ width: '100%', background: '#0E0E11', border: '1px solid #27272A', borderRadius: 10, padding: '10px 14px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: '#F4F4F5', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#3B82F6'}
                onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#27272A'}
              />
              <p style={{ margin: '5px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#52525B' }}>Used to greet you in the chat and personalise your experience.</p>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Email Address</label>
              <div style={{ background: '#0E0E11', border: '1px solid #1C1C1F', borderRadius: 10, padding: '10px 14px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: '#52525B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{user?.email ?? '—'}</span>
                <span style={{ fontSize: 11, color: '#3F3F46', background: '#1C1C1F', padding: '2px 8px', borderRadius: 6 }}>Read-only</span>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 2 }}>
              <button
                onClick={handleSave}
                disabled={!name.trim() || name === user?.name || saving}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: (!name.trim() || name === user?.name) ? '#1C1C1F' : '#3B82F6', color: (!name.trim() || name === user?.name) ? '#52525B' : '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13.5, fontWeight: 600, cursor: (!name.trim() || name === user?.name) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                {saving ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save Changes</>}
              </button>
              {saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 500 }}>
                  <CheckCircle2 size={15} /> Profile updated!
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Notifications ── */}
        <Section icon={<Bell size={16} />} title="Notifications" subtitle="Control when and how you receive alerts">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Row label="Reorder Alerts" sub="Notify when stock falls below threshold" right={<Toggle checked={notifReorder} onChange={v => { setNotifReorder(v); pref('notifReorder', v); }} />} />
            <Row label="Expiry Warnings" sub="Remind me 30 days before medicines expire" right={<Toggle checked={notifExpiry} onChange={v => { setNotifExpiry(v); pref('notifExpiry', v); }} />} />
            <Row label="Chat Notifications" sub="Alert when AI assistant responds" right={<Toggle checked={notifChat} onChange={v => { setNotifChat(v); pref('notifChat', v); }} />} />
            <Row label="Weekly Summary" sub="Email digest of inventory health every Monday" right={<Toggle checked={notifWeekly} onChange={v => { setNotifWeekly(v); pref('notifWeekly', v); }} />} noBorder />
          </div>
        </Section>

        {/* ── Appearance ── */}
        <Section icon={<Palette size={16} />} title="Appearance" subtitle="Customise how the interface looks and feels">
          <div>
            <p style={{ margin: '0 0 10px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 600, color: '#71717A', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Theme</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #1A1A1D' }}>
              {([['dark', 'Dark', <Pill size={16} />], ['system', 'System', <Monitor size={16} />]] as const).map(([val, label, icon]) => (
                <button key={val} onClick={() => { setTheme(val as 'dark' | 'system'); pref('theme', val); }}
                  style={{ flex: 1, background: theme === val ? '#1E3A5F' : '#0E0E11', border: `1px solid ${theme === val ? '#3B82F6' : '#27272A'}`, borderRadius: 10, padding: '12px 8px', cursor: 'pointer', color: theme === val ? '#60A5FA' : '#71717A', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 500, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
            <Row label="Compact Mode" sub="Reduce spacing for a denser layout" right={<Toggle checked={compactMode} onChange={v => { setCompactMode(v); pref('compactMode', v); }} />} />
            <Row label="Animations" sub="Enable smooth transitions and micro-interactions" right={<Toggle checked={animations} onChange={v => { setAnimations(v); pref('animations', v); }} />} noBorder />
          </div>
        </Section>

        {/* ── Privacy & Data ── */}
        <Section icon={<Shield size={16} />} title="Privacy & Data" subtitle="Control what data is saved and how it's used">
          <div>
            <Row label="Save Chat History" sub="Store conversation sessions in Firestore" right={<Toggle checked={saveHistory} onChange={v => { setSaveHistory(v); pref('saveHistory', v); }} />} />
            <Row label="Analytics" sub="Help improve the app with anonymous usage data" right={<Toggle checked={analytics} onChange={v => { setAnalytics(v); pref('analytics', v); }} />} />
            <Row
              label="Export My Data"
              sub="Download all your inventory and session data as JSON"
              noBorder
              right={<ActionBtn onClick={handleExport} icon={<Download size={13} />}>Export</ActionBtn>}
            />
          </div>
        </Section>

        {/* ── Session & Security ── */}
        <Section icon={<Lock size={16} />} title="Session & Security" subtitle="Manage your login sessions and account security">
          <div>
            <Row
              label="Signed-in With"
              sub="Your current authentication method"
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: providerColor }}>
                  {providerIcon}
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12.5, fontWeight: 500 }}>{providerLabel}</span>
                </div>
              }
            />
            <Row
              label="Session Timeout"
              sub="Automatically sign out after inactivity"
              noBorder
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#52525B' }}>
                  <Clock size={13} />
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12 }}>Never</span>
                  <ChevronRight size={13} />
                </div>
              }
            />
          </div>
        </Section>

        {/* ── About ── */}
        <Section icon={<Database size={16} />} title="About" subtitle="App version and system information">
          <div>
            <Row label="App Version" right={<span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#52525B', background: '#18181B', padding: '3px 10px', borderRadius: 6 }}>v1.0.0</span>} />
            <Row label="Database" right={<span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#52525B' }}>Firebase Firestore</span>} />
            <Row label="AI Model" right={<span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#52525B' }}>Groq · llama-3.1-8b-instant</span>} />
            <Row label="Vector Store" right={<span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#52525B' }}>ChromaDB Cloud</span>} noBorder />
          </div>
        </Section>

        {/* ── Danger Zone ── */}
        <div style={{ background: '#110A0A', border: '1px solid #3B1111', borderRadius: 16, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #2A1111', display: 'flex', alignItems: 'center', gap: 10 }}>
            <AlertTriangle size={15} style={{ color: '#EF4444' }} />
            <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 600, color: '#EF4444' }}>Danger Zone</p>
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column' }}>
            <Row
              label="Clear Chat History"
              sub="Permanently delete all saved conversations from Firestore"
              danger
              right={<ActionBtn onClick={handleClearHistory} danger icon={<Trash2 size={13} />}>Clear All</ActionBtn>}
            />
            <Row
              label="Migrate Legacy Data"
              sub="Copy original global inventory into your private account"
              right={<ActionBtn onClick={handleMigrateLegacy} icon={<Database size={13} />}>Migrate</ActionBtn>}
            />
            <Row
              label="Sign Out"
              sub="End your current session on this device"
              danger
              noBorder
              right={<ActionBtn onClick={logout} danger icon={<LogOut size={13} />}>Sign Out</ActionBtn>}
            />
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
