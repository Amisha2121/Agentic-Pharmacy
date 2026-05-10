import { useState, useEffect, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function Login() {
  const { loginWithGoogle, loginWithEmail, user, isLoading } = useAuth();
  const navigate = useNavigate();

  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (!isLoading && user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, isLoading, navigate]);

  const wrap = async (fn: () => Promise<void>) => {
    setError('');
    setLoading(true);
    try {
      await fn();
      navigate('/dashboard', { replace: true });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Show nothing while checking auth state
  if (isLoading) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4 sm:p-8">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 sm:gap-3 mb-8 sm:mb-12">
          <span
            className="text-[#0F172A] text-[18px] sm:text-[24px] font-black uppercase tracking-tight text-center"
            style={{ fontFamily: 'Inter, sans-serif', letterSpacing: '-0.5px' }}
          >
            AGENTIC PHARMACY
          </span>
        </div>

        {/* Card */}
        <div className="bg-white border-2 border-[#0F172A] rounded-xl p-6 sm:p-8">
          {/* Heading */}
          <div className="mb-6 sm:mb-8">
            <h1
              className="text-[24px] sm:text-[28px] font-black uppercase text-[#0F172A] tracking-tight mb-2"
              style={{ fontFamily: 'Inter, sans-serif', fontWeight: 900, letterSpacing: '-0.02em' }}
            >
              WELCOME BACK
            </h1>
            <p className="text-[13px] sm:text-[14px] text-[#64748B] font-medium">
              Sign in to your account
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
            CONTINUE WITH GOOGLE
          </button>

          {/* Divider */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-[2px] bg-[#E2E8F0]" />
            <span className="text-[11px] font-black uppercase tracking-wider text-[#94A3B8]">OR</span>
            <div className="flex-1 h-[2px] bg-[#E2E8F0]" />
          </div>

          {/* Form */}
          <form onSubmit={(e: FormEvent) => { e.preventDefault(); wrap(() => loginWithEmail(email, password)); }}>
            {/* Email */}
            <div className="mb-5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-[#64748B] mb-2">
                EMAIL ADDRESS
              </label>
              <input
                type="email"
                value={email}
                required
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-12 px-4 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] font-medium placeholder:text-[#94A3B8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DCFCE7] transition-all"
              />
            </div>

            {/* Password */}
            <div className="mb-2">
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-[#64748B]">
                  PASSWORD
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] font-bold text-[#16a34a] hover:text-[#15803d] uppercase tracking-wide transition-colors"
                >
                  FORGOT?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  required
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full h-12 px-4 pr-12 bg-[#F8FAFC] border-2 border-[#E2E8F0] rounded-xl text-[#0F172A] text-[14px] font-medium placeholder:text-[#94A3B8] focus:border-[#16a34a] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#DCFCE7] transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd((p) => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-[#64748B] hover:text-[#0F172A] transition-colors"
                >
                  {showPwd ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="mb-5 p-4 bg-[#FEE2E2] border-2 border-[#EF4444] rounded-xl">
                <p className="text-[13px] font-bold text-[#DC2626]">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-12 flex items-center justify-center gap-2 bg-[#16a34a] hover:bg-[#15803d] text-white font-black text-[13px] uppercase tracking-wide transition-all mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderRadius: '999px' }}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" strokeWidth={3} />
                  SIGNING IN...
                </>
              ) : (
                <>
                  SIGN IN
                  <ArrowRight className="w-4 h-4" strokeWidth={3} />
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="text-center text-[13px] text-[#64748B] font-medium mt-6">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#16a34a] font-bold hover:text-[#15803d] transition-colors">
              Create one
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
