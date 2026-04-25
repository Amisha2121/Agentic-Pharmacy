import { useState, useId, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import {
  Eye, EyeOff, Pill, ShieldCheck, Activity,
  Mail, Phone, ArrowRight, Loader2, User,
} from 'lucide-react';

type Tab = 'email' | 'phone';

// ─── Google icon SVG ──────────────────────────────────────────────────────────
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

function Divider({ label = 'or' }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs font-semibold text-gray-400 uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );
}

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
      id="signup-submit"
      type="submit"
      disabled={loading}
      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#1E4A4C] to-[#2B5B5C] hover:from-[#2B5B5C] hover:to-[#1E4A4C] disabled:opacity-60 text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#1E4A4C]/20 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl text-base"
    >
      {loading ? (
        <><Loader2 className="w-5 h-5 animate-spin" /> Creating account…</>
      ) : (
        <>{label} <ArrowRight className="w-4 h-4" /></>
      )}
    </button>
  );
}

function friendlyError(msg: string): string {
  if (msg.includes('email-already-in-use')) return 'This email is already registered. Try signing in.';
  if (msg.includes('weak-password')) return 'Password must be at least 6 characters.';
  if (msg.includes('invalid-email')) return 'Please enter a valid email address.';
  if (msg.includes('invalid-phone') || msg.includes('invalid-phone-number')) return 'Please enter a valid phone number with country code (e.g. +91…).';
  if (msg.includes('too-many-requests')) return 'Too many attempts. Please wait and try again.';
  if (msg.includes('popup-closed-by-user')) return 'Sign-up popup was closed. Please try again.';
  if (msg.includes('network-request-failed')) return 'Network error. Check your internet connection.';
  return msg;
}

// ─── Strength indicator ───────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', 'bg-rose-400', 'bg-amber-400', 'bg-lime-400', 'bg-emerald-500'];
  if (!password) return null;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= score ? colors[score] : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-xs font-semibold ${score <= 1 ? 'text-rose-500' : score === 2 ? 'text-amber-500' : score === 3 ? 'text-lime-600' : 'text-emerald-600'}`}>
        {labels[score]}
      </p>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function Signup() {
  const { loginWithGoogle, signupWithEmail, sendOtp, confirmOtp } = useAuth();
  const navigate = useNavigate();
  const recaptchaId = useId();

  const [tab, setTab] = useState<Tab>('email');
  const [showPwd, setShowPwd] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [success, setSuccess] = useState('');

  // Email fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  // Phone fields
  const [phone, setPhone] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [otp, setOtp] = useState('');

  const wrap = async (fn: () => Promise<void>) => {
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await fn();
      navigate('/', { replace: true });
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Something went wrong.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => wrap(loginWithGoogle);

  const handleEmailSignup = (e: FormEvent) => {
    e.preventDefault();
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    wrap(() => signupWithEmail(name, email, password));
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendOtp(phone, `recaptcha-signup-${recaptchaId}`);
      setOtpSent(true);
      setSuccess(`OTP sent to ${phone}`);
    } catch (e: unknown) {
      setError(friendlyError(e instanceof Error ? e.message : 'Failed to send OTP'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = (e: FormEvent) => {
    e.preventDefault();
    wrap(() => confirmOtp(otp));
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f0f4f4]">

      {/* ── Left panel ───────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[44%] bg-[#1E4A4C] flex-col justify-between p-12 relative overflow-hidden">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#2B5B5C] rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#2B5B5C]/40 rounded-full blur-2xl" />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">PharmaAI</span>
          </div>
          <p className="text-[#C5D3D3]/70 text-xs font-semibold uppercase tracking-widest">
            Smart Pharmacy System
          </p>
        </div>

        {/* Illustration copy */}
        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-extrabold text-white leading-snug">
            Join thousands of<br />pharmacists using<br />AI every day.
          </h2>
          <div className="space-y-5">
            {[
              { icon: <Activity className="w-5 h-5" />, title: 'Instant setup', desc: 'Sign up and go live in under a minute' },
              { icon: <ShieldCheck className="w-5 h-5" />, title: 'Secure by default', desc: 'Firebase Auth keeps your account safe' },
              { icon: <Pill className="w-5 h-5" />, title: 'Full AI access', desc: 'Drug interactions, alerts & smart chat' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center shrink-0 text-white">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{f.title}</p>
                  <p className="text-[#C5D3D3]/70 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
        <p className="relative z-10 text-[#C5D3D3]/40 text-xs">© 2026 PharmaAI · Agentic Pharmacy Intelligence</p>
      </div>

      {/* ── Right panel ──────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-[#1E4A4C] rounded-2xl flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-[#1E4A4C]">PharmaAI</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#1E4A4C] mb-1">Create account</h1>
          <p className="text-gray-500 font-medium mb-7">Get started with your pharmacy dashboard</p>

          {/* Google */}
          <button
            id="signup-google"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-2xl px-5 py-[14px] font-semibold text-gray-700 text-sm shadow-sm hover:shadow-md hover:border-gray-300 transition-all duration-200 disabled:opacity-50"
          >
            <GoogleIcon />
            Sign up with Google
          </button>

          <Divider />

          {/* Tab switcher */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6">
            {(['email', 'phone'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setOtpSent(false); setSuccess(''); }}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
                  tab === t
                    ? 'bg-white text-[#1E4A4C] shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t === 'email' ? <Mail className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                {t === 'email' ? 'Email' : 'Phone'}
              </button>
            ))}
          </div>

          {/* ── Email signup ──────────────────────────────────────── */}
          {tab === 'email' && (
            <form onSubmit={handleEmailSignup} className="space-y-4">
              {/* Full name */}
              <div>
                <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Full name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="signup-name"
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Dr. Amisha Patel"
                    required
                    className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-5 py-3.5 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Email address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="pharmacist@example.com"
                    required
                    className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-5 py-3.5 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Password</label>
                <div className="relative">
                  <input
                    id="signup-password"
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    required
                    className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 pr-14 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
                  />
                  <button type="button" onClick={() => setShowPwd(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1E4A4C] transition-colors">
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              {/* Confirm password */}
              <div>
                <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Confirm password</label>
                <div className="relative">
                  <input
                    id="signup-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className={`w-full bg-white border rounded-2xl px-5 py-3.5 pr-14 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 transition-all shadow-sm ${
                      confirm && confirm !== password
                        ? 'border-rose-300 focus:ring-rose-200'
                        : 'border-gray-200 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50'
                    }`}
                  />
                  <button type="button" onClick={() => setShowConfirm(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1E4A4C] transition-colors">
                    {showConfirm ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-xs text-rose-500 mt-1 ml-1 font-medium">Passwords don't match</p>
                )}
              </div>

              {error && <ErrorBox message={error} />}
              <SubmitButton loading={loading} label="Create Account" />
            </form>
          )}

          {/* ── Phone signup ──────────────────────────────────────── */}
          {tab === 'phone' && (
            <>
              {/* Invisible reCAPTCHA mount */}
              <div id={`recaptcha-signup-${recaptchaId}`} />

              {!otpSent ? (
                <form onSubmit={handleSendOtp} className="space-y-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Your name</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="signup-phone-name"
                        type="text"
                        value={displayName}
                        onChange={e => setDisplayName(e.target.value)}
                        placeholder="Dr. Amisha Patel"
                        required
                        className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-5 py-3.5 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Phone number</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        id="signup-phone"
                        type="tel"
                        value={phone}
                        onChange={e => setPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        required
                        className="w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-5 py-3.5 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 ml-1">Include country code, e.g. +91</p>
                  </div>
                  {error && <ErrorBox message={error} />}
                  <SubmitButton loading={loading} label="Send OTP" />
                </form>
              ) : (
                <form onSubmit={handleConfirmOtp} className="space-y-4">
                  {success && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 font-medium">
                      ✓ {success}
                    </p>
                  )}
                  <div>
                    <label className="block text-sm font-semibold text-[#1E4A4C] mb-1.5">Enter OTP</label>
                    <input
                      id="signup-otp"
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
                  <SubmitButton loading={loading} label="Verify & Create Account" />
                  <button type="button"
                    onClick={() => { setOtpSent(false); setOtp(''); setError(''); setSuccess(''); }}
                    className="w-full text-sm text-gray-500 hover:text-[#1E4A4C] transition-colors font-medium"
                  >
                    ← Change phone number
                  </button>
                </form>
              )}
            </>
          )}

          {/* Sign in link */}
          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1E4A4C] font-bold hover:underline">
              Sign in
            </Link>
          </p>

          {/* Terms */}
          <p className="mt-4 text-center text-xs text-gray-400 leading-relaxed">
            By creating an account you agree to PharmaAI's{' '}
            <span className="text-[#1E4A4C] font-semibold cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#1E4A4C] font-semibold cursor-pointer hover:underline">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
