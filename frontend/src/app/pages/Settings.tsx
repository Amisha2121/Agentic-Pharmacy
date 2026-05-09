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
    <div style={{ background: '#FFFFFF', border: '1px solid #0F172A', borderRadius: 24, overflow: 'hidden' }}>
      <div style={{ padding: '18px 24px', borderBottom: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#16a34a', border: '1px solid #0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#FFFFFF', flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 14.5, fontWeight: 700, color: '#0F172A' }}>{title}</p>
          <p style={{ margin: '2px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11.5, color: '#64748B' }}>{subtitle}</p>
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
      borderBottom: noBorder ? 'none' : '1px solid #E2E8F0',
    }}>
      <div>
        <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13.5, fontWeight: 600, color: danger ? '#EF4444' : '#0F172A' }}>{label}</p>
        {sub && <p style={{ margin: '2px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#64748B' }}>{sub}</p>}
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
        width: 44, height: 24, borderRadius: 999, border: '1px solid #0F172A', cursor: 'pointer',
        background: checked ? '#16a34a' : '#F8FAFC',
        position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <span style={{
        position: 'absolute', top: 2, left: checked ? 21 : 2,
        width: 18, height: 18, borderRadius: '50%', background: '#fff',
        border: '1px solid #0F172A',
        transition: 'left 0.2s', display: 'block',
      }} />
    </button>
  );
}

function Chip({ label, color, icon }: { label: string; color: string; icon?: React.ReactNode }) {
  return (
    <span style={{
      fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700,
      padding: '4px 12px', borderRadius: 999, background: color + '15',
      color, border: `1px solid #0F172A`,
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
        background: hover ? (danger ? '#FEE2E2' : '#F0FDF4') : '#FFFFFF',
        border: `1px solid #0F172A`,
        borderRadius: 999, padding: '7px 14px',
        color: danger ? '#EF4444' : '#0F172A',
        fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12.5, fontWeight: 700,
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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto', background: '#F8FAFC' }}>

      {/* ── Topbar ── */}
      <div style={{ height: 56, background: '#FFFFFF', borderBottom: '1px solid #0F172A', display: 'flex', alignItems: 'center', gap: 16, padding: '0 28px', position: 'sticky', top: 0, zIndex: 20 }}>
        {!isSidebarOpen && (
          <button onClick={() => setIsSidebarOpen(true)} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', background: '#FFFFFF', border: '1px solid #0F172A', color: '#0F172A', cursor: 'pointer' }}>
            <Menu size={18} />
          </button>
        )}
        <h1 style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 17, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.2px' }}>Settings</h1>
      </div>

      <div style={{ maxWidth: 780, margin: '0 auto', width: '100%', padding: '28px 24px 64px', display: 'flex', flexDirection: 'column', gap: 18 }}>

        {/* ── Profile card ── */}
        <div style={{ background: '#16a34a', border: '1px solid #0F172A', borderRadius: 24, padding: 26, display: 'flex', gap: 22, alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{ width: 76, height: 76, borderRadius: '50%', background: '#FFFFFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26, fontWeight: 900, color: '#16a34a', fontFamily: 'DM Sans, sans-serif', border: '2px solid #0F172A' }}>
              {user?.initials || 'AM'}
            </div>
            <div style={{ position: 'absolute', bottom: 2, right: 2, width: 13, height: 13, borderRadius: '50%', background: '#22C55E', border: '2px solid #0F172A' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontFamily: 'DM Sans, sans-serif', fontSize: 20, fontWeight: 900, color: '#FFFFFF' }}>{user?.name || 'User'}</p>
            <p style={{ margin: '0 0 10px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, color: '#FFFFFF', opacity: 0.9 }}>{user?.email ?? 'No email'}</p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Chip label={providerLabel} color={providerColor} icon={providerIcon} />
              <Chip label="Staff Access" color="#0F172A" icon={<Shield size={10} />} />
              <Chip label="Active" color="#22C55E" icon={<Activity size={10} />} />
            </div>
          </div>
        </div>

        {/* ── Profile Settings ── */}
        <Section icon={<UserCircle size={16} />} title="Profile" subtitle="Update your display name and personal info">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Display Name</label>
              <input
                type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="Your full name"
                onKeyDown={e => e.key === 'Enter' && handleSave()}
                style={{ width: '100%', background: '#F8FAFC', border: '1px solid #0F172A', borderRadius: 999, padding: '10px 16px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: '#0F172A', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => (e.target as HTMLInputElement).style.borderColor = '#16a34a'}
                onBlur={e => (e.target as HTMLInputElement).style.borderColor = '#0F172A'}
              />
              <p style={{ margin: '5px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#64748B' }}>
                This name appears in the AI chat interface and throughout the app. Choose a name that's easy to recognize and professional for your pharmacy team.
              </p>
            </div>
            <div>
              <label style={{ display: 'block', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 7 }}>Email Address</label>
              <div style={{ background: '#F8FAFC', border: '1px solid #0F172A', borderRadius: 999, padding: '10px 16px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 14, color: '#64748B', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{user?.email ?? '—'}</span>
                <span style={{ fontSize: 11, color: '#64748B', background: '#E2E8F0', padding: '2px 8px', borderRadius: 999, border: '1px solid #0F172A' }}>Read-only</span>
              </div>
              <p style={{ margin: '5px 0 0', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#64748B' }}>
                Your email is linked to your authentication provider and cannot be changed here. To update your email, please contact your authentication provider directly.
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingTop: 2 }}>
              <button
                onClick={handleSave}
                disabled={!name.trim() || name === user?.name || saving}
                style={{ display: 'flex', alignItems: 'center', gap: 7, background: (!name.trim() || name === user?.name) ? '#E2E8F0' : '#16a34a', color: (!name.trim() || name === user?.name) ? '#64748B' : '#fff', border: '1px solid #0F172A', borderRadius: 999, padding: '9px 20px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13.5, fontWeight: 700, cursor: (!name.trim() || name === user?.name) ? 'not-allowed' : 'pointer', transition: 'all 0.2s' }}
              >
                {saving ? <><RefreshCw size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving…</> : <><Save size={14} /> Save Changes</>}
              </button>
              {saved && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#22C55E', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 600 }}>
                  <CheckCircle2 size={15} /> Profile updated!
                </div>
              )}
            </div>
          </div>
        </Section>

        {/* ── Notifications ── */}
        <Section icon={<Bell size={16} />} title="Notifications" subtitle="Control when and how you receive alerts">
          <div style={{ marginBottom: 16, padding: 12, background: '#F0FDF4', border: '1px solid #16a34a', borderRadius: 16 }}>
            <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#0F172A', lineHeight: 1.6 }}>
              <strong>Stay informed:</strong> Enable notifications to receive real-time alerts about critical inventory events. These settings help you maintain optimal stock levels and prevent medication shortages.
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <Row label="Reorder Alerts" sub="Get notified immediately when any medicine falls below its minimum stock threshold. Helps prevent stockouts and ensures continuous availability of essential medications." right={<Toggle checked={notifReorder} onChange={v => { setNotifReorder(v); pref('notifReorder', v); }} />} />
            <Row label="Expiry Warnings" sub="Receive advance notifications 30 days before medicines expire. This gives you time to plan promotions, returns, or proper disposal of expiring stock." right={<Toggle checked={notifExpiry} onChange={v => { setNotifExpiry(v); pref('notifExpiry', v); }} />} />
            <Row label="Chat Notifications" sub="Get alerts when the AI assistant completes processing your requests or has important information to share about inventory queries." right={<Toggle checked={notifChat} onChange={v => { setNotifChat(v); pref('notifChat', v); }} />} />
            <Row label="Weekly Summary" sub="Receive a comprehensive email digest every Monday morning with inventory health metrics, low stock items, upcoming expirations, and sales trends from the previous week." right={<Toggle checked={notifWeekly} onChange={v => { setNotifWeekly(v); pref('notifWeekly', v); }} />} noBorder />
          </div>
        </Section>

        {/* ── Appearance ── */}
        <Section icon={<Palette size={16} />} title="Appearance" subtitle="Customise how the interface looks and feels">
          <div>
            <p style={{ margin: '0 0 10px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.6px' }}>Theme</p>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, paddingBottom: 16, borderBottom: '1px solid #E2E8F0' }}>
              {([['dark', 'Dark', <Pill size={16} />], ['system', 'System', <Monitor size={16} />]] as const).map(([val, label, icon]) => (
                <button key={val} onClick={() => { setTheme(val as 'dark' | 'system'); pref('theme', val); }}
                  style={{ flex: 1, background: theme === val ? '#F0FDF4' : '#FFFFFF', border: `1px solid #0F172A`, borderRadius: 24, padding: '12px 8px', cursor: 'pointer', color: theme === val ? '#16a34a' : '#64748B', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 13, fontWeight: 700, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, transition: 'all 0.2s' }}
                >
                  {icon}{label}
                </button>
              ))}
            </div>
            <p style={{ margin: '0 0 16px', padding: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#64748B', lineHeight: 1.6 }}>
              Choose between dark mode for reduced eye strain during night shifts, or system mode to automatically match your device's appearance settings.
            </p>
            <Row label="Compact Mode" sub="Reduces spacing and padding throughout the interface for a denser layout. Ideal for smaller screens or when you need to view more information at once." right={<Toggle checked={compactMode} onChange={v => { setCompactMode(v); pref('compactMode', v); }} />} />
            <Row label="Animations" sub="Enable smooth transitions, hover effects, and micro-interactions. Disable this option if you prefer a more static interface or experience performance issues." right={<Toggle checked={animations} onChange={v => { setAnimations(v); pref('animations', v); }} />} noBorder />
          </div>
        </Section>

        {/* ── Privacy & Data ── */}
        <Section icon={<Shield size={16} />} title="Privacy & Data" subtitle="Control what data is saved and how it's used">
          <div style={{ marginBottom: 16, padding: 12, background: '#EFF6FF', border: '1px solid #3B82F6', borderRadius: 16 }}>
            <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#0F172A', lineHeight: 1.6 }}>
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
          <div style={{ marginBottom: 16, padding: 12, background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 16 }}>
            <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#0F172A', lineHeight: 1.6 }}>
              <strong>Security tip:</strong> Always sign out when using shared devices. Your session remains active until you explicitly log out or your authentication token expires.
            </p>
          </div>
          <div>
            <Row
              label="Signed-in With"
              sub="Your current authentication method determines how you access PharmaAI. This cannot be changed without creating a new account."
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, color: providerColor, background: providerColor + '15', padding: '4px 12px', borderRadius: 999, border: '1px solid #0F172A' }}>
                  {providerIcon}
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12.5, fontWeight: 700 }}>{providerLabel}</span>
                </div>
              }
            />
            <Row
              label="Session Timeout"
              sub="Configure automatic sign-out after a period of inactivity. Currently set to never expire for convenience. Contact support to enable custom timeout periods."
              noBorder
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#64748B', background: '#F8FAFC', padding: '4px 12px', borderRadius: 999, border: '1px solid #0F172A' }}>
                  <Clock size={13} />
                  <span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, fontWeight: 600 }}>Never</span>
                  <ChevronRight size={13} />
                </div>
              }
            />
          </div>
        </Section>

        {/* ── About ── */}
        <Section icon={<Database size={16} />} title="About" subtitle="App version and system information">
          <div style={{ marginBottom: 16, padding: 12, background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 16 }}>
            <p style={{ margin: '0 0 8px', fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#0F172A', lineHeight: 1.6 }}>
              <strong>PharmaAI</strong> is an AI-powered pharmacy management system designed to streamline inventory tracking, prevent stockouts, and ensure medication safety through intelligent drug interaction checking.
            </p>
            <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 11, color: '#64748B', lineHeight: 1.5 }}>
              Built with modern cloud technologies for reliability, security, and real-time synchronization across all your devices.
            </p>
          </div>
          <div>
            <Row label="App Version" sub="Current release version of PharmaAI" right={<span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#0F172A', background: '#F8FAFC', padding: '4px 12px', borderRadius: 999, border: '1px solid #0F172A', fontWeight: 700 }}>v1.0.0</span>} />
            <Row label="Database" sub="Cloud-hosted NoSQL database for real-time data sync" right={<span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#64748B', fontWeight: 600 }}>Firebase Firestore</span>} />
            <Row label="AI Model" sub="Large language model powering the intelligent assistant" right={<span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#64748B', fontWeight: 600 }}>Groq · llama-3.1-8b-instant</span>} />
            <Row label="Vector Store" sub="Semantic search engine for drug interaction database" right={<span style={{ fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#64748B', fontWeight: 600 }}>ChromaDB Cloud</span>} noBorder />
          </div>
        </Section>

        {/* ── Danger Zone ── */}
        <div style={{ background: '#FEE2E2', border: '1px solid #0F172A', borderRadius: 24, overflow: 'hidden' }}>
          <div style={{ padding: '16px 24px', borderBottom: '1px solid #EF4444', display: 'flex', alignItems: 'center', gap: 10, background: '#FEE2E2' }}>
            <AlertTriangle size={15} style={{ color: '#EF4444' }} />
            <p style={{ margin: 0, fontFamily: 'DM Sans, sans-serif', fontSize: 14, fontWeight: 700, color: '#EF4444' }}>Danger Zone</p>
          </div>
          <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', background: '#FFFFFF' }}>
            <div style={{ marginBottom: 16, padding: 12, background: '#FEF3C7', border: '1px solid #F59E0B', borderRadius: 16 }}>
              <p style={{ margin: 0, fontFamily: 'IBM Plex Sans, sans-serif', fontSize: 12, color: '#0F172A', lineHeight: 1.6 }}>
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

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
