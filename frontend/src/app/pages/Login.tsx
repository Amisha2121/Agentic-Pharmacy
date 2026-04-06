import { useState, type FormEvent } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router';
import { Eye, EyeOff, Pill, ShieldCheck, Activity } from 'lucide-react';

export function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(username, password);
    setLoading(false);
    if (ok) {
      navigate('/', { replace: true });
    } else {
      setError('Invalid username or password. Please try again.');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#f0f4f4]">
      {/* Left panel */}
      <div className="hidden lg:flex w-1/2 bg-[#1E4A4C] flex-col justify-between p-12 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-[#2B5B5C] rounded-full blur-3xl opacity-60" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-[#2B5B5C]/40 rounded-full blur-2xl" />

        {/* Logo */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-white tracking-tight">PharmaAI</span>
          </div>
          <p className="text-[#C5D3D3]/70 text-xs font-semibold uppercase tracking-widest">Smart Pharmacy System</p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-8">
          <h2 className="text-4xl font-extrabold text-white leading-snug">
            Intelligent pharmacy<br />management, powered<br />by AI.
          </h2>
          <div className="space-y-4">
            {[
              { icon: <Activity className="w-5 h-5" />, title: 'Live Inventory', desc: 'Real-time stock levels & expiry tracking' },
              { icon: <ShieldCheck className="w-5 h-5" />, title: 'Clinical AI', desc: 'FDA drug interactions & dosage guidance' },
              { icon: <Pill className="w-5 h-5" />, title: 'Smart Alerts', desc: 'Auto reorder & expired item detection' },
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

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-10">
            <div className="w-10 h-10 bg-[#1E4A4C] rounded-2xl flex items-center justify-center">
              <Pill className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-extrabold text-[#1E4A4C]">PharmaAI</span>
          </div>

          <h1 className="text-3xl font-extrabold text-[#1E4A4C] mb-2">Welcome back</h1>
          <p className="text-gray-500 font-medium mb-10">Sign in to your pharmacy dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username */}
            <div>
              <label className="block text-sm font-semibold text-[#1E4A4C] mb-2">Username</label>
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="rxai"
                required
                className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-semibold text-[#1E4A4C] mb-2">Password</label>
              <div className="relative">
                <input
                  id="login-password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full bg-white border border-gray-200 rounded-2xl px-5 py-4 pr-14 text-gray-800 placeholder:text-gray-400 font-medium focus:outline-none focus:ring-2 focus:ring-[#1E4A4C]/30 focus:border-[#1E4A4C]/50 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-[#1E4A4C] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl px-4 py-3 text-sm font-medium">
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              id="login-submit"
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#1E4A4C] to-[#2B5B5C] hover:from-[#2B5B5C] hover:to-[#1E4A4C] disabled:opacity-60 text-white font-bold py-4 rounded-2xl shadow-lg shadow-[#1E4A4C]/20 transition-all duration-300 hover:scale-[1.01] hover:shadow-xl text-base"
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Hint */}
          <div className="mt-8 bg-[#1E4A4C]/5 border border-[#1E4A4C]/10 rounded-2xl p-4 space-y-1">
            <p className="text-xs font-bold text-[#1E4A4C] uppercase tracking-wider mb-2">Credentials</p>
            <p className="text-xs text-gray-600 font-mono">username: rxai</p>
            <p className="text-xs text-gray-600 font-mono">password: pharma2026</p>
          </div>
        </div>
      </div>
    </div>
  );
}
