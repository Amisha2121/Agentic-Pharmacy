import { useState, useId, useEffect, type FormEvent, type CSSProperties } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Phone, ArrowRight, Loader2, User, ShieldCheck, Zap, Activity } from 'lucide-react';

type Tab = 'email' | 'phone';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

function friendlyError(msg: string): string {
  if (msg.includes('email-already-in-use')) return 'This email is already registered. Try signing in.';
  if (msg.includes('weak-password'))        return 'Password must be at least 6 characters.';
  if (msg.includes('invalid-email'))        return 'Please enter a valid email address.';
  if (msg.includes('invalid-phone'))        return 'Please enter a valid phone number with country code (e.g. +91…).';
  if (msg.includes('too-many-requests'))    return 'Too many attempts. Please wait and try again.';
  if (msg.includes('popup-closed'))         return 'Sign-up popup was closed. Please try again.';
  if (msg.includes('network-request'))      return 'Network error. Check your internet connection.';
  return msg;
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const score =
    (password.length >= 8 ? 1 : 0) +
    (/[A-Z]/.test(password) ? 1 : 0) +
    (/[0-9]/.test(password) ? 1 : 0) +
    (/[^A-Za-z0-9]/.test(password) ? 1 : 0);
  const colors = ['', '#EF4444', '#F59E0B', '#84CC16', '#22C55E'];
  const labels = ['', 'WEAK', 'FAIR', 'GOOD', 'STRONG'];
  return (
    <div style={{ marginTop: 10 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 999,
            background: i <= score ? colors[score] : '#E2E8F0',
            transition: 'background 0.2s',
            border: '1px solid #0F172A',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontFamily: 'Inter, sans-serif', fontWeight: 800, letterSpacing: '0.5px' }}>
        {labels[score]}
      </span>
    </div>
  );
}

export function Signup() {
  const { loginWithGoogle, signupWithEmail, sendOtp, confirmOtp, user, isLoading } = useAuth();
  const navigate   = useNavigate();
  const recaptchaId = useId();

  const [tab,        setTab]        = useState<Tab>('email');
  const [showPwd,    setShowPwd]    = useState(false);
  const [showConf,   setShowConf]   = useState(false);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(false);
  const [otpSent,    setOtpSent]    = useState(false);
  const [success,    setSuccess]    = useState('');
  const [focused,    setFocused]    = useState<string | null>(null);

  // email fields
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [confirm,  setConfirm]  = useState('');

  // phone fields
  const [phone,        setPhone]        = useState('');
  const [displayName,  setDisplayName]  = useState('');
  const [otp,          setOtp]          = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const wrap = async (fn: () => Promise<void>) => {
    setError(''); setSuccess(''); setLoading(true);
    try { await fn(); navigate('/dashboard', { replace: true }); }
    catch (e: unknown) { setError(friendlyError(e instanceof Error ? e.message : 'Something went wrong.')); }
    finally { setLoading(false); }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await sendOtp(phone, `recaptcha-signup-${recaptchaId}`); setOtpSent(true); setSuccess(`OTP sent to ${phone}`); }
    catch (e: unknown) { setError(friendlyError(e instanceof Error ? e.message : 'Failed to send OTP')); }
    finally { setLoading(false); }
  };

  // Show nothing while checking auth state
  if (isLoading) return null;

  /* ── shared styles ── */
  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: 48,
    padding: '0 16px',
    background: '#F8FAFC',
    border: '2px solid #E2E8F0',
    borderRadius: 12,
    color: '#0F172A',
    fontSize: 14,
    fontFamily: 'Inter, sans-serif',
    fontWeight: 500,
    outline: 'none',
    transition: 'all 0.2s',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    color: '#64748B',
    fontSize: 11,
    fontWeight: 900,
    fontFamily: 'Inter, sans-serif',
    letterSpacing: '0.05em',
    marginBottom: 8,
    textTransform: 'uppercase',
  };

  const submitBtn: React.CSSProperties = {
    width: '100%',
    height: 48,
    borderRadius: 999,
    border: 'none',
    background: loading ? '#94A3B8' : '#16a34a',
    color: 'white',
    fontSize: 13,
    fontWeight: 900,
    fontFamily: 'Inter, sans-serif',
    cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    transition: 'all 0.2s',
    marginTop: 24,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  return (
    <div style={{ minHeight: '100vh', height: 'auto', background: '#F8FAFC', padding: '32px 16px', display: 'block' }}>
      <div style={{ width: '100%', maxWidth: '448px', margin: '0 auto', paddingBottom: '32px' }}>
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-12">
          <span
            className="text-[#0F172A] text-[24px] font-black uppercase tracking-tight"
            style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.5px' }}
          >
            AGENTIC PHARMACY
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border-2 border-[#0F172A] rounded-xl p-8">
          {/* Heading */}
          <div className="mb-8">
            <h1
              className="text-[28px] font-black uppercase text-[#0F172A] tracking-tight mb-2"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '-0.02em' }}
            >
              CREATE ACCOUNT
            </h1>
            <p className="text-[14px] text-[#64748B] font-medium">
              Get started with your pharmacy dashboard
            </p>
          </div>

          {/* Google Button */}
          <button
            onClick={() => wrap(loginWithGoogle)}
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-3 bg-white hover:bg-[#F8FAFC] border-2 border-[#0F172A] text-[#0F172A] font-bold text-[13px] uppercase tracking-wide transition-all mb-6 disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ borderRadius: '999px' }}
          >
            <GoogleIcon />
            SIGN UP WITH GOOGLE
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-[2px] bg-[#E2E8F0]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-[#94A3B8]">OR</span>
            <div className="flex-1 h-[2px] bg-[#E2E8F0]" />
          </div>

          {/* Tab switcher */}
          <div className="flex bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-full p-1 mb-6">
            {(['email', 'phone'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => { setTab(t); setError(''); setOtpSent(false); setSuccess(''); }}
                className={`flex-1 h-10 flex items-center justify-center gap-2 rounded-full border-none cursor-pointer text-[12px] font-bold uppercase tracking-wide transition-all ${
                  tab === t
                    ? 'bg-[#16a34a] text-white'
                    : 'bg-transparent text-[#64748B] hover:text-[#0F172A]'
                }`}
              >
                {t === 'email' ? <Mail size={14} strokeWidth={2.5} /> : <Phone size={14} strokeWidth={2.5} />}
                {t === 'email' ? 'EMAIL' : 'PHONE'}
              </button>
            ))}
          </div>

          {/* ── Email form ── */}
          {tab === 'email' && (
            <form onSubmit={e => { e.preventDefault(); if (password !== confirm) { setError('Passwords do not match.'); return; } if (password.length < 6) { setError('Password must be at least 6 characters.'); return; } wrap(() => signupWithEmail(name, email, password)); }}>
              {/* Full Name */}
              <div className="mb-5">
                <label style={labelStyle}>FULL NAME</label>
                <input
                  type="text"
                  value={name}
                  required
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  className="w-full h-12 px-4 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] font-medium placeholder:text-[#94A3B8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DCFCE7] transition-all"
                />
              </div>

              {/* Email */}
              <div className="mb-5">
                <label style={labelStyle}>EMAIL ADDRESS</label>
                <input
                  type="email"
                  value={email}
                  required
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-12 px-4 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] font-medium placeholder:text-[#94A3B8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DCFCE7] transition-all"
                />
              </div>

              {/* Password */}
              <div className="mb-5">
                <label style={labelStyle}>PASSWORD</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    required
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full h-12 px-4 pr-12 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] font-medium placeholder:text-[#94A3B8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DCFCE7] transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              {/* Confirm Password */}
              <div className="mb-2">
                <label style={labelStyle}>CONFIRM PASSWORD</label>
                <div className="relative">
                  <input
                    type={showConf ? 'text' : 'password'}
                    value={confirm}
                    required
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Re-enter password"
                    className={`w-full h-12 px-4 pr-12 bg-[#F8FAFC] border-2 rounded-xl text-[#0F172A] text-[14px] font-medium placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:ring-4 transition-all ${
                      confirm && confirm !== password
                        ? 'border-[#EF4444] focus:border-[#EF4444] focus:ring-[#FEE2E2]'
                        : 'border-[#E2E8F0] focus:border-[#16a34a] focus:ring-[#DCFCE7]'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConf(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors"
                  >
                    {showConf ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {confirm && confirm !== password && (
                  <p className="text-[11px] font-bold text-[#EF4444] mt-2 uppercase tracking-wide">
                    PASSWORDS DON'T MATCH
                  </p>
                )}
              </div>

              {/* Error */}
              {error && (
                <div className="mb-5 p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-xl">
                  <p className="text-[13px] font-bold text-[#DC2626]">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button type="submit" disabled={loading} style={submitBtn}>
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                    CREATING ACCOUNT...
                  </>
                ) : (
                  <>
                    CREATE ACCOUNT
                    <ArrowRight className="w-4 h-4" strokeWidth={3} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* ── Phone form ── */}
          {tab === 'phone' && (
            <>
              <div id={`recaptcha-signup-${recaptchaId}`} />
              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  {/* Name */}
                  <div className="mb-5">
                    <label style={labelStyle}>YOUR NAME</label>
                    <input
                      type="text"
                      value={displayName}
                      required
                      onChange={e => setDisplayName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full h-12 px-4 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] font-medium placeholder:text-[#94A3B8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DCFCE7] transition-all"
                    />
                  </div>

                  {/* Phone */}
                  <div className="mb-2">
                    <label style={labelStyle}>PHONE NUMBER</label>
                    <input
                      type="tel"
                      value={phone}
                      required
                      onChange={e => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full h-12 px-4 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] font-medium placeholder:text-[#94A3B8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DCFCE7] transition-all"
                    />
                    <p className="text-[11px] text-[#64748B] font-medium mt-2">
                      Include country code, e.g. +91
                    </p>
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-5 p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-xl">
                      <p className="text-[13px] font-bold text-[#DC2626]">{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button type="submit" disabled={loading} style={submitBtn}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                        SENDING...
                      </>
                    ) : (
                      <>
                        SEND OTP
                        <ArrowRight className="w-4 h-4" strokeWidth={3} />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={e => { e.preventDefault(); wrap(() => confirmOtp(otp)); }}>
                  {/* Success */}
                  {success && (
                    <div className="mb-5 p-4 bg-[#F0FDF4] border-2 border-[#16a34a] rounded-xl">
                      <p className="text-[13px] font-bold text-[#16a34a]">✓ {success}</p>
                    </div>
                  )}

                  {/* OTP */}
                  <div className="mb-2">
                    <label style={labelStyle}>ENTER OTP</label>
                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      required
                      onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="6-digit code"
                      className="w-full h-12 px-4 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-[20px] font-black text-center tracking-[0.4em] placeholder:text-[#94A3B8] placeholder:tracking-normal placeholder:text-[14px] placeholder:font-medium focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DCFCE7] transition-all"
                    />
                  </div>

                  {/* Error */}
                  {error && (
                    <div className="mb-5 p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-xl">
                      <p className="text-[13px] font-bold text-[#DC2626]">{error}</p>
                    </div>
                  )}

                  {/* Submit */}
                  <button type="submit" disabled={loading} style={submitBtn}>
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                        VERIFYING...
                      </>
                    ) : (
                      <>
                        VERIFY & CREATE ACCOUNT
                        <ArrowRight className="w-4 h-4" strokeWidth={3} />
                      </>
                    )}
                  </button>

                  {/* Change number */}
                  <button
                    type="button"
                    onClick={() => { setOtpSent(false); setOtp(''); setError(''); setSuccess(''); }}
                    className="w-full mt-3 text-[12px] text-[#64748B] hover:text-[#0F172A] font-medium transition-colors"
                  >
                    ← Change phone number
                  </button>
                </form>
              )}
            </>
          )}

          {/* Sign in link */}
          <p className="text-center text-[13px] text-[#64748B] font-medium mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-[#16a34a] font-bold hover:text-[#15803d] transition-colors">
              Sign in
            </Link>
          </p>
        </div>

        {/* Back to landing */}
        <div className="text-center mt-6">
          <Link
            to="/"
            className="text-[12px] text-[#64748B] hover:text-[#0F172A] font-medium transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
