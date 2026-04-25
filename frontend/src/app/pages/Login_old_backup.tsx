import { useState, useId, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, Pill, ShieldCheck, Activity,
  Mail, Phone, ArrowRight, Loader2,
} from 'lucide-react';

type Tab = 'email' | 'phone';

// ─── Google icon SVG ─────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

// ─── Divider ──────────────────────────────────────────────────────────────────
function Divider({ label = 'or' }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

export function Login() {
  const { loginWithGoogle, loginWithEmail, sendOtp, confirmOtp, login } = useAuth();
  const navigate = useNavigate();
  const recaptchaId = useId();

  const [tab, setTab] = useState<Tab>('email');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  // Email fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Phone fields
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');

  // Legacy
  const [legacyUser, setLegacyUser] = useState('');
  const [legacyPass, setLegacyPass] = useState('');
  const [showLegacy, setShowLegacy] = useState(false);

  const wrap = async (fn: () => Promise<void>) => {
    setError('');
    setLoading(true);
    try {
      await fn();
      navigate('/', { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      setError(friendlyError(msg));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => wrap(loginWithGoogle);

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    wrap(() => loginWithEmail(email, password));
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone, `recaptcha-${recaptchaId}`);
      setOtpSent(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = (e: FormEvent) => {
    e.preventDefault();
    wrap(() => confirmOtp(otp));
  };

  const handleLegacy = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(legacyUser, legacyPass);
    setLoading(false);
    if (ok) navigate('/', { replace: true });
    else setError('Invalid username or password.');
  };

  return (
    <div className="min-h-screen w-full flex">
      {/* ── Left panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[44%] bg-gradient-to-br from-[#00695c] via-[#00796b] to-[#00695c] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#80cbc4]/25 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#4db6ac]/20 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '2s' }} />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gradient-to-br from-[#80cbc4] to-[#4db6ac] rounded-2xl flex items-center justify-center shadow-lg shadow-[#80cbc4]/40">
              <Pill className="w-6 h-6 text-[#004d40]" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight drop-shadow-lg">PharmaAI</span>
          </div>
          <p className="text-[#80cbc4] text-xs font-semibold uppercase tracking-widest">
            Smart Pharmacy System
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-extrabold text-white leading-snug drop-shadow-lg">
            Intelligent pharmacy<br />management, powered<br />by AI.
          </h2>
          <div className="space-y-5">
            {[
              { icon: <Activity className="w-5 h-5" />, title: 'Live Inventory', desc: 'Real-time stock levels & expiry tracking' },
              { icon: <ShieldCheck className="w-5 h-5" />, title: 'Clinical AI', desc: 'FDA drug interactions & dosage guidance' },
              { icon: <Pill className="w-5 h-5" />, title: 'Smart Alerts', desc: 'Auto reorder & expired item detection' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-4 group">
                <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 text-[#80cbc4] group-hover:bg-[#80cbc4]/20 group-hover:scale-110 transition-all duration-300">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-[#b2dfdb] text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-[#b2dfdb]/50 text-xs">© 2026 PharmaAI · Agentic Pharmacy Intelligence</p>
      </div>

      {/* ── Right panel ────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-[#00695c] to-[#00897b] rounded-2xl flex items-center justify-center shadow-lg">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-[#00695c]">PharmaAI</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#00695c] mb-1">Welcome back</h1>
          <p className="text-gray-600 font-semibold mb-7">Sign in to your pharmacy dashboard</p>

          {/* Google button */}
          <button
            id="login-google"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 glass-card rounded-[2rem] px-5 py-[14px] font-bold text-gray-700 text-sm shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 hover:scale-105"
          >
            <GoogleIcon />
            Continue with Google
          </button>

          <Divider />

          {/* Tab switcher */}
          <div className="flex glass-card rounded-[2rem] p-1.5 mb-6">
            {(['email', 'phone'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setOtpSent(false); }}
                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-[1.75rem] text-sm font-bold transition-all duration-200 ${
                  tab === t
                    ? 'btn-primary text-white shadow-xl'
                    : 'text-gray-600 hover:text-gray-800'
                }`}
              >
                {t === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                {t === 'email' ? 'Email' : 'Phone'}
              </button>
            ))}
          </div>

          {/* ── Email form ──────────────────────────────────────────── */}
          {tab === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#0d3d3f] mb-1.5">Email address</label>
                <input
                  id="login-email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="pharmacist@example.com"
                  required
                  className="w-full bg-white/70 backdrop-blur-sm border-2 border-teal-200/50 rounded-2xl px-5 py-3.5 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#0d3d3f] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full bg-white/70 backdrop-blur-sm border-2 border-teal-200/50 rounded-2xl px-5 py-3.5 pr-14 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-teal-400 transition-all shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-teal-600 transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
              {error && <ErrorBox message={error} />}
              <SubmitButton loading={loading} label="Sign In" />
            </form>
          )}

          {/* ── Phone form ──────────────────────────────────────────── */}
          {tab === 'phone' && (
            <>
              {/* Invisible reCAPTCHA mount point */}
              <div id={`recaptcha-${recaptchaId}`} />

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Phone number</label>
                    <input
                      id="login-phone"
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      required
                      className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1.5 ml-1">Include country code, e.g. +91</p>
                  </div>
                  {error && <ErrorBox message={error} />}
                  <SubmitButton loading={loading} label="Send OTP" />
                </form>
              ) : (
                <form onSubmit={handleConfirmOtp} className="space-y-4">
                  <p className="text-sm text-gray-600 bg-[#1E4A4C]/5 rounded-xl px-4 py-3 font-medium">
                    OTP sent to <span className="font-bold text-[#1E4A4C]">{phone}</span>
                  </p>
                  <div>
                    <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Enter OTP</label>
                    <input
                      id="login-otp"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit code"
                      required
                      className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-gray-800 placeholder:text-gray-400 font-medium text-center tracking-[0.5em] text-xl focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
                    />
                  </div>
                  {error && <ErrorBox message={error} />}
                  <SubmitButton loading={loading} label="Verify & Sign In" />
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                    className="w-full text-sm text-gray-500 hover:text-[#1E4A4C] transition-colors font-medium"
                  >
                    ← Change phone number
                  </button>
                </form>
              )}
            </>
          )}

          {/* Sign up link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            New to PharmaAI?{' '}
            <Link to="/signup" className="text-teal-600 font-bold hover:underline">
              Create account
            </Link>
          </p>

          {/* Legacy login toggle */}
          <div className="mt-8">
            <button
              onClick={() => setShowLegacy(p => !p)}
              className="w-full text-xs text-gray-400 hover:text-gray-500 transition-colors font-medium"
            >
              {showLegacy ? '▲ Hide' : '▼ Use'} legacy credentials
            </button>
            {showLegacy && (
              <form onSubmit={handleLegacy} className="mt-3 bg-[#1E4A4C]/5 border border-[#1E4A4C]/10 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-[#1E4A4C] uppercase tracking-wider">Legacy Login</p>
                <input
                  value={legacyUser}
                  onChange={e => setLegacyUser(e.target.value)}
                  placeholder="username: rxai"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 transition-all"
                />
                <input
                  type="password"
                  value={legacyPass}
                  onChange={e => setLegacyPass(e.target.value)}
                  placeholder="password: pharma2026"
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 transition-all"
                />
                {error && <ErrorBox message={error} />}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#1E4A4C] text-white text-sm font-bold py-2.5 rounded-xl hover:bg-[#2B5B5C] transition-all disabled:opacity-50"
                >
                  {loading ? 'Signing in…' : 'Sign in with legacy'}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Shared sub-components ────────────────────────────────────────────────────
function ErrorBox({ message }: { message: string }) {
  return (
    <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium">
      {message}
    </div>
  );
}

function SubmitButton({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      id="login-submit"
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 btn-primary disabled:opacity-60 text-white font-bold py-4 rounded-[2rem] transition-all duration-300 hover:scale-105 text-base"
    >
      {loading ? (
        <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
      ) : (
        <>{label} <ArrowRight className="w-4 h-4" /></>
      )}
    </button>
  );
}

function friendlyError(msg: string): string {
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential'))
    return 'Invalid email or password. Please try again.';
  if (msg.includes('email-already-in-use')) return 'This email is already registered.';
  if (msg.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (msg.includes('invalid-phone')) return 'Please enter a valid phone number with country code.';
  if (msg.includes('too-many-requests')) return 'Too many attempts. Please wait and try again.';
  if (msg.includes('popup-closed-by-user')) return 'Sign-in popup was closed. Please try again.';
  if (msg.includes('network-request-failed')) return 'Network error. Check your internet connection.';
  return msg;
}
