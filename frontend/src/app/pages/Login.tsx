import { useState, useId, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Mail, Loader2, ArrowRight } from 'lucide-react';

// Google icon SVG
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

function Divider({ label = 'or continue with email' }) {
  return (
    <div className="flex items-center gap-3 my-6">
      <div className="flex-1 h-px bg-[#27272A]" />
      <span className="text-[11px] font-medium text-[#71717A] uppercase tracking-[0.8px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>{label}</span>
      <div className="flex-1 h-px bg-[#27272A]" />
    </div>
  );
}

export function Login() {
  const { loginWithGoogle, loginWithEmail, login } = useAuth();
  const navigate = useNavigate();

  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const wrap = async (fn: () => Promise<void>) => {
    setError('');
    setLoading(true);
    try {
      await fn();
      navigate('/', { replace: true });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = () => wrap(loginWithGoogle);

  const handleEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    wrap(() => loginWithEmail(email, password));
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#09090B] p-6">
      {/* Main Card - 880 × 520px */}
      <div className="w-full max-w-[880px] h-[520px] flex rounded-[20px] overflow-hidden shadow-2xl">
        
        {/* Left Panel - 380px */}
        <div className="w-[380px] bg-[#0A1628] relative overflow-hidden flex flex-col justify-between p-12">
          {/* Blue Glow Orb */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] h-[320px] rounded-full bg-[#3B82F6] opacity-[0.15] blur-[80px] pointer-events-none"></div>
          
          {/* Feature Badges */}
          <div className="relative z-10 space-y-3">
            <div className="badge-feature animate-float">
              BARCODE SCANNING
            </div>
            <div className="badge-feature animate-float" style={{ animationDelay: '0.5s' }}>
              DRUG INTERACTIONS
            </div>
            <div className="badge-feature animate-float" style={{ animationDelay: '1s' }}>
              EXPIRY ALERTS
            </div>
          </div>

          {/* Logo & Tagline */}
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-[#3B82F6] flex items-center justify-center">
                <span className="text-white text-lg">💊</span>
              </div>
              <span className="text-[#F4F4F5] text-2xl font-semibold" style={{ fontFamily: 'DM Sans, sans-serif' }}>RxAI</span>
            </div>
            <p className="text-[#A1A1AA] text-sm font-normal" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Agentic Pharmacy Intelligence</p>
          </div>
        </div>

        {/* Right Panel - 500px */}
        <div className="flex-1 bg-[#0D1117] p-14 flex flex-col justify-center">
          <div className="max-w-[400px]">
            {/* Heading */}
            <h1 className="text-[34px] font-medium text-[#F4F4F5] mb-2 tracking-[-0.5px]" style={{ fontFamily: 'DM Sans, sans-serif' }}>Welcome back</h1>
            <p className="text-[14px] font-normal text-[#A1A1AA] mb-8" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Log in to your RxAI dashboard.</p>

            {/* OAuth Row */}
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleGoogle}
                disabled={loading}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#18181B] border border-[#27272A] rounded-lg text-[#F4F4F5] text-sm font-medium hover:bg-[#1F1F23] transition-all disabled:opacity-40"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                <GoogleIcon />
                Google
              </button>
              <button
                disabled={loading}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-[#18181B] border border-[#27272A] rounded-lg text-[#F4F4F5] text-sm font-medium hover:bg-[#1F1F23] transition-all disabled:opacity-40"
                style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}
              >
                <span className="text-lg">🍎</span>
                Apple
              </button>
            </div>

            <Divider label="OR CONTINUE WITH EMAIL" />

            {/* Email Form */}
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-[12px] font-medium text-[#A1A1AA] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Email Address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="@dohwananditha3@gmail.com"
                    required
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-medium text-[#A1A1AA] mb-2 uppercase tracking-[0.3px]" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>Password</label>
                <div className="relative">
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••••"
                    required
                    className="input-field pr-11"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd(p => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#52525B] hover:text-[#A1A1AA] transition-colors"
                  >
                    {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <div className="flex justify-end mt-2">
                  <Link to="/forgot-password" className="text-[13px] font-normal text-[#3B82F6] hover:text-[#2563EB] transition-colors" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                    Forgot password?
                  </Link>
                </div>
              </div>

              {error && (
                <div className="bg-[#1A0000] border border-[#991B1B] text-[#EF4444] rounded-lg px-4 py-3 text-sm font-normal" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Processing…</>
                ) : (
                  <>Log in <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Footer */}
            <p className="text-center text-[13px] font-normal text-[#71717A] mt-6" style={{ fontFamily: 'IBM Plex Sans, sans-serif' }}>
              Don't have an account?{' '}
              <Link to="/signup" className="text-[#3B82F6] font-medium hover:text-[#2563EB] transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
