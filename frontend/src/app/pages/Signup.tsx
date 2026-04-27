import { useState, useId, type FormEvent, type CSSProperties } from 'react';
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
  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colors[score] : '#27272A',
            transition: 'background 0.2s',
          }} />
        ))}
      </div>
      <span style={{ fontSize: 11, color: colors[score], fontFamily: 'IBM Plex Sans, sans-serif', fontWeight: 500 }}>
        {labels[score]}
      </span>
    </div>
  );
}

export function Signup() {
  const { loginWithGoogle, signupWithEmail, sendOtp, confirmOtp } = useAuth();
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

  const wrap = async (fn: () => Promise<void>) => {
    setError(''); setSuccess(''); setLoading(true);
    try { await fn(); navigate('/', { replace: true }); }
    catch (e: unknown) { setError(friendlyError(e instanceof Error ? e.message : 'Something went wrong.')); }
    finally { setLoading(false); }
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { await sendOtp(phone, `recaptcha-signup-${recaptchaId}`); setOtpSent(true); setSuccess(`OTP sent to ${phone}`); }
    catch (e: unknown) { setError(friendlyError(e instanceof Error ? e.message : 'Failed to send OTP')); }
    finally { setLoading(false); }
  };

  /* ── shared styles ── */
  const inputStyle = (name: string): CSSProperties => ({
    width: '100%', height: 44, borderRadius: 10, boxSizing: 'border-box',
    padding: '0 14px', background: focused === name ? '#111318' : '#0D1117',
    border: focused === name ? '1.5px solid #3B82F6' : '1.5px solid #27272A',
    boxShadow: focused === name ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
    color: '#F4F4F5', fontSize: 14, fontFamily: 'IBM Plex Sans, sans-serif',
    outline: 'none', transition: 'all 0.15s',
  });

  const inputWithIconStyle = (name: string): CSSProperties => ({ ...inputStyle(name), paddingLeft: 40 });

  const labelStyle: CSSProperties = {
    display: 'block', color: '#A1A1AA', fontSize: 12, fontWeight: 500,
    fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.3px', marginBottom: 7,
  };

  const submitBtn: CSSProperties = {
    width: '100%', height: 44, borderRadius: 10, border: 'none',
    background: loading ? 'rgba(59,130,246,0.5)' : 'linear-gradient(135deg, #3B82F6, #6366F1)',
    color: '#FFFFFF', fontSize: 14, fontWeight: 600,
    fontFamily: 'IBM Plex Sans, sans-serif', cursor: loading ? 'not-allowed' : 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
    transition: 'all 0.2s', marginTop: 8,
    boxShadow: loading ? 'none' : '0 4px 18px rgba(99,102,241,0.35)',
  };

  const iconWrap: CSSProperties = {
    position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)',
    color: '#52525B', display: 'flex', alignItems: 'center', pointerEvents: 'none',
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#09090B' }}>

      {/* ── LEFT ── */}
      <div className="left-panel" style={{ flex: '0 0 52%', position: 'relative', overflow: 'hidden', background: '#09090B', display: 'none' }}>
        <div style={{ position: 'absolute', top: '-15%', left: '-20%', width: '75%', height: '65%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)', filter: 'blur(50px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '0%', right: '-10%', width: '60%', height: '55%', borderRadius: '50%', background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '1px', background: 'linear-gradient(90deg, transparent, #3B82F6 50%, transparent)', opacity: 0.6 }} />

        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '52px 64px' }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, fontSize: 18, background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 16px rgba(59,130,246,0.35)' }}>💊</div>
            <span style={{ color: '#F4F4F5', fontSize: 18, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.3px' }}>PharmaAI</span>
          </div>

          {/* Hero */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ color: '#3B82F6', fontSize: 11, fontWeight: 600, letterSpacing: '3px', textTransform: 'uppercase', fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: 24 }}>Pharmacy Intelligence</p>
            <h1 style={{ color: '#F4F4F5', fontSize: 'clamp(34px, 3.5vw, 50px)', fontWeight: 700, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 24 }}>
              Your pharmacy,<br />
              <em style={{ fontStyle: 'italic', color: '#60A5FA', fontWeight: 400 }}>live in minutes.</em>
            </h1>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {[
                { Icon: Zap,          title: 'Instant setup',      desc: 'Sign up and go live in under a minute' },
                { Icon: ShieldCheck,  title: 'Secure by default',  desc: 'Firebase Auth keeps your account safe' },
                { Icon: Activity,     title: 'Full AI access',     desc: 'Drug interactions, alerts & smart chat' },
              ].map(({ Icon, title, desc }) => (
                <div key={title} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 9, background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={16} color="#60A5FA" />
                  </div>
                  <div>
                    <p style={{ color: '#F4F4F5', fontSize: 13, fontWeight: 600, fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: 1 }}>{title}</p>
                    <p style={{ color: '#52525B', fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif' }}>{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ borderTop: '1px solid #18181B', paddingTop: 28 }}>
            <p style={{ color: '#3F3F46', fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif' }}>© 2026 PharmaAI · Agentic Pharmacy Intelligence</p>
          </div>
        </div>
      </div>

      {/* ── RIGHT ── */}
      <div style={{ flex: 1, background: '#0D1117', borderLeft: '1px solid #18181B', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 32px', overflowY: 'auto' }}>
        <div style={{ width: '100%', maxWidth: 400 }}>

          {/* Mobile logo */}
          <div className="mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 36 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💊</div>
            <span style={{ color: '#F4F4F5', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>PharmaAI</span>
          </div>

          <div style={{ marginBottom: 28 }}>
            <h2 style={{ color: '#F4F4F5', fontSize: 26, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.5px', marginBottom: 6 }}>Create account</h2>
            <p style={{ color: '#71717A', fontSize: 14, fontFamily: 'IBM Plex Sans, sans-serif' }}>Get started with your pharmacy dashboard</p>
          </div>

          {/* Google */}
          <button
            onClick={() => wrap(loginWithGoogle)} disabled={loading}
            style={{ width: '100%', height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, borderRadius: 10, border: '1.5px solid #27272A', background: '#18181B', color: '#A1A1AA', fontSize: 14, fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', cursor: 'pointer', transition: 'all 0.15s', marginBottom: 20, opacity: loading ? 0.4 : 1 }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1F1F23'; e.currentTarget.style.borderColor = '#3F3F46'; e.currentTarget.style.color = '#F4F4F5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#18181B'; e.currentTarget.style.borderColor = '#27272A'; e.currentTarget.style.color = '#A1A1AA'; }}
          >
            <GoogleIcon /> Sign up with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#18181B' }} />
            <span style={{ color: '#3F3F46', fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#18181B' }} />
          </div>

          {/* Tab switcher */}
          <div style={{ display: 'flex', background: '#18181B', border: '1px solid #27272A', borderRadius: 10, padding: 4, marginBottom: 20 }}>
            {(['email', 'phone'] as Tab[]).map(t => (
              <button key={t} onClick={() => { setTab(t); setError(''); setOtpSent(false); setSuccess(''); }}
                style={{ flex: 1, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', transition: 'all 0.15s',
                  background: tab === t ? '#0D1117' : 'transparent',
                  color: tab === t ? '#F4F4F5' : '#71717A',
                  boxShadow: tab === t ? '0 1px 3px rgba(0,0,0,0.4)' : 'none',
                }}>
                {t === 'email' ? <Mail size={13} /> : <Phone size={13} />}
                {t === 'email' ? 'Email' : 'Phone'}
              </button>
            ))}
          </div>

          {/* ── Email form ── */}
          {tab === 'email' && (
            <form onSubmit={e => { e.preventDefault(); if (password !== confirm) { setError('Passwords do not match.'); return; } if (password.length < 6) { setError('Password must be at least 6 characters.'); return; } wrap(() => signupWithEmail(name, email, password)); }}>
              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Full name</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconWrap}><User size={15} /></span>
                  <input type="text" value={name} required onChange={e => setName(e.target.value)} onFocus={() => setFocused('name')} onBlur={() => setFocused(null)} placeholder="Dr. Amisha Patel" style={inputWithIconStyle('name')} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email address</label>
                <div style={{ position: 'relative' }}>
                  <span style={iconWrap}><Mail size={15} /></span>
                  <input type="email" value={email} required onChange={e => setEmail(e.target.value)} onFocus={() => setFocused('email')} onBlur={() => setFocused(null)} placeholder="you@example.com" style={inputWithIconStyle('email')} />
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showPwd ? 'text' : 'password'} value={password} required onChange={e => setPassword(e.target.value)} onFocus={() => setFocused('pwd')} onBlur={() => setFocused(null)} placeholder="Min. 6 characters" style={{ ...inputStyle('pwd'), paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowPwd(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', padding: 0, display: 'flex' }}>
                    {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                <PasswordStrength password={password} />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Confirm password</label>
                <div style={{ position: 'relative' }}>
                  <input type={showConf ? 'text' : 'password'} value={confirm} required onChange={e => setConfirm(e.target.value)} onFocus={() => setFocused('conf')} onBlur={() => setFocused(null)} placeholder="Re-enter password"
                    style={{ ...inputStyle('conf'), paddingRight: 44, border: confirm && confirm !== password ? '1.5px solid #EF4444' : (focused === 'conf' ? '1.5px solid #3B82F6' : '1.5px solid #27272A') }} />
                  <button type="button" onClick={() => setShowConf(p => !p)} style={{ position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', padding: 0, display: 'flex' }}>
                    {showConf ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
                {confirm && confirm !== password && <p style={{ color: '#EF4444', fontSize: 11, marginTop: 5, fontFamily: 'IBM Plex Sans, sans-serif' }}>Passwords don't match</p>}
              </div>

              {error && <div style={{ background: '#1A0000', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: 10 }}>{error}</div>}
              <button type="submit" disabled={loading} style={submitBtn}>
                {loading ? <><Loader2 size={15} className="animate-spin" /> Creating account…</> : <>Create Account <ArrowRight size={14} /></>}
              </button>
            </form>
          )}

          {/* ── Phone form ── */}
          {tab === 'phone' && (
            <>
              <div id={`recaptcha-signup-${recaptchaId}`} />
              {!otpSent ? (
                <form onSubmit={handleSendOtp}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Your name</label>
                    <div style={{ position: 'relative' }}>
                      <span style={iconWrap}><User size={15} /></span>
                      <input type="text" value={displayName} required onChange={e => setDisplayName(e.target.value)} onFocus={() => setFocused('dname')} onBlur={() => setFocused(null)} placeholder="Dr. Amisha Patel" style={inputWithIconStyle('dname')} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Phone number</label>
                    <div style={{ position: 'relative' }}>
                      <span style={iconWrap}><Phone size={15} /></span>
                      <input type="tel" value={phone} required onChange={e => setPhone(e.target.value)} onFocus={() => setFocused('phone')} onBlur={() => setFocused(null)} placeholder="+91 98765 43210" style={inputWithIconStyle('phone')} />
                    </div>
                    <p style={{ color: '#52525B', fontSize: 11, marginTop: 5, fontFamily: 'IBM Plex Sans, sans-serif' }}>Include country code, e.g. +91</p>
                  </div>
                  {error && <div style={{ background: '#1A0000', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: 10 }}>{error}</div>}
                  <button type="submit" disabled={loading} style={submitBtn}>
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Sending…</> : <>Send OTP <ArrowRight size={14} /></>}
                  </button>
                </form>
              ) : (
                <form onSubmit={e => { e.preventDefault(); wrap(() => confirmOtp(otp)); }}>
                  {success && <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', borderRadius: 8, padding: '10px 14px', color: '#4ADE80', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: 14 }}>✓ {success}</div>}
                  <div style={{ marginBottom: 14 }}>
                    <label style={labelStyle}>Enter OTP</label>
                    <input type="text" inputMode="numeric" maxLength={6} value={otp} required onChange={e => setOtp(e.target.value.replace(/\D/g, ''))} onFocus={() => setFocused('otp')} onBlur={() => setFocused(null)} placeholder="6-digit code"
                      style={{ ...inputStyle('otp'), textAlign: 'center', letterSpacing: '0.4em', fontSize: 18 }} />
                  </div>
                  {error && <div style={{ background: '#1A0000', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '10px 14px', color: '#F87171', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: 10 }}>{error}</div>}
                  <button type="submit" disabled={loading} style={submitBtn}>
                    {loading ? <><Loader2 size={15} className="animate-spin" /> Verifying…</> : <>Verify & Create Account <ArrowRight size={14} /></>}
                  </button>
                  <button type="button" onClick={() => { setOtpSent(false); setOtp(''); setError(''); setSuccess(''); }}
                    style={{ width: '100%', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: '#52525B', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    ← Change phone number
                  </button>
                </form>
              )}
            </>
          )}

          <p style={{ textAlign: 'center', color: '#52525B', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', marginTop: 24 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
          <p style={{ textAlign: 'center', color: '#3F3F46', fontSize: 11, fontFamily: 'IBM Plex Sans, sans-serif', marginTop: 12, lineHeight: 1.6 }}>
            By creating an account you agree to PharmaAI's{' '}
            <span style={{ color: '#3B82F6', cursor: 'pointer' }}>Terms of Service</span>
            {' '}and{' '}
            <span style={{ color: '#3B82F6', cursor: 'pointer' }}>Privacy Policy</span>.
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 1024px) { .left-panel { display: flex !important; flex-direction: column; } }
        @media (max-width: 1023px) { .left-panel { display: none !important; } .mobile-logo { display: flex !important; } }
      `}</style>
    </div>
  );
}
