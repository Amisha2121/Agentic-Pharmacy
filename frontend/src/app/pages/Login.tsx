import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

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

export function Login() {
  const { loginWithGoogle, loginWithEmail } = useAuth();
  const navigate = useNavigate();

  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [focused,  setFocused]  = useState<string | null>(null);

  const wrap = async (fn: () => Promise<void>) => {
    setError(''); setLoading(true);
    try { await fn(); navigate('/', { replace: true }); }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Something went wrong.'); }
    finally { setLoading(false); }
  };

  /* ── shared input style ── */
  const inputStyle = (name: string): React.CSSProperties => ({
    width: '100%', height: 44, borderRadius: 10,
    padding: '0 14px', boxSizing: 'border-box',
    background: focused === name ? '#111318' : '#0D1117',
    border: focused === name ? '1.5px solid #3B82F6' : '1.5px solid #27272A',
    boxShadow: focused === name ? '0 0 0 3px rgba(59,130,246,0.12)' : 'none',
    color: '#F4F4F5', fontSize: 14,
    fontFamily: 'IBM Plex Sans, sans-serif',
    outline: 'none', transition: 'all 0.15s',
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', width: '100%', background: '#09090B' }}>

      {/* ── LEFT ─────────────────────────────────────────────────────── */}
      <div className="left-panel" style={{
        flex: '0 0 52%', position: 'relative', overflow: 'hidden',
        background: '#09090B',
      }}>
        {/* Blue glow orbs — editorial, not techy */}
        <div style={{
          position: 'absolute', top: '-15%', left: '-20%',
          width: '75%', height: '65%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)',
          filter: 'blur(50px)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '0%', right: '-10%',
          width: '60%', height: '55%', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)',
          filter: 'blur(60px)', pointerEvents: 'none',
        }} />

        {/* Top accent line */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
          background: 'linear-gradient(90deg, transparent, #3B82F6 50%, transparent)',
          opacity: 0.6,
        }} />

        {/* Content */}
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', height: '100%', padding: '52px 64px' }}>

          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, fontSize: 18,
              background: 'linear-gradient(135deg, #3B82F6, #6366F1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 0 16px rgba(59,130,246,0.35)',
            }}>💊</div>
            <span style={{ color: '#F4F4F5', fontSize: 18, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.3px' }}>PharmaAI</span>
          </div>

          {/* Hero text */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{
              color: '#3B82F6', fontSize: 11, fontWeight: 600,
              letterSpacing: '3px', textTransform: 'uppercase',
              fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: 24,
            }}>
              Pharmacy Intelligence
            </p>
            <h1 style={{
              color: '#F4F4F5',
              fontSize: 'clamp(34px, 3.5vw, 50px)',
              fontWeight: 700, fontFamily: 'DM Sans, sans-serif',
              lineHeight: 1.1, letterSpacing: '-1.5px', marginBottom: 24,
            }}>
              Inventory that<br />
              <em style={{ fontStyle: 'italic', color: '#60A5FA', fontWeight: 400 }}>
                thinks ahead.
              </em>
            </h1>
            <p style={{ color: '#71717A', fontSize: 15, lineHeight: 1.75, fontFamily: 'IBM Plex Sans, sans-serif', maxWidth: 340 }}>
              From scanning a barcode to catching a drug interaction — PharmaAI handles the complexity so you can focus on care.
            </p>
          </div>

          {/* Footer rule */}
          <div style={{ borderTop: '1px solid #18181B', paddingTop: 28 }}>
            <p style={{ color: '#3F3F46', fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Trusted by pharmacy teams worldwide
            </p>
          </div>
        </div>
      </div>

      {/* ── RIGHT ────────────────────────────────────────────────────── */}
      <div style={{
        flex: 1, background: '#0D1117',
        borderLeft: '1px solid #18181B',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 32px',
      }}>
        <div style={{ width: '100%', maxWidth: 380 }}>

          {/* Mobile logo */}
          <div className="mobile-logo" style={{ display: 'none', alignItems: 'center', gap: 10, marginBottom: 40 }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: 'linear-gradient(135deg, #3B82F6, #6366F1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💊</div>
            <span style={{ color: '#F4F4F5', fontSize: 17, fontWeight: 700, fontFamily: 'DM Sans, sans-serif' }}>PharmaAI</span>
          </div>

          {/* Heading */}
          <div style={{ marginBottom: 32 }}>
            <h2 style={{ color: '#F4F4F5', fontSize: 26, fontWeight: 700, fontFamily: 'DM Sans, sans-serif', letterSpacing: '-0.5px', marginBottom: 6 }}>
              Welcome back
            </h2>
            <p style={{ color: '#71717A', fontSize: 14, fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Sign in to your account
            </p>
          </div>

          {/* Google */}
          <button
            onClick={() => wrap(loginWithGoogle)}
            disabled={loading}
            style={{
              width: '100%', height: 44, display: 'flex', alignItems: 'center',
              justifyContent: 'center', gap: 10, borderRadius: 10,
              border: '1.5px solid #27272A', background: '#18181B',
              color: '#A1A1AA', fontSize: 14, fontWeight: 500,
              fontFamily: 'IBM Plex Sans, sans-serif',
              cursor: 'pointer', transition: 'all 0.15s', marginBottom: 20,
              opacity: loading ? 0.4 : 1,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1F1F23'; e.currentTarget.style.borderColor = '#3F3F46'; e.currentTarget.style.color = '#F4F4F5'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#18181B'; e.currentTarget.style.borderColor = '#27272A'; e.currentTarget.style.color = '#A1A1AA'; }}
          >
            <GoogleIcon />
            Continue with Google
          </button>

          {/* Divider */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ flex: 1, height: 1, background: '#18181B' }} />
            <span style={{ color: '#3F3F46', fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif' }}>or</span>
            <div style={{ flex: 1, height: 1, background: '#18181B' }} />
          </div>

          {/* Form */}
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); wrap(() => loginWithEmail(email, password)); }}>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', color: '#A1A1AA', fontSize: 12, fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.3px', marginBottom: 7 }}>
                Email address
              </label>
              <input
                type="email" value={email} required
                onChange={e => setEmail(e.target.value)}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused(null)}
                placeholder="you@example.com"
                style={inputStyle('email')}
              />
            </div>

            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
                <label style={{ color: '#A1A1AA', fontSize: 12, fontWeight: 500, fontFamily: 'IBM Plex Sans, sans-serif', letterSpacing: '0.3px' }}>
                  Password
                </label>
                <Link to="/forgot-password" style={{ color: '#3B82F6', fontSize: 12, fontFamily: 'IBM Plex Sans, sans-serif', textDecoration: 'none', fontWeight: 500 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPwd ? 'text' : 'password'} value={password} required
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('pwd')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••••"
                  style={{ ...inputStyle('pwd'), paddingRight: 44 }}
                />
                <button type="button" onClick={() => setShowPwd(p => !p)} style={{
                  position: 'absolute', right: 13, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#52525B', padding: 0, display: 'flex', alignItems: 'center',
                }}>
                  {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#1A0000', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', color: '#F87171',
                fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', marginBottom: 14,
              }}>
                {error}
              </div>
            )}

            <button
              type="submit" disabled={loading}
              style={{
                width: '100%', height: 44, borderRadius: 10, border: 'none',
                background: loading
                  ? 'rgba(59,130,246,0.5)'
                  : 'linear-gradient(135deg, #3B82F6, #6366F1)',
                color: '#FFFFFF', fontSize: 14, fontWeight: 600,
                fontFamily: 'IBM Plex Sans, sans-serif',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s', marginTop: 20,
                boxShadow: loading ? 'none' : '0 4px 18px rgba(99,102,241,0.35)',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.boxShadow = '0 6px 24px rgba(99,102,241,0.5)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = loading ? 'none' : '0 4px 18px rgba(99,102,241,0.35)'; }}
            >
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Signing in…</>
                : <>Sign in <ArrowRight size={15} /></>
              }
            </button>
          </form>

          <p style={{ textAlign: 'center', color: '#52525B', fontSize: 13, fontFamily: 'IBM Plex Sans, sans-serif', marginTop: 24 }}>
            Don't have an account?{' '}
            <Link to="/signup" style={{ color: '#3B82F6', fontWeight: 600, textDecoration: 'none' }}>
              Create one
            </Link>
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
