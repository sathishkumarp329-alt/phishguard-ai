import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Shield, Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectPath = searchParams.get('redirect') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) {
      newErrors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) return;

    setLoading(true);
    try {
      await login({
        email: email.trim(),
        password,
        remember_me: rememberMe,
      });
      navigate(redirectPath, { replace: true });
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { detail?: string; message?: string } } };
      const message =
        errorObj?.response?.data?.detail ||
        errorObj?.response?.data?.message ||
        'Invalid email or password. Please verify your credentials.';
      setErrors({ general: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0e27] text-gray-100 flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8">
        <div className="w-full max-w-4xl rounded-2xl bg-[#161b40] border border-[#1e2456] shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
          {/* Left Column: Brand Showcase (Desktop) */}
          <div className="hidden lg:flex lg:col-span-5 bg-gradient-to-br from-[#0d1137] to-[#12173f] p-8 flex-col justify-between border-r border-[#1e2456] relative overflow-hidden">
            {/* Background geometric accents */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-56 h-56 rounded-full bg-cyan-500/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-56 h-56 rounded-full bg-violet-600/10 blur-2xl pointer-events-none" />

            <div className="space-y-6 relative z-10">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-md">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white tracking-tight">PhishGuard AI</h2>
                  <p className="text-[10px] font-mono uppercase text-cyan-400">Threat Defense</p>
                </div>
              </div>

              <div className="space-y-2 pt-4">
                <h3 className="text-2xl font-bold text-white">Welcome Back</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  Login to your account to continue protecting yourself and your organization from emerging zero-day phishing threats.
                </p>
              </div>

              <div className="space-y-3 pt-4 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Real-time link risk forensics</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Document & batch URL scanning</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Permanent audit history tracking</span>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-[#1e2456] relative z-10">
              <p className="text-xs text-gray-500 font-mono">
                Encrypted Session &bull; TLS 1.3 Active
              </p>
            </div>
          </div>

          {/* Right Column: Form */}
          <div className="col-span-1 lg:col-span-7 p-6 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div>
                <h1 className="text-2xl font-bold text-white tracking-tight">Account Sign In</h1>
                <p className="text-sm text-gray-400 mt-1">
                  Enter your credentials to access your security portal
                </p>
              </div>

              {errors.general && (
                <div className="p-3.5 rounded-xl bg-red-950/50 border border-red-500/40 text-red-300 text-xs sm:text-sm flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{errors.general}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  error={errors.email}
                  placeholder="analyst@domain.com"
                  icon={<Mail className="w-4 h-4" />}
                  required
                />

                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                  }}
                  error={errors.password}
                  placeholder="••••••••••••"
                  icon={<Lock className="w-4 h-4" />}
                  showPasswordToggle
                  required
                />

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-gray-300">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded bg-[#0d1137] border-[#1e2456] text-cyan-500 focus:ring-cyan-500/20"
                    />
                    <span>Remember this device</span>
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                  >
                    Forgot password?
                  </Link>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={loading}
                    icon={<ArrowRight className="w-4 h-4" />}
                    iconPosition="right"
                  >
                    {loading ? 'Authenticating...' : 'Sign In'}
                  </Button>
                </div>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-[#1e2456]" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-[#161b40] text-gray-400">
                    Don't have an account yet?
                  </span>
                </div>
              </div>

              <div className="text-center">
                <Link to="/signup">
                  <Button variant="outline" size="md" fullWidth>
                    Create Free Account
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default LoginPage;
